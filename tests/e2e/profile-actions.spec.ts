import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Real component, synthetic public identity, and mocked browser API boundaries.
// This suite never needs Appwrite, authentication, or a running application.
let fixtureScript: string;
let stylesheet: string;
test.beforeAll(async () => {
  const cssDirectory = join(process.cwd(), ".next/static/chunks");
  const productionCss = readdirSync(cssDirectory).filter(file => file.endsWith(".css")).sort()
    .map(file => readFileSync(join(cssDirectory, file), "utf8")).join("\n");
  const result = await build({
    stdin: {
      contents: `import React from "react";
        import { createRoot } from "react-dom/client";
        import { ProfileActions } from "./components/profile/ProfileActions";
        createRoot(document.getElementById("share-fixture"))
          .render(React.createElement(ProfileActions, {handle: "synthetic-share-member", name: "Synthetic Share Member"}));`,
      loader: "tsx", resolveDir: process.cwd(),
    },
    bundle: true, write: false, outfile: "profile-actions-fixture.js", platform: "browser", format: "iife",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SITE_URL": '"https://noida.fit"' },
  });
  fixtureScript = result.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = `${productionCss}\n${result.outputFiles.find(file => file.path.endsWith(".css"))!.text}`;
});

type NativeMode = "success" | "unavailable" | "reject" | "cancel" | "cancel-object" | "pending";
type ClipboardMode = "success" | "unavailable" | "reject" | "pending";
type ApiCalls = { nativeShares: ShareData[]; clipboardWrites: string[]; resolveShare?: () => void; resolveClipboard?: () => void };
const publicUrl = "https://noida.fit/@synthetic-share-member";

async function mockApis(page: Page, native: NativeMode, clipboard: ClipboardMode) {
  await page.evaluate(({ native, clipboard }) => {
    const calls: ApiCalls = { nativeShares: [], clipboardWrites: [] };
    (window as unknown as { apiCalls: ApiCalls }).apiCalls = calls;
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: native === "unavailable" ? undefined : async (data: ShareData) => {
        calls.nativeShares.push(data);
        if (native === "cancel") throw new DOMException("Canceled", "AbortError");
        if (native === "cancel-object") throw { name: "AbortError" };
        if (native === "reject") throw new Error("Native sharing unavailable");
        if (native === "pending") await new Promise<void>(resolve => { calls.resolveShare = resolve; });
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: clipboard === "unavailable" ? undefined : {
        writeText: async (url: string) => {
          calls.clipboardWrites.push(url);
          if (clipboard === "reject") throw new DOMException("Not allowed", "NotAllowedError");
          if (clipboard === "pending") await new Promise<void>(resolve => { calls.resolveClipboard = resolve; });
        },
      },
    });
  }, { native, clipboard });
}

async function apiCalls(page: Page) {
  return page.evaluate(() => {
    const { nativeShares, clipboardWrites } = (window as unknown as { apiCalls: ApiCalls }).apiCalls;
    return { nativeShares, clipboardWrites };
  });
}

async function mountActions(page: Page, native: NativeMode, clipboard: ClipboardMode) {
  await page.setViewportSize({ width: 320, height: 900 });
  const html = `<style>${stylesheet}</style><main style="padding:16px"><div id="share-fixture"></div></main>`;
  // Use an owner-page URL, but fulfill the document locally and block all other
  // requests. The browser URL must never become the fallback share target.
  await page.route("**/*", route => route.request().isNavigationRequest()
    ? route.fulfill({ status: 200, contentType: "text/html", body: html })
    : route.abort());
  await page.goto("https://fixture.invalid/account");
  await page.evaluate(() => {
    for (const storage of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(window, storage, { configurable: true, get() { throw new Error("Browser persistence is not allowed in this fixture"); } });
    }
  });
  await mockApis(page, native, clipboard);
  await page.addScriptTag({ content: fixtureScript });
  await expect(page.getByRole("button", { name: "Share public profile" })).toBeVisible();
}

