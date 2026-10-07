import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import type { HomeHighlights } from "../../lib/home";

// Real component + synthetic public props for boundary/long-text cases; navigation tests below use the app.
let script: string, stylesheet: string;
test.beforeAll(async () => {
  const output = await build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
    import {HomeHub} from './components/home/HomeHub';
    const root=createRoot(document.getElementById('fixture')); const router={push(){},replace(){},prefetch(){},back(){},forward(){},refresh(){}};
    window.renderHome=props=>root.render(React.createElement(AppRouterContext.Provider,{value:router},React.createElement(HomeHub,props)));
  ` }, bundle: true, write: false, platform: "browser", outfile: "home-fixture.js", format: "iife", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' } });
  script = output.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = (await postcss([tailwindcss()]).process(readFileSync("app/globals.css", "utf8"), { from: join(process.cwd(), "app/globals.css") })).css + output.outputFiles.find(file => file.path.endsWith(".css"))!.text;
});
function highlights(): HomeHighlights {
  return { activities: [{ id: "running", slug: "running", name: "Running", emoji: "↗", description: "Synthetic activity" }], events: [], communities: [{ id: "club", slug: "fixture-club", name: "Synthetic club with a very long name for an inclusive local community", category: "running", tagline: "", description: "", baseLocation: "Sector 1, Noida & Greater Noida", membersCount: 0, verified: false, featured: true, meetingDays: ["Monday", "Wednesday", "Saturday"], captains: [], socialLinks: {}, demo: true }], places: [{ id: "place", slug: "fixture-place", name: "Synthetic stadium and neighbourhood meeting point", category: "sports-complex", sector: "Sector 1", address: "", coordinates: { lat: 0, lng: 0 }, amenities: [], description: "", activeCommunitiesCount: 0, demo: true }], eventWindow: "upcoming", hasDemo: true };
}
async function mount(page: Page, props: unknown) {
  await page.route("**/*", route => route.request().isNavigationRequest() ? route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><main id="fixture"></main>` }) : route.abort());
  await page.goto("https://fixture.invalid/home"); await page.addScriptTag({ content: script });
  await page.evaluate(props => (window as unknown as { renderHome: (props: unknown) => void }).renderHome(props), props);
}
for (const width of [320, 390, 768, 1440]) {
  test(`home hub search, real-route actions and navigation work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/home"); expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome.");
    const hub = page.locator(".home-hub");
    await expect(hub.locator("aside, .hub-location, .hub-intro, .hub-account-link")).toHaveCount(0);
    await expect(hub.locator('a[href="/account"], a[href="/signup"], a[href="/check-in"], a[href="/organizer"], a[href="/fitness-id"]')).toHaveCount(0);
    for (const [label, href] of [["All events", "/events"], ["All communities", "/communities"], ["All places", "/places"]]) {
      await expect(hub.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
    }
    await expect(hub.getByText("Demo", { exact: true })).toHaveCount(0);
    for (const selector of [".hub-events article", ".hub-communities article", ".hub-places article"]) {
      expect(await hub.locator(selector).count()).toBeLessThanOrEqual(3);
    }
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/home$/);
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Quick plans" }).getByRole("link", { name: "This weekend", exact: true })).toHaveAttribute("href", "/events?date=weekend");
    await expect(page.locator(".intro-landing, .landing-hero")).toHaveCount(0);
    if (width < 1024) {
      const home = page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", { name: "Home", exact: true });
      await expect(home).toHaveAttribute("href", "/home"); await expect(home).toHaveAttribute("aria-current", "page");
    }
    for (const section of await page.locator(".hub-section").all()) {
      await section.scrollIntoViewIfNeeded(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByLabel("Search the NOIDA.FIT directory", { exact: true }).fill("running near Sector 21A");
    await page.getByRole("search").getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/discover" && url.searchParams.get("q") === "running near Sector 21A");
  });
  test(`home keeps empty/error states and long labels readable at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(page, { highlights: highlights(), memberName: "SyntheticMemberWithAnExtraLongName" });
    await page.addStyleTag({ content: "html{font-size:200%}" });
    await expect(page.getByText("No upcoming sessions listed yet.", { exact: true })).toBeVisible();
    await expect(page.locator(".hub-demo-note")).toHaveCount(1);
    await expect(page.locator(".hub-demo-note")).toContainText("illustrative");
    await expect(page.getByText("Demo", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hi, SyntheticMemberWithAnExtraLongName.");
    await expect(page.locator(".hub-communities article")).toHaveCount(1);
    await expect(page.locator(".hub-places article")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "My account", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Running", exact: false }).first()).toHaveAttribute("href", "/discover?activity=running");
    for (const selector of [".hub-header", ".hub-communities", ".hub-places", ".hub-footnote"]) {
      await page.locator(selector).scrollIntoViewIfNeeded(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.evaluate(() => (window as unknown as { renderHome: (props: unknown) => void }).renderHome({ highlights: null }));
    await expect(page.getByRole("alert")).toContainText("Directory temporarily unavailable");
    await expect(page.locator(".hub-demo-note, .hub-cards article")).toHaveCount(0);
    await expect(page.getByText("Community listings are unavailable for this request.", { exact: true })).toBeVisible();
    await expect(page.getByText("Venue listings are unavailable for this request.", { exact: true })).toBeVisible();
    await expect(page.getByText("No upcoming sessions listed yet.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Retry directory" })).toHaveAttribute("href", "/home");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const populated = highlights();
    populated.events = [{ id: "event", slug: "fixture-event", title: "Synthetic community session with a long welcoming title", category: "running", communitySlug: "fixture-club", communityName: "Synthetic club", venueSlug: "fixture-place", venueName: "Synthetic venue with a long meeting-point name", sector: "Sector 1", date: "2026-10-07", startTime: "06:00 AM", endTime: "07:00 AM", price: "FREE", description: "Synthetic fixture", featured: false, attendeesCount: 0, demo: true }];
    await page.evaluate(highlights => (window as unknown as { renderHome: (props: unknown) => void }).renderHome({ highlights }), populated);
    await expect(page.locator(".hub-events article")).toHaveCount(1);
    await expect(page.locator(".hub-cards article")).toHaveCount(3);
    await expect(page.locator(".hub-demo-note")).toHaveCount(1);
    await expect(page.locator(".hub-cards").getByText("Demo", { exact: true })).toHaveCount(0);
    await expect(page.locator(".hub-cards img, .hub-cards button")).toHaveCount(0);
    await expect(page.locator(".hub-events")).toContainText("06:00 AM · IST");
    await expect(page.locator(".hub-events")).toContainText("Synthetic venue with a long meeting-point name");
    await page.locator(".hub-events").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.E2E_HOME_SCREENSHOTS) {
      await page.addStyleTag({ content: "html{font-size:100%}" });
      await page.screenshot({ path: `/tmp/noidafit-home-hub-${width}.png`, fullPage: true });
    }
  });
}

test("an empty directory is not an outage and real-only highlights need no illustrative notice", async ({ page }) => {
  await mount(page, { highlights: { activities: [], events: [], communities: [], places: [], eventWindow: "upcoming", hasDemo: false } });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome.");
  await expect(page.getByText("No upcoming sessions listed yet.", { exact: true })).toBeVisible();
  await expect(page.getByText("No published clubs yet. Check back for community listings.", { exact: true })).toBeVisible();
  await expect(page.getByText("No published places yet. Venue details are on the way.", { exact: true })).toBeVisible();
  await expect(page.locator('[role="alert"], .hub-demo-note, .hub-cards article')).toHaveCount(0);
  const realOnly = highlights();
  realOnly.hasDemo = false;
  realOnly.communities[0].demo = false;
  realOnly.places[0].demo = false;
  await page.evaluate(highlights => (window as unknown as { renderHome: (props: unknown) => void }).renderHome({ highlights }), realOnly);
  await expect(page.locator(".hub-cards article")).toHaveCount(2);
  await expect(page.locator(".hub-demo-note")).toHaveCount(0);
});

test("home logo, menu, breadcrumb and mobile dock use the hub rather than the landing page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/events");
  await page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const menu = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(menu.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeFocused();
  await page.goto("/places");
  await page.getByRole("link", { name: /^View / }).first().click();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/home");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "NOIDA.FIT — Home", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("home is usable without JavaScript and its canonical appears in the sitemap", async ({ request, browser, baseURL }) => {
  const response = await request.get("/home"); const html = await response.text();
  expect(response.status()).toBe(200); expect(html).toContain("Welcome."); expect(html).toContain("CollectionPage"); expect(html).toContain('action="/discover"');
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 }, baseURL });
  try {
    const page = await context.newPage(); await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Welcome.", exact: true })).toBeVisible();
    await page.getByLabel("Search the NOIDA.FIT directory", { exact: true }).fill("running");
    await page.getByRole("search").getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/discover" && url.searchParams.get("q") === "running");
  } finally { await context.close(); }
  const sitemap = await request.get("/sitemap.xml"); expect(await sitemap.text()).toContain("/home</loc>");
});
