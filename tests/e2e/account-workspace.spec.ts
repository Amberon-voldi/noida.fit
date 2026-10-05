import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { AccountWorkspaceProps } from "../../components/profile/AccountWorkspace";
import type { Event } from "../../types/event";

// Exercise the real private presentation with synthetic, already-authorized
// props. These checks do not claim to test Appwrite authentication or persistence.
let script: string;
let stylesheet: string;
test.beforeAll(async () => {
  const directory = join(process.cwd(), ".next/static/chunks");
  const css = readdirSync(directory).filter(file => file.endsWith(".css")).sort().map(file => readFileSync(join(directory, file), "utf8")).join("\n");
  const result = await build({
    stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
      import { AccountWorkspace } from "./components/profile/AccountWorkspace";
      const root = createRoot(document.getElementById("fixture"));
      window.routerCalls = {refresh: 0, destinations: []};
      const router = { back() {}, forward() {}, prefetch() {}, refresh() { window.routerCalls.refresh++; },
        push(href) { window.routerCalls.destinations.push(href); }, replace(href) { window.routerCalls.destinations.push(href); } };
      window.renderAccount = props => root.render(props ? React.createElement(AppRouterContext.Provider, {value: router}, React.createElement(AccountWorkspace, props)) : null);
    ` },
    bundle: true, write: false, outfile: "account-workspace-fixture.js", platform: "browser", format: "iife",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SITE_URL": '"https://noida.fit"' },
  });
  script = result.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = `${css}\n${result.outputFiles.find(file => file.path.endsWith(".css"))!.text}`;
});

const event = (id: string, date: string): Event => ({ id, slug: id, title: `Synthetic ${id} session`, category: "running", communitySlug: "group", communityName: "Synthetic group", venueSlug: "venue", venueName: "Synthetic Stadium Gate", sector: "Sector 21A", date, startsAt: `${date}T06:00:00+05:30`, startTime: "06:00 AM", endTime: "07:00 AM", price: "FREE", description: "Not a real event", featured: false, attendeesCount: 0, demo: true });
function data(populated = true): AccountWorkspaceProps {
  const next = event("earliest", "2026-10-10"), later = event("later", "2026-10-11"), past = event("recorded", "2026-09-10");
  return {
    profile: { id: "synthetic-id", cardNumber: "NF-SYNTHETIC", name: "Synthetic Member", slug: "synthetic-member", handle: "@synthetic-member", city: "Noida", visibility: "public", showActivity: true, showCommunities: true, communityMemberships: [], joinedAt: "2026-09-01T00:00:00Z", stats: { verifiedActivities: populated ? 1 : 0, eventsAttended: populated ? 1 : 0, communitiesJoined: populated ? 1 : 0, streakWeeks: populated ? 1 : 0 } },
    settings: { username: "synthetic-member", displayName: "Synthetic Member", city: "Noida", bio: "", visibility: "public", showActivity: true, showCommunities: true, notifications: false },
    email: "synthetic@example.test", canOrganize: true, events: [later, next, past], upcomingEvents: [next, later], places: [],
    communities: [{ id: "group", slug: "group", name: "Synthetic group", category: "running", tagline: "Test", description: "Test", baseLocation: "Noida", membersCount: 1, verified: false, featured: false, meetingDays: [], captains: [], socialLinks: {}, demo: true }],
    participation: {
      rsvps: populated ? [later, next].map((item, i) => ({ id: `r-${i}`, eventId: item.id, userId: "synthetic-user", status: "confirmed", seatNumber: i, createdAt: "2026-09-01T00:00:00Z" })) : [],
      savedItems: populated ? [{ id: "s-1", itemType: "event", itemId: later.id, userId: "synthetic-user", createdAt: "2026-09-01T00:00:00Z" }] : [],
      memberships: populated ? [{ id: "m-1", userId: "synthetic-user", communityId: "group", status: "active", createdAt: "2026-09-01T00:00:00Z" }] : [],
      checkins: [],
      participations: populated ? ["verified", "pending", "self_reported", "connected"].map((status, i) => ({ id: `p-${i}`, userId: "synthetic-user", eventId: past.id, activityId: "running", title: `Synthetic ${status} record`, occurredAt: `2026-09-1${9 - i}T06:00:00+05:30`, source: "test", status: status as "verified" | "pending" | "self_reported" | "connected" })) : [],
    },
  };
}

async function render(page: Page, props: AccountWorkspaceProps) {
  await page.evaluate(props => (window as unknown as { renderAccount: (props: AccountWorkspaceProps) => void }).renderAccount(props), props);
}
async function mount(page: Page, props = data()) {
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.isNavigationRequest()) return route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><main id="fixture"></main>` });
    if (url.pathname === "/api/participation") return route.fulfill({ json: { rsvps: props.participation.rsvps, savedItems: props.participation.savedItems, memberships: props.participation.memberships } });
    if (url.href.includes("logo.png")) return route.fulfill({ contentType: "image/png", body: readFileSync(join(process.cwd(), "public/images/logo.png")) });
    return route.abort();
  });
  await page.goto("https://fixture.invalid/account");
  await page.addScriptTag({ content: script });
  await render(page, props);
  await expect(page.getByRole("button", { name: /Open Fitness ID for/ })).toBeVisible();
}