test("The single 44px share icon uses native sharing with the canonical public URL", async ({ page }) => {
  await mountActions(page, "success", "success");
  const share = page.getByRole("button", { name: "Share public profile" });
  await expect(page.getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Public profile URL" })).toHaveCount(0);
  const box = await share.boundingBox();
  expect(box?.width).toBe(44);
  expect(box?.height).toBe(44);
  await share.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Profile shared.");
  await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite");
  await expect(share).toHaveAttribute("aria-describedby", await page.getByRole("status").getAttribute("id") as string);
  await expect(share).toBeEnabled();
  expect(await apiCalls(page)).toEqual({
    nativeShares: [{ title: "Synthetic Share Member (@synthetic-share-member) — NOIDA.FIT", text: "Synthetic Share Member’s public Fitness ID on NOIDA.FIT", url: publicUrl }],
    clipboardWrites: [],
  });
});

for (const native of ["unavailable", "reject"] as const) {
  test(`Native sharing ${native} falls back to clipboard with clear success feedback`, async ({ page }) => {
    await mountActions(page, native, "success");
    const share = page.getByRole("button", { name: "Share public profile" });
    await share.click();
    await expect(page.getByRole("status")).toHaveText("Profile link copied.");
    await expect(share).toBeEnabled();
    await expect(share).toHaveAttribute("aria-busy", "false");
    expect((await apiCalls(page)).clipboardWrites).toEqual([publicUrl]);
    expect((await apiCalls(page)).nativeShares).toHaveLength(native === "reject" ? 1 : 0);
    await expect(page.getByRole("textbox", { name: "Public profile URL" })).toHaveCount(0);
  });
}

for (const native of ["cancel", "cancel-object"] as const) {
  test(`Native ${native} AbortError is silent and never copies or reveals the URL`, async ({ page }) => {
    await mountActions(page, native, "success");
    const share = page.getByRole("button", { name: "Share public profile" });
    await share.click();
    await expect(share).toBeEnabled();
    await expect(share).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("status")).toBeEmpty();
    await expect(page.getByRole("textbox", { name: "Public profile URL" })).toHaveCount(0);
    expect((await apiCalls(page)).nativeShares).toHaveLength(1);
    expect((await apiCalls(page)).clipboardWrites).toEqual([]);
    await share.click();
    expect((await apiCalls(page)).nativeShares).toHaveLength(2);
  });
}

for (const mode of ["unavailable", "reject"] as const) {
  test(`When both share methods are ${mode}, only the real selectable public URL is revealed`, async ({ page }) => {
    await mountActions(page, mode, mode);
    await expect(page.getByRole("textbox", { name: "Public profile URL" })).toHaveCount(0);
    await page.getByRole("button", { name: "Share public profile" }).click();
    await expect(page.getByRole("status")).toHaveText("Sharing is unavailable here. Select and copy your public profile link below.");
    const fallback = page.getByRole("textbox", { name: "Public profile URL" });
    await expect(fallback).toHaveValue(publicUrl);
    await expect(fallback).toHaveJSProperty("readOnly", true);
    expect(page.url()).toBe("https://fixture.invalid/account");
    await fallback.focus();
    expect(await fallback.evaluate(node => ({ start: (node as HTMLInputElement).selectionStart, end: (node as HTMLInputElement).selectionEnd }))).toEqual({ start: 0, end: publicUrl.length });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("status")).not.toContainText("browser");
    await expect(page.getByRole("button", { name: "Share public profile" })).toBeEnabled();
  });
}

test("A pending native sheet blocks repeat requests and a retry clears stale fallback feedback", async ({ page }) => {
  await mountActions(page, "reject", "reject");
  const share = page.getByRole("button", { name: "Share public profile" });
  await share.click();
  await expect(page.getByRole("textbox", { name: "Public profile URL" })).toBeVisible();
  await mockApis(page, "pending", "success");
  // Dispatch both activations in the same turn, before React's pending render.
  await share.evaluate(node => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(share).toBeDisabled();
  await expect(share).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status")).toHaveText("Opening sharing…");
  await expect(page.getByRole("textbox", { name: "Public profile URL" })).toHaveCount(0);
  expect((await apiCalls(page)).nativeShares).toHaveLength(1);
  await page.evaluate(() => (window as unknown as { apiCalls: ApiCalls }).apiCalls.resolveShare!());
  await expect(share).toBeEnabled();
  await expect(page.getByRole("status")).toHaveText("Profile shared.");
  expect((await apiCalls(page)).clipboardWrites).toEqual([]);
});

test("Pending clipboard copying is bounded to one request and restores the action", async ({ page }) => {
  await mountActions(page, "unavailable", "pending");
  const share = page.getByRole("button", { name: "Share public profile" });
  await share.click();
  await expect(share).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("Copying profile link…");
  await share.evaluate(node => node.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect((await apiCalls(page)).clipboardWrites).toEqual([publicUrl]);
  await page.evaluate(() => (window as unknown as { apiCalls: ApiCalls }).apiCalls.resolveClipboard!());
  await expect(share).toBeEnabled();
  await expect(share).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("status")).toHaveText("Profile link copied.");
});
