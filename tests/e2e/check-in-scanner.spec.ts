import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

// Real scanner + real QR pixels + synthetic canvas MediaStreams. Every request
// is fulfilled locally or blocked; no camera hardware, account or API is used.
// Match the real signed participant payload length and 240px QR, not an unrealistically tiny code.
const token = `NF-CHECKIN:${Buffer.from(JSON.stringify({ v: 1, purpose: "participant-checkin", fitnessId: "NF-0123456789ABCDEF", iat: 1790726400000, exp: 1790727300000 })).toString("base64url")}.${"A".repeat(43)}`;
let assets: Map<string, string>;
let stylesheet: string;
let decoderAsset: string;
type Permission = "granted" | "pending" | "denied" | "no-camera" | "busy";
type Native = "absent" | "available" | "unsupported" | "broken" | "constructor-error" | "pending";
type Options = { permission?: Permission; native?: Native; playback?: "normal" | "rejected" | "pending"; disabled?: boolean };
interface Snapshot {
  constraints: MediaStreamConstraints[];
  tracks: { request: number; state: string; stops: number }[];
  callbacks: { token: string; version: number; allTracksStopped: boolean }[];
  detections: number[];
  maxInFlight: number;
  attached: boolean;
  paused: boolean;
  plays: number;
}
interface Fixture {
  snapshot(): Snapshot;
  showQR(): void;
  setPermission(value: Permission): void;
  resolvePermission(index: number): void;
  resolveDetection(): void;
  setPlayback(value: "normal" | "rejected" | "pending"): void;
  resolvePlayback(): void;
  endCamera(): void;
  render(disabled: boolean, version?: number): void;
  unmount(): void;
}

