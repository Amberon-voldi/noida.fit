import { test, expect } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test(`landing photography, discovery and layout are usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /FIND YOUR PEOPLE/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explore Noida fitness/i })).toHaveAttribute("href", "/discover");
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Quick plans" }).getByRole("link", { name: "This weekend", exact: true })).toHaveAttribute("href", "/events?date=weekend");
    await expect(page.getByRole("button", { name: "Pause parallax motion" })).toBeVisible();
    await expect.poll(() => page.locator(".landing-hero-photo img").evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if (process.env.E2E_LANDING_SCREENSHOTS) await page.screenshot({ path: `/tmp/noidafit-landing-hero-${width}.png` });
    for (const control of [page.getByRole("link", { name: /Explore Noida fitness/i }), page.getByRole("button", { name: "Pause parallax motion" }), ...await page.getByRole("navigation", { name: "Quick plans" }).getByRole("link").all()]) {
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("link", { name: "Find your next move", exact: true }).click();
    await expect(page.locator("#week")).toBeInViewport();
    await expect(page.getByRole("heading", { name: "Your next seven days." })).toBeVisible();
    for (const selector of ["#activities", ".landing-story", "#community", "#places", "#weekend", ".landing-finale"]) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await expect(page.locator(selector)).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.locator(".landing-story").scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator(".landing-story-image img").evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if (process.env.E2E_LANDING_SCREENSHOTS) await page.screenshot({ path: `/tmp/noidafit-landing-story-${width}.png` });
    expect(errors).toEqual([]);
  });
}

test("landing search and community actions lead to the real discovery routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Search the NOIDA.FIT directory", { exact: true }).fill("running near Sector 21A");
  await page.getByRole("search").getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/discover" && url.searchParams.get("q") === "running near Sector 21A");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "Meet your people", exact: true }).click();
  await expect(page).toHaveURL(/\/communities$/);
});

for (const width of [390, 1440]) {
  test(`parallax follows scrolling, pauses and responds to reduced motion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const root = page.locator(".landing-page");
    await expect(root).toHaveAttribute("data-motion", "active");
    const image = page.locator(".landing-hero-photo");
    const shift = () => image.evaluate(node => parseFloat((node as HTMLElement).style.getPropertyValue("--landing-shift")));
    await expect.poll(async () => Number.isFinite(await shift())).toBe(true);
    const before = await shift();
    await page.evaluate(() => window.scrollTo({ top: 180, behavior: "instant" }));
    await expect.poll(async () => Math.abs((await shift()) - before)).toBeGreaterThan(1);
    expect(Math.abs(await shift())).toBeLessThanOrEqual(width < 768 ? 21 : 42);
    await page.getByRole("button", { name: "Pause parallax motion" }).click();
    await expect(root).toHaveAttribute("data-motion", "paused");
    await expect(page.getByRole("button", { name: "Resume parallax motion" })).toHaveAttribute("aria-pressed", "true");
    expect(await image.evaluate(node => getComputedStyle(node).transform)).toBe("none");
    expect(await image.evaluate(node => (node as HTMLElement).style.getPropertyValue("--landing-shift"))).toBe("");
    await page.getByRole("button", { name: "Resume parallax motion" }).click();
    await expect(root).toHaveAttribute("data-motion", "active");
    await expect.poll(async () => Number.isFinite(await shift())).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(root).toHaveAttribute("data-motion", "reduced");
    await expect(page.getByRole("button", { name: /parallax motion/i })).toHaveCount(0);
    for (const selector of [".landing-hero-photo", ".landing-hero-track", ".landing-kinetic-track", ".landing-story-image"]) expect(await page.locator(selector).evaluate(node => getComputedStyle(node).transform)).toBe("none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.getByRole("button", { name: "Pause parallax motion" })).toBeVisible();
    await page.getByRole("link", { name: /Explore Noida fitness/i }).click();
    await expect(page).toHaveURL(/\/discover$/);
    // The controller's scoped listeners/styles must not escape the landing route.
    await expect(page.locator(".landing-page")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  });
}

test("reduced-motion landing remains readable with enlarged text and keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await expect(page.getByRole("heading", { name: /FIND YOUR PEOPLE/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /parallax motion/i })).toHaveCount(0);
  const action = page.getByRole("link", { name: /Explore Noida fitness/i });
  await action.focus();
  await expect(action).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Find a community", exact: true }).first()).toBeFocused();
  for (const selector of [".landing-hero", "#activities", ".landing-story", ".landing-finale"]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("server-rendered landing response contains the primary journey", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("FIND YOUR");
  expect(body).toContain("/discover");
  expect(body).toContain("/communities");
  expect(body).toContain("Your next seven days.");
});
