import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The real hero component and stylesheet under the real navbar classes; images are local files.
let script: string, stylesheet: string;
test.beforeAll(async () => {
  const output = await build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { DetailHero } from './components/discovery/DetailHero';
    window.renderHero = props => createRoot(document.getElementById('hero-root')).render(React.createElement(DetailHero, props,
      React.createElement('p', { className: 'text-text-secondary' }, 'Saturday rides · Sector 18')));
  ` }, bundle: true, write: false, outfile: "hero-fixture.js", platform: "browser", format: "iife", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' } });
  script = output.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = (await postcss([tailwindcss()]).process(readFileSync("app/globals.css", "utf8"), { from: join(process.cwd(), "app/globals.css") })).css;
});

const navbar = `<header class="app-topbar sticky top-0 z-[500] w-full border-b border-border-subtle bg-background/95 backdrop-blur-md"><nav class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8" aria-label="Primary navigation"><span class="font-bold text-white">NOIDA.FIT</span><span class="text-white">Menu</span></nav></header>`;
async function mount(page: Page, props: Record<string, unknown>, verifyBar = false) {
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/media/banner1") return route.fulfill({ contentType: "image/webp", body: readFileSync("public/images/landing/running.webp") });
    if (url.pathname === "/media/crest1") return route.fulfill({ contentType: "image/webp", body: readFileSync("public/images/landing/community.webp") });
    if (route.request().isNavigationRequest()) return route.fulfill({ contentType: "text/html", body: `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${stylesheet}</style><body class="bg-background text-foreground">${navbar}${verifyBar ? '<div id="verify-bar" class="bg-amber-400/20 p-3 text-sm">Verify your email</div>' : ""}<main id="main-content"><div class="pb-16"><div id="hero-root"></div><div style="height:1200px"></div></div></main></body>` });
    return route.abort();
  });
  await page.goto("https://fixture.invalid/community/sunrise-riders");
  await page.addScriptTag({ content: script });
  await page.evaluate(props => (window as unknown as { renderHero: (props: unknown) => void }).renderHero(props), props);
  await expect(page.locator(".detail-hero-title")).toBeVisible();
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
}
const box = (page: Page, selector: string) => page.locator(selector).first().evaluate(node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height }; });
/** Background alpha of the navbar, whatever colour notation the browser reports (rgba, oklab, color()). */
const navAlpha = (page: Page) => page.locator(".app-topbar").evaluate(node => {
  const value = getComputedStyle(node).backgroundColor;
  const match = /\/\s*([\d.]+)\s*\)$/.exec(value) ?? /rgba\([^)]*,\s*([\d.]+)\)$/.exec(value);
  return match ? Number(match[1]) : 1;
});
const club = { image: "/media/banner1", category: "cycling", title: "Sunrise Riders Noida", logo: "/media/crest1", logoAlt: "Sunrise Riders logo" };

for (const width of [320, 390, 768, 1280]) {
  test(`banner is full width under the navbar, with logo and title on its edge, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await mount(page, club);
    const hero = await box(page, ".detail-hero");
    const nav = await box(page, ".app-topbar");
    expect(hero.left).toBe(0);
    expect(hero.width).toBe(width);
    expect(hero.top).toBe(0);
    expect(hero.height).toBeGreaterThan(nav.height + 200);
    // The navbar is see-through over the banner, and the photo is the hero's background, not page colour.
    expect(await navAlpha(page)).toBeLessThan(.5);
    // Logo and title straddle the banner's bottom edge, on the left.
    const logo = await box(page, ".detail-hero-logo");
    expect(Math.abs(logo.top + logo.height / 2 - hero.bottom)).toBeLessThan(3);
    expect(logo.left).toBeLessThan(width * .2);
    const title = await box(page, ".detail-hero-title");
    expect(title.top).toBeLessThan(hero.bottom);
    expect(title.bottom).toBeGreaterThan(hero.bottom);
    expect(await page.locator(".detail-hero-logo").evaluate(node => getComputedStyle(node).boxShadow)).toContain("rgba(0, 0, 0");
    expect(await page.locator(".detail-hero-title").evaluate(node => getComputedStyle(node).textShadow)).toContain("rgba(0, 0, 0");
    await expect(page.getByRole("heading", { level: 1, name: "Sunrise Riders Noida" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Sunrise Riders logo" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/hero-${width}.png` });
  });
}

test("without a logo the title itself straddles the edge", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page, { image: "/media/banner1", category: "running", title: "Meghdootam Park" });
  const hero = await box(page, ".detail-hero");
  const title = await box(page, ".detail-hero-title");
  expect(title.top).toBeLessThan(hero.bottom);
  expect(title.bottom).toBeGreaterThan(hero.bottom);
  await expect(page.locator(".detail-hero-logo")).toHaveCount(0);
});

test("the banner never slides under the verify-email bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page, club, true);
  const bar = await box(page, "#verify-bar");
  const hero = await box(page, ".detail-hero");
  expect(hero.top).toBeGreaterThanOrEqual(bar.bottom - 0.5);
  await expect(page.getByText("Verify your email")).toBeVisible();
});

test("the navbar turns solid again once the banner has scrolled away", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page, club);
  expect(await navAlpha(page)).toBeLessThan(.5);
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => navAlpha(page)).toBeGreaterThan(.9);
});

test("a verified club shows a labelled badge that stays with the last word of its name", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mount(page, { ...club, title: "Sunrise Riders Noida Extension", verified: true, verifiedLabel: "Verified community" });
  const heading = page.getByRole("heading", { level: 1 });
  const badge = heading.getByRole("img", { name: "Verified community" });
  await expect(badge).toBeVisible();
  await expect(heading).toHaveAccessibleName("Sunrise Riders Noida Extension Verified community");
  const [word, tick] = await page.evaluate(() => {
    const title = document.querySelector(".detail-hero-title")!;
    const range = document.createRange(); const text = title.firstChild!;
    range.setStart(text, text.textContent!.lastIndexOf("Extension")); range.setEnd(text, text.textContent!.length);
    return [range.getClientRects()[0].top, document.querySelector(".detail-hero-verified")!.getBoundingClientRect().top];
  });
  expect(Math.abs(word - tick)).toBeLessThan(12);
  if (process.env.SCREENSHOT_DIR) await page.locator(".detail-hero-header").screenshot({ path: `${process.env.SCREENSHOT_DIR}/hero-verified.png` });
  await mount(page, { ...club, verified: false });
  await expect(page.getByRole("img", { name: /Verified/ })).toHaveCount(0);
});