test.beforeAll(async () => {
  // Compile current CSS instead of depending on stale .next output.
  stylesheet = (await postcss([tailwindcss()]).process(readFileSync("app/globals.css", "utf8"), { from: join(process.cwd(), "app/globals.css") })).css;
  const bundle = await build({
    stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { QRCodeCanvas } from 'qrcode.react';
      import { CheckInScanner } from './components/participation/CheckInScanner';
      const root = createRoot(document.getElementById('fixture'));
      createRoot(document.getElementById('qr')).render(React.createElement(QRCodeCanvas, {
        value: ${JSON.stringify(token)}, size: 240, marginSize: 4, level: 'M'
      }));
      const options = window.scannerOptions;
      let permission = options.permission || 'granted';
      let playback = options.playback || 'normal';
      let qrVisible = false, plays = 0, inFlight = 0, maxInFlight = 0;
      const constraints = [], tracks = [], callbacks = [], detections = [], pendingPermissions = [];
      let resolveDetection, resolvePlayback;
      const draw = canvas => {
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
        if (qrVisible) context.drawImage(document.querySelector('#qr canvas'), 200, 120, 240, 240);
      };
      const makeStream = request => {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        draw(canvas);
        const stream = canvas.captureStream(12);
        const interval = setInterval(() => draw(canvas), 80);
        const track = stream.getVideoTracks()[0];
        const entry = {request, track, stops: 0}; tracks.push(entry);
        const stop = track.stop.bind(track);
        track.stop = () => { entry.stops++; clearInterval(interval); stop(); };
        return stream;
      };
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
        getUserMedia: async input => {
          const request = constraints.push(input) - 1;
          if (permission === 'denied') throw new DOMException('Synthetic permission denial', 'NotAllowedError');
          if (permission === 'no-camera') throw new DOMException('Synthetic missing camera', 'NotFoundError');
          if (permission === 'busy') throw new DOMException('Synthetic busy camera', 'NotReadableError');
          if (permission === 'pending') return new Promise(resolve => { pendingPermissions[request] = () => resolve(makeStream(request)); });
          return makeStream(request);
        }
      }});
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        plays++;
        if (playback === 'rejected') return Promise.reject(new DOMException('Synthetic playback failure', 'NotAllowedError'));
        if (playback === 'pending') return new Promise(resolve => { resolvePlayback = resolve; });
        return play.call(this);
      };
      const native = options.native || 'absent';
      Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: native === 'absent' ? undefined : class {
        static async getSupportedFormats() { return native === 'unsupported' ? ['ean_13'] : ['qr_code']; }
        constructor() { if (native === 'constructor-error') throw new Error('Synthetic detector construction failure'); }
        async detect() {
          detections.push(performance.now()); inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
          try {
            if (native === 'broken') throw new Error('Synthetic native detection failure');
            if (native === 'pending') return await new Promise(resolve => { resolveDetection = () => resolve([{rawValue: ${JSON.stringify(token)}}]); });
            await new Promise(resolve => setTimeout(resolve, 60));
            return qrVisible ? [{rawValue: '  ' + ${JSON.stringify(token)} + '  '}, {rawValue: 'ignored-second-code'}] : [];
          } finally { inFlight--; }
        }
      }});
      function render(disabled = false, version = 1) {
        root.render(React.createElement(CheckInScanner, {disabled, onToken: token => callbacks.push({
          token, version, allTracksStopped: tracks.every(entry => entry.track.readyState === 'ended')
        })}));
      }
      window.scannerFixture = {
        render, unmount: () => root.unmount(), showQR: () => { qrVisible = true; },
        setPermission: value => { permission = value; },
        resolvePermission: request => pendingPermissions[request](),
        resolveDetection: () => resolveDetection(),
        setPlayback: value => { playback = value; }, resolvePlayback: () => resolvePlayback(),
        endCamera: () => tracks.at(-1).track.dispatchEvent(new Event('ended')),
        snapshot: () => ({constraints, callbacks, detections, maxInFlight, plays,
          attached: !!document.querySelector('video')?.srcObject,
          paused: document.querySelector('video')?.paused ?? true,
          tracks: tracks.map(entry => ({request: entry.request, state: entry.track.readyState, stops: entry.stops}))
        })
      };
      render(options.disabled);
    ` },
    bundle: true, write: false, outdir: "/scanner-fixture", entryNames: "scanner", chunkNames: "[name]-[hash]",
    platform: "browser", format: "esm", splitting: true, metafile: true,
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  });
  assets = new Map(bundle.outputFiles.map(file => [basename(file.path), file.text]));
  decoderAsset = basename(Object.entries(bundle.metafile.outputs).find(([, output]) => Object.keys(output.inputs).some(input => input.includes("jsqr/dist/")))![0]);
});

async function mount(page: Page, options: Options = {}, origin = "https://fixture.invalid") {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const name = basename(new URL(route.request().url()).pathname);
    if (route.request().isNavigationRequest()) return route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${stylesheet}</style></head><body><main style="padding:16px;max-width:544px;margin:auto"><div id="fixture"></div><div id="qr" hidden></div></main></body></html>` });
    requests.push(name);
    if (assets.has(name)) return route.fulfill({ contentType: "text/javascript", body: assets.get(name) });
    return route.abort();
  });
  await page.goto(`${origin}/scanner`);
  await page.evaluate(options => { (window as unknown as { scannerOptions: Options }).scannerOptions = options; }, options);
  await page.addScriptTag({ type: "module", url: `${origin}/scanner.js` });
  await expect(page.getByRole("button", { name: "Start scanner" })).toBeVisible();
  await expect(page.locator("#qr canvas")).toHaveCount(1);
  return { requests, errors };
}
function snapshot(page: Page) {
  return page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.snapshot());
}
async function expectStopped(page: Page, count = 1) {
  await expect.poll(async () => (await snapshot(page)).tracks).toHaveLength(count);
  const state = await snapshot(page);
  expect(state.tracks.every(track => track.state === "ended" && track.stops === 1)).toBe(true);
  expect(state.attached).toBe(false);
  expect(state.paused).toBe(true);
}
async function showQR(page: Page) {
  await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.showQR());
}
async function start(page: Page) {
  await page.getByRole("button", { name: "Start scanner" }).click();
}
async function ready(page: Page) {
  await expect(page.getByRole("status")).toContainText("Scanner ready");
  await expect(page.getByLabel("Participant QR camera preview")).toBeVisible();
  await expect.poll(() => page.locator("video").evaluate(video => (video as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
}

test("without BarcodeDetector, lazily decode real QR camera pixels once, with keyboard and 320px controls", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const { requests, errors } = await mount(page);
  expect(requests).not.toContain(decoderAsset);
  expect((await snapshot(page)).constraints).toEqual([]);
  const control = page.getByRole("button", { name: "Start scanner" });
  const box = await control.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await control.focus();
  expect(await control.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Space");
  await ready(page);
  expect((await snapshot(page)).constraints).toEqual([{ video: { facingMode: { ideal: "environment" } }, audio: false }]);
  expect((await snapshot(page)).plays).toBe(1);
  expect(requests.filter(name => name === decoderAsset)).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await showQR(page);
  await expect.poll(async () => (await snapshot(page)).callbacks).toEqual([{ token, version: 1, allTracksStopped: true }]);
  await expectStopped(page);
  await expect(page.getByRole("status")).toHaveText("QR captured. Camera stopped.");
  await expect(page.getByLabel("Participant QR camera preview")).toBeHidden();
  await expect(page.locator("#fixture")).not.toContainText(token);
  await page.waitForTimeout(800); // Guard against a queued duplicate frame/result.
  expect((await snapshot(page)).callbacks).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("native detection is throttled, single-flight, uses the latest callback, and releases before delivery", async ({ page }) => {
  const { requests, errors } = await mount(page, { native: "available" });
  await start(page); await ready(page);
  await expect.poll(async () => (await snapshot(page)).detections.length).toBeGreaterThanOrEqual(3);
  await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.render(false, 2));
  await showQR(page);
  await expect.poll(async () => (await snapshot(page)).callbacks).toEqual([{ token, version: 2, allTracksStopped: true }]);
  await expectStopped(page);
  const { detections, maxInFlight } = await snapshot(page);
  expect(maxInFlight).toBe(1);
  expect(detections.slice(1).every((time, index) => time - detections[index] >= 240)).toBe(true);
  expect(requests).not.toContain(decoderAsset);
  await page.waitForTimeout(650);
  expect((await snapshot(page)).detections).toEqual(detections);
  expect((await snapshot(page)).callbacks).toHaveLength(1);
  expect(errors).toEqual([]);
});

for (const native of ["unsupported", "broken", "constructor-error"] as const) {
  test(`native ${native} QR support still falls back to decoding real camera pixels`, async ({ page }) => {
    const { requests, errors } = await mount(page, { native });
    await start(page); await ready(page); await showQR(page);
    await expect.poll(async () => (await snapshot(page)).callbacks).toHaveLength(1);
    expect((await snapshot(page)).callbacks[0]).toEqual({ token, version: 1, allTracksStopped: true });
    await expectStopped(page);
    expect(requests).toContain(decoderAsset);
    expect(errors).toEqual([]);
  });
}

for (const [permission, message] of [["denied", "Camera permission was denied"], ["no-camera", "No camera was found"], ["busy", "camera is busy"]] as const) {
  test(`${permission} camera errors explain recovery and allow a clean retry`, async ({ page }) => {
    const { requests, errors } = await mount(page, { permission });
    await start(page);
    await expect(page.getByRole("status")).toContainText(message);
    await expect(page.getByRole("button", { name: "Start scanner" })).toBeEnabled();
    expect((await snapshot(page)).tracks).toEqual([]);
    expect((await snapshot(page)).attached).toBe(false);
    expect(requests).not.toContain(decoderAsset);
    await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.setPermission("granted"));
    await start(page); await ready(page);
    await page.getByRole("button", { name: "Stop camera" }).press("Enter");
    await expectStopped(page);
    expect((await snapshot(page)).callbacks).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("insecure origins fail clearly before requesting camera permission", async ({ page }) => {
  await mount(page, {}, "http://fixture.invalid");
  await start(page);
  await expect(page.getByRole("status")).toContainText("HTTPS or localhost");
  expect((await snapshot(page)).constraints).toEqual([]);
});

test("HTTP localhost can request the camera and decode without BarcodeDetector", async ({ page }) => {
  await mount(page, {}, "http://localhost");
  await start(page); await ready(page); await showQR(page);
  await expect.poll(async () => (await snapshot(page)).callbacks).toEqual([{ token, version: 1, allTracksStopped: true }]);
  await expectStopped(page);
});

test("a decoder download failure stops the camera and explains recovery", async ({ page }) => {
  await mount(page);
  await page.route(`**/${decoderAsset}`, route => route.abort());
  await start(page);
  await expect(page.getByRole("status")).toContainText("QR scanning could not load");
  await expectStopped(page);
  expect((await snapshot(page)).callbacks).toEqual([]);
});

test("a lazy decoder arriving after stop cannot revive the camera", async ({ page }) => {
  await mount(page);
  let releaseDownload: () => void = () => {};
  const download = new Promise<void>(resolve => { releaseDownload = resolve; });
  let requested = false;
  await page.route(`**/${decoderAsset}`, async route => {
    requested = true;
    await download;
    await route.fulfill({ contentType: "text/javascript", body: assets.get(decoderAsset) });
  });
  await start(page);
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "Stop camera" }).click();
  releaseDownload();
  await expectStopped(page);
  await page.waitForTimeout(600);
  await expect(page.getByRole("status")).toContainText("Camera stopped");
  expect((await snapshot(page)).callbacks).toEqual([]);
});

test("a browser without getUserMedia gets an actionable camera-support message", async ({ page }) => {
  await mount(page);
  await page.evaluate(() => Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined }));
  await start(page);
  await expect(page.getByRole("status")).toContainText("browser with camera support");
  expect((await snapshot(page)).constraints).toEqual([]);
});

test("stopping a pending permission request discards its late stream without disturbing a retry", async ({ page }) => {
  await mount(page, { permission: "pending" });
  await start(page);
  await expect(page.getByRole("status")).toContainText("Waiting for camera permission");
  await page.getByRole("button", { name: "Stop camera" }).click();
  await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.setPermission("granted"));
  await start(page); await ready(page);
  await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.resolvePermission(0));
  await expect.poll(async () => (await snapshot(page)).tracks.find(track => track.request === 0)?.state).toBe("ended");
  expect((await snapshot(page)).tracks.find(track => track.request === 1)?.state).toBe("live");
  expect((await snapshot(page)).plays).toBe(1);
  await showQR(page);
  await expect.poll(async () => (await snapshot(page)).callbacks).toHaveLength(1);
  await expectStopped(page, 2);
});

