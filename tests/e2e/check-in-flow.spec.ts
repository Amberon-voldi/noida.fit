import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Real presentation and requests, synthetic already-authorized fixtures; not hosted auth/physical-camera evidence.
let script: string, stylesheet: string;
const token = `synthetic_participant_payload.${"A".repeat(43)}`;
test.beforeAll(async () => {
  const output = await build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
    import { CheckInForm } from './components/participation/CheckInForm';
    import { OrganizerCheckInForm } from './components/participation/OrganizerCheckInForm';
    const root=createRoot(document.getElementById('fixture'));
    const router={push(){},replace(){},prefetch(){},back(){},forward(){},refresh(){window.refreshCount=(window.refreshCount||0)+1}};
    window.renderCheckIn=(operator,props)=>root.render(React.createElement(AppRouterContext.Provider,{value:router},React.createElement(operator?OrganizerCheckInForm:CheckInForm,props)));
  ` }, bundle: true, write: false, outfile: "check-in-fixture.js", platform: "browser", format: "iife", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' } });
  script = output.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = (await postcss([tailwindcss()]).process(readFileSync("app/globals.css", "utf8"), { from: join(process.cwd(), "app/globals.css") })).css + "body{padding:16px} #fixture{max-width:640px;margin:auto;min-width:0}";
});
const event = { id: "event-two", title: "Synthetic second session", checkInWindow: "open" };
async function paste(page: import("@playwright/test").Page, value: string) {
  const field = page.getByLabel("Participant check-in code", { exact: true });
  if (!await field.isVisible()) await page.getByText("Camera not working? Paste the code").click();
  await field.fill(value);
  await page.getByRole("button", { name: "Check in participant", exact: true }).click();
}
async function mount(page: import("@playwright/test").Page, operator: boolean, props: unknown) {
  await page.route("**/*", route => route.request().isNavigationRequest() ? route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><main id="fixture"></main>` }) : route.abort());
  await page.goto("https://fixture.invalid/check-in"); await page.addScriptTag({ content: script });
  await page.evaluate(({ operator, props }) => (window as unknown as { renderCheckIn: (operator: boolean, props: unknown) => void }).renderCheckIn(operator, props), { operator, props });
}
for (const width of [320, 390, 768, 1440]) {
  test(`participant shows QR without a camera and operator records it at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(page, false, { initialPass: { token, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() }, displayName: "Synthetic private member", fitnessId: "NF-0123456789ABCDEF" });
    await expect(page.getByRole("img", { name: "Your participant check-in QR code" })).toBeVisible();
    await expect(page.locator("video")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /scanner|camera/i })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(event => (window as unknown as { renderCheckIn: (operator: boolean, props: unknown) => void }).renderCheckIn(true, { event }), event);
    const writes: Record<string, unknown>[] = [];
    await page.route("**/api/check-in/organizer", async route => {
      writes.push(route.request().postDataJSON());
      await route.fulfill({ json: { checkedIn: true, displayName: "Synthetic private member", checkedInAt: "2026-09-30T01:00:00Z", alreadyCheckedIn: writes.length > 1 } });
    });
    await paste(page, "https://noida.fit/@synthetic-member");
    await expect(page.locator("[data-outcome=error]")).toContainText("not their public-profile QR");
    expect(writes).toHaveLength(0);
    await paste(page, `NF-CHECKIN:${token}`);
    await expect(page.locator("[data-outcome=checked-in]")).toContainText("Synthetic private member");
    expect(writes[0]).toEqual({ eventId: "event-two", token });
    await paste(page, token);
    await expect(page.locator("[data-outcome=already]")).toContainText("Already checked in");
    await expect(page.getByRole("region", { name: "Recent scans" }).or(page.getByLabel("Recent scans"))).toContainText("Checked in");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("expired participant QR is hidden, and refresh can never select somebody else’s identity", async ({ page }) => {
  await mount(page, false, { initialPass: { token, expiresAt: "2020-01-01T00:00:00Z" }, displayName: "Synthetic member", fitnessId: "NF-0123456789ABCDEF" });
  await expect(page.getByRole("img", { name: "Your participant check-in QR code" })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("expired");
  let body: unknown;
  await page.route("**/api/check-in/pass", route => { body = route.request().postDataJSON(); return route.fulfill({ json: { token, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() } }); });
  await page.getByRole("button", { name: "Refresh my check-in QR" }).click();
  await expect(page.getByRole("img", { name: "Your participant check-in QR code" })).toBeVisible();
  expect(body).toEqual({});
});

test("operator denied by the server gets no attendance success or false refresh", async ({ page }) => {
  await mount(page, true, { event });
  await page.route("**/api/check-in/organizer", route => route.fulfill({ status: 403, json: { code: "ORGANIZER_REQUIRED", error: "Only this event’s assigned operator can check in participants" } }));
  await paste(page, token);
  await expect(page.locator("[data-outcome=error]")).toContainText("assigned operator");
  await expect(page.locator("[data-outcome=checked-in]")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { refreshCount?: number }).refreshCount ?? 0)).toBe(0);
});

test("a participant without an RSVP is named and flagged as not on the list", async ({ page }) => {
  await mount(page, true, { event });
  await page.route("**/api/check-in/organizer", route => route.fulfill({ status: 403, json: { code: "RSVP_REQUIRED", error: "Synthetic walk-in is not on the RSVP list for this event" } }));
  await paste(page, token);
  await expect(page.locator("[data-outcome=not-on-list]")).toContainText("Not on the RSVP list");
  await expect(page.locator("[data-outcome=not-on-list]")).toContainText("Synthetic walk-in");
  expect(await page.evaluate(() => (window as unknown as { refreshCount?: number }).refreshCount ?? 0)).toBe(0);
});

test("a closed window is explained before anyone is scanned", async ({ page }) => {
  await mount(page, true, { event: { ...event, checkInWindow: "not-open" } });
  await expect(page.getByRole("note")).toContainText("Check-in opens 30 minutes before the start");
});

test("guest participant page and all check-in APIs stay protected", async ({ page, request }) => {
  await page.goto("/check-in");
  await expect(page).toHaveURL(/\/login\?callbackUrl=(?:%2F|\/)check-in$/);
  for (const path of ["/api/check-in", "/api/check-in/pass", "/api/check-in/organizer"]) {
    const response = await request.post(path, { data: {} });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  }
});

test("operator scanner goes full screen and shows each guest over the camera", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(qr => {
    // Synthetic camera (a canvas stream) and a detector that reads this guest's QR.
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => {
      const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480;
      const context = canvas.getContext("2d")!; context.fillStyle = "#34404a"; context.fillRect(0, 0, 640, 480);
      return canvas.captureStream(5);
    } } });
    Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: class {
      static async getSupportedFormats() { return ["qr_code"]; }
      async detect() { return (window as unknown as { showQr?: boolean }).showQr ? [{ rawValue: qr }] : []; }
    } });
  }, `NF-CHECKIN:${token}`);
  await mount(page, true, { event: { ...event, checkedIn: 12, confirmedRsvps: 40 } });
  await page.route("**/api/check-in/organizer", route => route.fulfill({ json: { checkedIn: true, displayName: "Synthetic desk guest", checkedInAt: new Date().toISOString() } }));

  await page.getByRole("button", { name: "Start scanner" }).click();
  const scanner = page.getByRole("dialog", { name: "Check-in scanner for Synthetic second session" });
  await expect(scanner).toBeVisible();
  await expect(scanner).toHaveCSS("position", "fixed");
  expect(await scanner.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  await expect(scanner.getByText("12 of 40 checked in")).toBeVisible();
  await expect(scanner.getByLabel("Participant QR camera preview")).toBeVisible();

  await page.evaluate(() => { (window as unknown as { showQr: boolean }).showQr = true; });
  await expect(scanner.locator("[data-outcome=checked-in]")).toContainText("Synthetic desk guest");
  await expect(page.locator("[data-outcome]")).toHaveCount(1);

  await scanner.getByRole("button", { name: "Stop camera" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-outcome=checked-in]")).toContainText("Synthetic desk guest");
  await expect(page.getByRole("button", { name: "Start scanner" })).toBeVisible();
});