for (const width of [320, 390, 768, 1440]) {
  test(`Account ID, next plan and private passport are usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const props = data();
    await mount(page, props);
    const next = page.getByRole("region", { name: "Up next", exact: true });
    await expect(next).toContainText("Synthetic earliest session");
    await expect(next.getByRole("link", { name: "Open event", exact: true })).toHaveAttribute("href", "/event/earliest");
    await expect(next).toContainText("Synthetic Stadium Gate");
    await expect(next).toContainText("Confirmed RSVP");
    // One integrated introduction: no separate greeting, marketing copy or
    // duplicate metrics above it. Navigation follows the overview, not the banner.
    await expect(page.getByRole("heading", { name: props.profile.name, exact: true })).toBeVisible();
    await expect(page.locator(".identity-profile")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".identity-name-row h2")).toHaveCSS("color", "rgb(248, 250, 252)");
    await expect(page.locator(".member-space-header, .member-edition, .identity-facts, .identity-banner-caption, .identity-bio")).toHaveCount(0);
    const profileBounds = (await page.locator(".member-id").boundingBox())!;
    const bannerBounds = (await page.locator(".identity-banner").boundingBox())!;
    expect(bannerBounds.y).toBeLessThanOrEqual(32);
    expect(bannerBounds.height).toBeLessThanOrEqual(124);
    expect(profileBounds.height).toBeLessThan(300);
    const overviewBounds = (await page.locator(".member-overview").boundingBox())!;
    const navBounds = (await page.getByRole("navigation", { name: "Account sections" }).boundingBox())!;
    expect(navBounds.y).toBeGreaterThan(overviewBounds.y + overviewBounds.height);
    await expect(page.getByRole("link", { name: "Organizer tools" })).toHaveAttribute("href", "/organizer");
    for (const control of [page.getByRole("button", { name: "View Fitness ID", exact: true }), page.getByRole("link", { name: "Privacy settings", exact: true }), page.getByRole("link", { name: "Preview public profile", exact: true })]) {
      const target = (await control.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    if (process.env.E2E_SYNTHETIC_SCREENSHOTS) await page.screenshot({ path: `/tmp/noidafit-member-space-banner-${width}.png`, fullPage: true });
    const banner = page.getByRole("button", { name: /Open Fitness ID for/ });
    await banner.click();
    const dialog = page.getByRole("dialog", { name: "Fitness ID", exact: true });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Share public profile", exact: true })).toBeVisible();
    await expect.poll(() => page.locator(".identity-dialog-surface").evaluate(node => node.getAnimations().length)).toBe(0);
    if (process.env.E2E_SYNTHETIC_SCREENSHOTS) await page.screenshot({ path: `/tmp/noidafit-member-space-foreground-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(banner).toBeFocused();
    await expect(page.locator(".member-id")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const idBox = (await page.locator(".member-id").boundingBox())!;
    const nextBox = (await next.boundingBox())!;
    if (width < 768) expect(nextBox.y).toBeGreaterThan(idBox.y + idBox.height);
    else expect(nextBox.x).toBeGreaterThan(idBox.x + idBox.width);
    await expect(page.locator(".participation-passport-preview .passport-entry")).toHaveCount(3);
    await expect(page.locator('.passport-entry[data-status="verified"]').first()).toContainText("Organizer verified");
    await expect(page.locator('.passport-entry[data-status="pending"]').first()).toContainText("Pending verification");
    await expect(page.locator('.passport-entry[data-status="self_reported"]').first()).toContainText("Self-reported · not verified");
    await page.getByRole("button", { name: /^All participation records/ }).click();
    await expect(page.getByRole("list", { name: "All participation records", exact: true })).toBeVisible();
    await expect(page.locator(".participation-passport-history .passport-entry")).toHaveCount(4);
    await expect(page.locator('.participation-passport-history .passport-entry[data-status="connected"]')).toContainText("Connected service");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await render(page, { ...props, profile: { ...props.profile, visibility: "private" }, settings: { ...props.settings, visibility: "private" } });
    await expect(page.getByRole("link", { name: /^Preview public profile/ })).toHaveCount(0);
    await banner.click();
    await expect(page.getByRole("button", { name: "Share public profile", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Card details", exact: true })).toBeVisible();
    await expect(page.locator(".fitness-card-qr-wrap svg")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test("Banner lifts into the foreground, traps focus, flips, and returns without layout shifts", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const records: { frames: unknown; duration: number }[] = [];
    Object.assign(window, { identityMotion: records });
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.classList.contains("identity-dialog-surface") && typeof options === "object") records.push({ frames, duration: Number(options.duration) });
      return animate.call(this, frames, options);
    };
  });
  await mount(page);
  const banner = page.getByRole("button", { name: /Open Fitness ID for/ });
  const dialog = page.getByRole("dialog", { name: "Fitness ID", exact: true });
  const before = await page.locator(".member-next").boundingBox();
  await expect(page.getByRole("button", { name: "Show profile QR", exact: true })).toHaveCount(0);
  await expect(banner).toHaveAttribute("aria-expanded", "false");
  await banner.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(banner).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect.poll(() => page.evaluate(() => (window as unknown as { identityMotion: unknown[] }).identityMotion.length)).toBe(1);
  const motion = await page.evaluate(() => (window as unknown as { identityMotion: { duration: number; frames: { transform: string }[] }[] }).identityMotion);
  expect(motion[0].duration).toBeLessThanOrEqual(400);
  expect(motion[0].frames[0].transform).toMatch(/translate\(.+scale\(/);
  expect(motion[0].frames[1].transform).toBe("translate(0, 0) scale(1)");
  await expect.poll(() => page.locator(".identity-dialog-surface").evaluate(node => node.getAnimations().length)).toBe(0);
  await page.getByRole("button", { name: "Show profile QR", exact: true }).click();
  await expect(page.getByRole("img", { name: "Public profile QR code for @synthetic-member" })).toBeVisible();
  await expect.poll(() => page.locator(".fitness-card-back").evaluate(node => {
    const composed = new DOMMatrix(getComputedStyle(node.parentElement!).transform).multiply(new DOMMatrix(getComputedStyle(node).transform));
    return Math.abs(composed.m11 - 1) + Math.abs(composed.m33 - 1);
  })).toBeLessThan(.001);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector("dialog")?.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(banner).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  expect(await page.locator(".member-next").boundingBox()).toEqual(before);
  // Returning from the back resets to the front on the next reveal.
  await banner.click();
  await expect(page.getByRole("button", { name: "Show profile QR", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Return Fitness ID to banner" }).click();
  await expect(dialog).toBeHidden();
  await expect(banner).toBeFocused();
  await banner.click();
  await dialog.click({ position: { x: 4, y: 4 } });
  await expect(dialog).toBeHidden();
  await expect(banner).toBeFocused();
  const footerTrigger = page.getByRole("button", { name: "View Fitness ID", exact: true });
  await footerTrigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(footerTrigger).toBeFocused();
});

test("Reduced motion skips banner travel; closing and unmounting restore scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(page);
  await page.getByRole("button", { name: /Open Fitness ID for/ }).click();
  const dialog = page.getByRole("dialog", { name: "Fitness ID", exact: true });
  await expect(dialog).toBeVisible();
  expect(await page.locator(".identity-dialog-surface").evaluate(node => node.getAnimations().length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: /Open Fitness ID for/ }).click();
  await expect(dialog).toBeVisible();
  await page.evaluate(() => (window as unknown as { renderAccount: (props: null) => void }).renderAccount(null));
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("Empty account keeps discovery and all settings reachable without fake attendance", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const props = data(false);
  await mount(page, { ...props, profile: { ...props.profile, visibility: "private" } });
  await expect(page.getByRole("link", { name: "Find your next session", exact: true })).toHaveAttribute("href", "/events");
  await expect(page.locator(".member-passport-empty")).toContainText("Your story starts with showing up");
  await expect(page.locator(".passport-entry")).toHaveCount(0);
  await page.getByRole("link", { name: "Privacy settings", exact: true }).click();
  const settings = page.getByRole("button", { name: /^Profile settings Your details/ });
  await expect(settings).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Account email", { exact: true })).toHaveCount(0);
  await expect(page.locator(".member-account-details")).toContainText("synthetic@example.test");
  await expect(page.getByRole("group", { name: "Preferences", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Connected services Availability and setup information." }).click();
  await expect(page.getByText("Strava OAuth is not configured for this deployment.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Repeated settings hashes open and focus the disclosure; updates retain persistence feedback", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const props = data();
  await mount(page, props);
  const settings = page.getByRole("button", { name: /^Profile settings Your details/ });
  const link = page.getByRole("link", { name: "Privacy settings", exact: true });
  await link.click();
  await expect(settings).toHaveAttribute("aria-expanded", "true");
  await expect(settings).toBeFocused();
  await settings.click();
  await expect(settings).toHaveAttribute("aria-expanded", "false");
  await link.click();
  await expect(settings).toHaveAttribute("aria-expanded", "true");
  await expect(settings).toBeFocused();
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/profile", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { settings: payload } });
  });
  await page.getByLabel("Private — only I can view my profile").check();
  await page.getByRole("button", { name: "Save settings", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();
  expect(payload?.visibility).toBe("private");
  expect(await page.evaluate(() => (window as unknown as { routerCalls: { refresh: number } }).routerCalls.refresh)).toBe(1);
});

test("Account controls preserve route refresh and logout behavior", async ({ page }) => {
  await mount(page);
  await page.route("**/api/participation/saved", route => route.fulfill({ json: { saved: false } }));
  await page.route("**/api/participation/follow", route => route.fulfill({ json: { following: false } }));
  await page.route("**/api/auth/logout", route => route.fulfill({ json: { ok: true } }));
  await page.getByRole("button", { name: "Saved event", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { routerCalls: { refresh: number } }).routerCalls.refresh)).toBe(1);
  await page.getByRole("button", { name: "Following community", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { routerCalls: { refresh: number } }).routerCalls.refresh)).toBe(2);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { routerCalls: { destinations: string[] } }).routerCalls.destinations)).toEqual(["/"]);
});

test("Only a provided biography is shown, and organizer navigation stays permission-scoped", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const props = { ...data(false), canOrganize: false };
  await mount(page, props);
  await expect(page.locator(".identity-bio")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Organizer tools", exact: true })).toHaveCount(0);
  const bio = "Synthetic biography: morning runs and weekend rides.";
  await render(page, { ...props, profile: { ...props.profile, bio } });
  await expect(page.getByText(bio, { exact: true })).toBeVisible();
  await expect(page.getByText(bio, { exact: true })).toHaveCount(1);
});

test("Long member and event names reflow on a phone with enlarged text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1200 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const props = data();
  props.profile.name = "Synthetic Member With A Very Long Name";
  props.profile.city = "SyntheticLocationWithAnUnusuallyLongName";
  props.profile.slug = "synthetic-member-extralong";
  props.events[1].title = "Synthetic session with a very long name that still needs to remain readable";
  await mount(page, props);
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await expect(page.locator(".identity-name-row h2")).toHaveText(props.profile.name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: /Open Fitness ID for/ }).click();
  await expect(page.locator(".fitness-card-name")).toHaveText(props.profile.name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