for (const permission of ["granted", "pending"] as const) {
  test(`unmount releases an ${permission === "granted" ? "active" : "eventually granted"} camera stream`, async ({ page }) => {
    const { errors } = await mount(page, { permission });
    await start(page);
    if (permission === "granted") await ready(page);
    await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.unmount());
    if (permission === "pending") await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.resolvePermission(0));
    await expectStopped(page);
    await page.waitForTimeout(600);
    expect((await snapshot(page)).callbacks).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("a native result arriving after stop cannot call onToken or restart detection", async ({ page }) => {
  await mount(page, { native: "pending" });
  await start(page); await ready(page);
  await expect.poll(async () => (await snapshot(page)).detections.length).toBe(1);
  await page.getByRole("button", { name: "Stop camera" }).click();
  await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.resolveDetection());
  await expectStopped(page);
  await page.waitForTimeout(650);
  expect((await snapshot(page)).callbacks).toEqual([]);
  expect((await snapshot(page)).detections).toHaveLength(1);
});

test("playback failure releases the stream and allows retry", async ({ page }) => {
  await mount(page, { playback: "rejected" });
  await start(page);
  await expect(page.getByRole("status")).toContainText("preview could not play");
  await expectStopped(page);
  await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.setPlayback("normal"));
  await start(page); await ready(page);
  await page.getByRole("button", { name: "Stop camera" }).click();
  await expectStopped(page, 2);
});

