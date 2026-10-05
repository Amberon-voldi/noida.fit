import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { FitnessProfile } from "../../types/user";

// Render the real card with production base CSS, its current component CSS,
// and synthetic props. No account, session, or database fixture is needed.
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
        import { FitnessCard } from "./components/cards/FitnessCard";
        import { ProfileActions } from "./components/profile/ProfileActions";
        const root = createRoot(document.getElementById("card-fixture"));
        window.renderCard = (profile, options = {}) => root.render(React.createElement(FitnessCard, {
          user: profile, showControls: options.showControls,
          actions: options.withActions ? React.createElement(ProfileActions, {handle: profile.handle, name: profile.name}) : undefined
        }));`,
      loader: "tsx", resolveDir: process.cwd(),
    },
    bundle: true, write: false, outfile: "fitness-card-fixture.js", platform: "browser", format: "iife",
    // Never pass the process environment into a synthetic browser fixture.
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SITE_URL": '"https://noida.fit"' },
  });
  fixtureScript = result.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = `${productionCss}\n${result.outputFiles.find(file => file.path.endsWith(".css"))!.text}`;
});

const syntheticProfile: FitnessProfile = {
  id: "NF-SYNTHETIC", cardNumber: "NF-SYNTHETIC", name: "Synthetic Card Member", slug: "synthetic-member", handle: "@synthetic-member",
  joinedAt: "2026-09-01T00:00:00Z", city: "Noida", visibility: "public", showActivity: true, showCommunities: false,
  communityMemberships: [], stats: { verifiedActivities: 1, eventsAttended: 1, communitiesJoined: 0, streakWeeks: 1 },
};

type CardOptions = { withActions?: boolean; showControls?: boolean };
async function renderCard(page: Page, profile: FitnessProfile, options: CardOptions = {}) {
  await page.evaluate(({ profile, options }) => {
    (window as unknown as { renderCard: (profile: FitnessProfile, options: CardOptions) => void }).renderCard(profile, options);
  }, { profile, options });
}

async function mountCard(page: Page, profile = syntheticProfile, options: CardOptions = {}) {
  const html = `<style>${stylesheet}</style><main style="padding:16px"><div id="card-fixture" style="max-width:512px;margin:auto"></div></main>`;
  // Fulfill the synthetic page and real public logo locally; block every other
  // request. No Next server, optimized image service, or external origin is used.
  await page.route("**/*", route => {
    if (route.request().isNavigationRequest()) return route.fulfill({ status: 200, contentType: "text/html", body: html });
    if (route.request().url().includes("logo.png")) return route.fulfill({ status: 200, contentType: "image/png", body: readFileSync(join(process.cwd(), "public/images/logo.png")) });
    return route.abort();
  });
  await page.goto("https://fixture.invalid/fitness-id");
  // Flip and share feedback are ephemeral UI state, never browser persistence.
  await page.evaluate(() => {
    for (const storage of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(window, storage, { configurable: true, get() { throw new Error("Browser persistence is not allowed in this fixture"); } });
    }
  });
  await page.addScriptTag({ content: fixtureScript });
  await renderCard(page, profile, options);
  await expect.poll(() => page.locator(".fitness-card-front img").evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}

async function expectUprightBack(page: Page) {
  // Parent 180° × back-face 180° = upright 360°. This detects an orientation
  // regression even when the React state and aria-pressed still toggle.
  await expect.poll(() => page.locator(".fitness-card-back").evaluate(node => {
    const parent = new DOMMatrix(getComputedStyle(node.parentElement!).transform);
    const face = new DOMMatrix(getComputedStyle(node).transform);
    const composed = parent.multiply(face);
    return Math.abs(composed.m11 - 1) + Math.abs(composed.m22 - 1) + Math.abs(composed.m33 - 1);
  })).toBeLessThan(0.001);
}

for (const width of [320, 390, 1024]) {
  for (const reduced of [false, true]) {
    test(`Public Fitness ID back stays upright at ${width}px${reduced ? " with reduced motion" : ""}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await mountCard(page);
      const card = page.getByRole("button", { name: /^Fitness ID for/ });
      const back = page.locator(".fitness-card-back");
      const front = page.locator(".fitness-card-front");
      const control = page.getByRole("button", { name: "Show profile QR", exact: true });
      await expect(card).toHaveAttribute("aria-pressed", "false");
      await expect(control).toHaveAttribute("aria-controls", await card.getAttribute("id") as string);
      await expect(back).toHaveAttribute("aria-hidden", "true");
      expect(await back.evaluate(node => getComputedStyle(node).backfaceVisibility)).toBe("hidden");
      expect(await back.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m11)).toBeCloseTo(-1);
      if (reduced) expect(await page.locator(".fitness-card-body").evaluate(node => getComputedStyle(node).transitionProperty)).toBe("none");
      await card.focus();
      await page.keyboard.press("Enter");
      await expect(card).toHaveAttribute("aria-pressed", "true");
      await expect(front).toHaveAttribute("aria-hidden", "true");
      await expect(back).toHaveAttribute("aria-hidden", "false");
      await expectUprightBack(page);
      await expect(page.getByRole("img", { name: "Public profile QR code for @synthetic-member" })).toBeVisible();
      await expect(back).toContainText("Scan to open public profile");
      await expect(back).toContainText("not an entry or check-in pass");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: "Show front", exact: true }).click();
      await expect(card).toHaveAttribute("aria-pressed", "false");
      await expect(front).toHaveAttribute("aria-hidden", "false");
      await expect(back).toHaveAttribute("aria-hidden", "true");
      await expect(page.getByRole("button", { name: "Show profile QR", exact: true })).toHaveAttribute("aria-pressed", "false");
      expect(errors).toEqual([]);
    });
  }

  test(`Private Fitness ID has details but no public QR or sharing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mountCard(page, { ...syntheticProfile, visibility: "private" }, { withActions: true });
    const card = page.getByRole("button", { name: /^Fitness ID for/ });
    await expect(page.getByRole("button", { name: "Card details", exact: true })).toBeVisible();
    await expect(page.locator(".fitness-card-qr-wrap svg")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Share public profile" })).toHaveCount(0);
    await page.getByRole("button", { name: "Card details", exact: true }).click();
    await expect(page.locator(".fitness-card-back")).toHaveAttribute("aria-hidden", "false");
    await expect(page.locator(".fitness-card-private")).toContainText("Only you can see this ID");
    await expect(page.locator(".fitness-card-private")).toContainText("Public sharing and a profile QR are off");
    await expectUprightBack(page);
    await card.focus();
    await page.keyboard.press("Space");
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Card details", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("The front shows real identity and neutral facts, without invented status", async ({ page }) => {
  await mountCard(page);
  const front = page.locator(".fitness-card-front");
  await expect(front).toContainText("Community member");
  await expect(front).toContainText("Synthetic Card Member");
  await expect(front).toContainText("@synthetic-member");
  await expect(front).toContainText("Noida");
  await expect(front).toContainText("Public profile");
  await expect(front.locator(".fitness-card-fact").first()).toHaveText("1Verified sessions");
  await expect(front.locator(".fitness-card-fact").last()).toHaveText("2026Member since");
  await expect(front).not.toContainText("Active member");
  await expect(front.locator(".fitness-card-live-dot, .fitness-card-glow, .lucide-circle-check")).toHaveCount(0);
  expect(await front.locator("img").getAttribute("src")).toContain("logo.png");
  expect(await front.locator(".fitness-card-label").first().evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12);
});

test("Privacy nulls stay hidden, while legacy totals, zero, and missing dates stay honest", async ({ page }) => {
  await mountCard(page, { ...syntheticProfile, joinedAt: "not-a-date", showActivity: false, stats: { ...syntheticProfile.stats, verifiedActivities: null, eventsAttended: 37 } });
  const facts = page.locator(".fitness-card-front .fitness-card-fact");
  await expect(facts.first()).toHaveText("—Verified sessionsNot shared");
  await expect(facts.last()).toHaveText("—Member since");
  await expect(page.locator(".fitness-card-front")).not.toContainText("37");
  await renderCard(page, { ...syntheticProfile, stats: { ...syntheticProfile.stats, verifiedActivities: 0 } });
  await expect(facts.first()).toHaveText("0Verified sessions");
  await renderCard(page, { ...syntheticProfile, stats: { eventsAttended: 2, communitiesJoined: 0, streakWeeks: 0 } });
  await expect(facts.first()).toHaveText("2Verified sessions");
});

test("A public QR preserves high contrast and the four-module quiet zone", async ({ page }) => {
  await mountCard(page);
  await page.getByRole("button", { name: "Show profile QR", exact: true }).click();
  const qr = page.getByRole("img", { name: "Public profile QR code for @synthetic-member" });
  const bounds = await qr.evaluate(node => {
    const svg = node as SVGSVGElement;
    const foreground = svg.querySelector<SVGPathElement>('path[fill="#090a0f"]')!;
    const box = foreground.getBBox();
    return {
      left: box.x, top: box.y,
      right: svg.viewBox.baseVal.width - box.x - box.width,
      bottom: svg.viewBox.baseVal.height - box.y - box.height,
      foreground: getComputedStyle(foreground).fill,
      background: getComputedStyle(svg.querySelector('path[fill="#ffffff"]')!).fill,
    };
  });
  expect(bounds).toEqual({ left: 4, top: 4, right: 4, bottom: 4, foreground: "rgb(9, 10, 15)", background: "rgb(255, 255, 255)" });
});

test("Long names and handles remain readable without clipping at 320px and 200% text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1200 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const profile = { ...syntheticProfile, name: "Synthetic Member With A Very Long Name That Must Remain Fully Readable", slug: "synthetic-member-with-a-long-unbroken-public-handle", city: "Noida & Greater Noida" };
  await mountCard(page, profile, { withActions: true });
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await expect(page.locator(".fitness-card-name")).toHaveText(profile.name);
  await expect(page.locator(".fitness-card-handle")).toHaveText(`@${profile.slug}`);
  for (const selector of [".fitness-card-front", ".fitness-card-name", ".fitness-card-handle"]) {
    const size = await page.locator(selector).evaluate(node => ({ scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    expect(size.scrollHeight, `${selector} height`).toBeLessThanOrEqual(size.clientHeight);
    expect(size.scrollWidth, `${selector} width`).toBeLessThanOrEqual(size.clientWidth);
  }
  await page.getByRole("button", { name: "Show profile QR", exact: true }).click();
  await expectUprightBack(page);
  expect(await page.locator(".fitness-card-back").evaluate(node => node.scrollHeight <= node.clientHeight && node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Sharing is on one external 44px action rail and cannot flip the card", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await mountCard(page, syntheticProfile, { withActions: true });
  await page.evaluate(() => Object.defineProperty(navigator, "share", { configurable: true, value: async () => {} }));
  const card = page.getByRole("button", { name: /^Fitness ID for/ });
  await expect(card.locator("button")).toHaveCount(0);
  await expect(page.locator(".fitness-card-controls")).toHaveCount(1);
  const share = page.locator(".fitness-card-controls").getByRole("button", { name: "Share public profile" });
  const box = await share.boundingBox();
  expect(box?.width).toBe(44);
  expect(box?.height).toBe(44);
  await share.click();
  await expect(page.getByRole("status")).toHaveText("Profile shared.");
  await expect(card).toHaveAttribute("aria-pressed", "false");
  // Privacy changes remove a previously rendered QR and even supplied actions.
  await renderCard(page, { ...syntheticProfile, visibility: "private" }, { withActions: true });
  await expect(page.locator(".fitness-card-qr-wrap svg")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Share public profile" })).toHaveCount(0);
});

test("Callers can omit the controls without losing whole-card keyboard flipping", async ({ page }) => {
  await mountCard(page, syntheticProfile, { showControls: false });
  await expect(page.locator(".fitness-card-controls")).toHaveCount(0);
  const card = page.getByRole("button", { name: /^Fitness ID for/ });
  await card.focus();
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expectUprightBack(page);
});
