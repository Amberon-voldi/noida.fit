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
const events = [{ id: "event-one", title: "Synthetic morning session", venueName: "Synthetic club", sector: "Sector 1", checkInWindow: "open" }, { id: "event-two", title: "Synthetic second session", venueName: "Synthetic venue", sector: "Sector 2", checkInWindow: "open" }];
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
    await page.evaluate(events => (window as unknown as { renderCheckIn: (operator: boolean, props: unknown) => void }).renderCheckIn(true, { events }), events);
    const writes: Record<string, unknown>[] = [];
    await page.route("**/api/check-in/organizer", async route => {
      writes.push(route.request().postDataJSON());
      await route.fulfill({ json: { checkedIn: true, displayName: "Synthetic private member", checkedInAt: "2026-09-30T01:00:00Z", alreadyCheckedIn: writes.length > 1 } });
    });
    await page.getByLabel("Event at this attendance desk").selectOption("event-two");
    await page.getByLabel("Participant check-in code (camera fallback)").fill("https://noida.fit/@synthetic-member");
    await page.getByRole("button", { name: "Check in participant", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("not their public-profile QR");
    expect(writes).toHaveLength(0);
    await page.getByLabel("Participant check-in code (camera fallback)").fill(`NF-CHECKIN:${token}`);
    await page.getByRole("button", { name: "Check in participant", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Attendance and passport are recorded" })).toBeVisible();
    expect(writes[0]).toEqual({ eventId: "event-two", token });
    await page.getByLabel("Participant check-in code (camera fallback)").fill(token);
    await page.getByRole("button", { name: "Check in participant", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "already checked in" })).toBeVisible();
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
  await mount(page, true, { events });
  await page.route("**/api/check-in/organizer", route => route.fulfill({ status: 403, json: { code: "ORGANIZER_REQUIRED", error: "Only this event’s assigned operator can check in participants" } }));
  await page.getByLabel("Participant check-in code (camera fallback)").fill(token);
  await page.getByRole("button", { name: "Check in participant", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("assigned operator");
  await expect(page.getByText("Attendance and passport are recorded", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { refreshCount?: number }).refreshCount ?? 0)).toBe(0);
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