test("stopping during playback cannot revive the session when play resolves", async ({ page }) => {
  const { requests } = await mount(page, { playback: "pending" });
  await start(page);
  await expect.poll(async () => (await snapshot(page)).plays).toBe(1);
  await page.getByRole("button", { name: "Stop camera" }).click();
  await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.resolvePlayback());
  await expectStopped(page);
  await expect(page.getByRole("status")).toContainText("Camera stopped");
  expect(requests).not.toContain(decoderAsset);
  expect((await snapshot(page)).callbacks).toEqual([]);
});

for (const permission of ["granted", "pending"] as const) {
  test(`parent disabled state stops ${permission} scanning and permits a fresh start when enabled`, async ({ page }) => {
    await mount(page, { permission });
    await start(page);
    if (permission === "granted") await ready(page);
    await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.render(true));
    await expect(page.getByRole("button", { name: "Start scanner" })).toBeDisabled();
    await expect(page.getByRole("status")).toContainText("Scanner paused");
    if (permission === "pending") await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.resolvePermission(0));
    await expectStopped(page);
    await page.evaluate(() => {
      const fixture = (window as unknown as { scannerFixture: Fixture }).scannerFixture;
      fixture.setPermission("granted"); fixture.render(false);
    });
    await start(page); await ready(page);
    await page.getByRole("button", { name: "Stop camera" }).click();
    await expectStopped(page, 2);
    expect((await snapshot(page)).callbacks).toEqual([]);
  });
}

test("camera disconnect and pagehide both stop resources", async ({ page }) => {
  await mount(page);
  await start(page); await ready(page);
  await page.evaluate(() => (window as unknown as { scannerFixture: Fixture }).scannerFixture.endCamera());
  await expect(page.getByRole("status")).toContainText("camera disconnected");
  await expectStopped(page);
  await start(page); await ready(page);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expectStopped(page, 2);
  expect((await snapshot(page)).callbacks).toEqual([]);
});
