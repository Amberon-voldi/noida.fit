import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { OrganizerAttendee, OrganizerEventSummary } from "../../types/organizer";

// The real guest list with synthetic guests and a synthetic API. Does not contact Appwrite.
let script: string, stylesheet: string;
test.beforeAll(async () => {
  const output = await build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
    import { EventDashboard } from './components/organizer/EventDashboard';
    const router = { push(){}, prefetch(){}, back(){}, forward(){}, refresh(){}, replace(){} };
    window.renderDashboard = summary => createRoot(document.getElementById('fixture')).render(React.createElement(AppRouterContext.Provider, { value: router }, React.createElement(EventDashboard, { summary, giftLinks: null, guestPasses: false, initialTab: 'guests' })));
  ` }, bundle: true, write: false, outfile: "dashboard-fixture.js", platform: "browser", format: "iife", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' } });
  script = output.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = (await postcss([tailwindcss()]).process(readFileSync("app/globals.css", "utf8"), { from: join(process.cwd(), "app/globals.css") })).css;
});

const guest = (displayName: string, seatNumber: number, ticket: OrganizerAttendee["ticket"], whatsapp?: string): OrganizerAttendee =>
  ({ displayName, rsvpStatus: "confirmed", seatNumber, ticket, ...(whatsapp ? { whatsapp } : {}), checkInStatus: "not_checked_in" });
const summary = {
  event: { id: "bcc", slug: "bcc-run-rave", title: "BCC Run & Rave", date: "2026-11-22", startTime: "06:30 AM", endTime: "10:00 AM", venueName: "Black Coffee Cafe", sector: "Greater Noida", price: "₹99", status: "published", communitySlug: "aawaara-miles" },
  confirmedRsvps: 3, checkedIn: 0, capacityRemaining: 47, checkInWindow: "not-open", revenue: 19800, payingNow: 0, giftsClaimed: 0,
  attendees: [
    guest("Asha Rao", 1, { amount: 9900, paid: false }, "9876543210"),
    guest("Ravi Kumar", 2, { amount: 9900, paid: true }, "9123456780"),
    guest("Meera Singh", 3, { amount: 9900, paid: true, online: true }),
  ],
} as unknown as OrganizerEventSummary;

test("organizers mark a guest's ticket paid or still due from the guest list; PayU payments aren't theirs to change", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route("**/*", route => route.request().isNavigationRequest() ? route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><main id="fixture"></main>` }) : route.abort());
  await page.goto("https://fixture.invalid/organizer/events/bcc?tab=guests");
  await page.addScriptTag({ content: script });
  await page.evaluate(summary => (window as unknown as { renderDashboard: (summary: OrganizerEventSummary) => void }).renderDashboard(summary), summary);
  const bodies: unknown[] = [];
  let fail = false;
  await page.route("**/api/organizer/events/bcc/payments", async route => {
    const body = route.request().postDataJSON() as { seatNumber: number; paid: boolean };
    bodies.push(body);
    await route.fulfill(fail ? { status: 403, json: { error: "Only this session’s organizers or an administrator can update its payments" } } : { json: body });
  });

  const asha = page.getByRole("listitem").filter({ hasText: "Asha Rao" });
  const ravi = page.getByRole("listitem").filter({ hasText: "Ravi Kumar" });
  const meera = page.getByRole("listitem").filter({ hasText: "Meera Singh" });
  await expect(asha.getByRole("button", { name: "Mark Asha Rao as paid" })).toHaveAttribute("aria-pressed", "false");
  await expect(ravi.getByRole("button", { name: "Ravi Kumar has paid. Mark as still due" })).toHaveAttribute("aria-pressed", "true");
  await expect(meera.getByRole("button")).toHaveCount(0);
  await expect(page.getByText("Tap Mark paid once a guest has paid", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.SCREENSHOT_DIR) await page.getByRole("tabpanel").screenshot({ path: `${process.env.SCREENSHOT_DIR}/organizer-payments.png` });

  await asha.getByRole("button", { name: "Mark Asha Rao as paid" }).click();
  await ravi.getByRole("button", { name: "Ravi Kumar has paid. Mark as still due" }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies).toEqual([{ seatNumber: 1, paid: true }, { seatNumber: 2, paid: false }]);
  fail = true;
  await asha.getByRole("button", { name: "Mark Asha Rao as paid" }).click();
  await expect(asha.getByRole("alert")).toHaveText("Only this session’s organizers or an administrator can update its payments");
});
