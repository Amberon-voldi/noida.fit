import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BookedTicket } from "../../components/participation/TicketConfirmation";

// The real confirmation with a synthetic ticket. Does not contact Appwrite.
let script: string, stylesheet: string;
test.beforeAll(async () => {
  const output = await build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
    import { TicketConfirmation } from './components/participation/TicketConfirmation';
    const router = { push(){}, prefetch(){}, back(){}, forward(){}, refresh(){}, replace(){} };
    window.renderTicket = ticket => createRoot(document.getElementById('fixture')).render(React.createElement(AppRouterContext.Provider, { value: router }, React.createElement(TicketConfirmation, { ticket })));
  ` }, bundle: true, write: false, outfile: "ticket-fixture.js", platform: "browser", format: "iife", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' } });
  script = output.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = (await postcss([tailwindcss()]).process(readFileSync("app/globals.css", "utf8"), { from: join(process.cwd(), "app/globals.css") })).css;
});

const reserved: BookedTicket = {
  eventId: "bcc", eventSlug: "bcc-run-rave", title: "BCC Run & Rave", date: "2026-11-22", dateLabel: "Sun, 22 Nov", startTime: "06:00 AM", endTime: "09:00 AM",
  venueName: "Sector 18 Park", sector: "Sector 18", category: "running", seatNumber: 3, kind: "reserved", priceLabel: "₹99", whatsapp: "9876543210",
  holder: "Asha Rao", countdown: "See you on Sunday at 06:00 AM",
};

test("a spot booked to pay on WhatsApp says, up front, that the payment link is coming there", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/*", route => route.request().isNavigationRequest() ? route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><main id="fixture"></main>` }) : route.abort());
  await page.goto("https://fixture.invalid/event/bcc-run-rave");
  await page.addScriptTag({ content: script });
  await page.evaluate(ticket => (window as unknown as { renderTicket: (ticket: BookedTicket) => void }).renderTicket(ticket), reserved);
  const dialog = page.getByRole("dialog", { name: "Spot confirmed!" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Payment link coming on WhatsApp", { exact: true })).toBeVisible();
  await expect(dialog.getByText("We’ll send your ₹99 payment link to 98XXXXXXX. Keep an eye on your chats.")).toBeVisible();
  // It comes right after the headline, before the ticket.
  const order = await dialog.evaluate(element => [".ticket-headline", ".ticket-whatsapp", ".ticket"].map(selector => element.querySelector(selector)!.getBoundingClientRect().top));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/spot-confirmed.png` });
});

test("a paid ticket's confirmation has no WhatsApp callout", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/*", route => route.request().isNavigationRequest() ? route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><main id="fixture"></main>` }) : route.abort());
  await page.goto("https://fixture.invalid/event/bcc-run-rave");
  await page.addScriptTag({ content: script });
  await page.evaluate(ticket => (window as unknown as { renderTicket: (ticket: BookedTicket) => void }).renderTicket(ticket), { ...reserved, kind: "paid", whatsapp: undefined } satisfies BookedTicket);
  await expect(page.getByRole("dialog", { name: "You’re in!" })).toBeVisible();
  await expect(page.getByText("Payment link coming on WhatsApp")).toHaveCount(0);
});
