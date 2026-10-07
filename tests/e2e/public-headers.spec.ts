import { test, expect } from "@playwright/test";

const pages = [
  { path: "/discover", title: "Discover", header: ".directory-header" },
  { path: "/events", title: "Events", header: ".directory-header" },
  { path: "/communities", title: "Communities", header: ".directory-header" },
  { path: "/places", title: "Places", header: ".directory-header" },
  { path: "/search", title: "Search", header: ".directory-header" },
  { path: "/activities", title: "Activities", header: ".activities-header", controls: true },
  { path: "/activities/running", title: "Running", header: ".activity-guide-header", controls: true },
  { path: "/about", title: "About", header: ".public-page-header" },
  { path: "/stories", title: "Stories", header: ".public-page-header" },
  { path: "/for-organizers", title: "For organizers", header: ".public-page-header", controls: true },
];

for (const width of [320, 390, 768, 1440]) {
  test(`public page headers stay concise and preserve controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const item of pages) {
      const response = await page.goto(item.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: item.title, exact: true })).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      const header = page.locator(item.header);
      await expect(header.locator(".eyebrow, p")).toHaveCount(0);
      await expect(header).not.toContainText("NOIDA & GREATER NOIDA");
      expect(await header.locator("h1").evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeLessThanOrEqual(24);
      if (!item.controls) expect((await header.boundingBox())!.height).toBeLessThanOrEqual(80);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${item.path}$`));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (item.header === ".directory-header") await expect(page.getByRole("search")).toBeVisible();
    }
    await page.goto("/activities");
    await expect(page.locator(".activities-header").getByRole("search")).toHaveAttribute("action", "/discover");
    await page.goto("/activities/running");
    await expect(page.getByRole("link", { name: "Filter by sector, date or cost →", exact: true })).toHaveAttribute("href", "/discover?activity=running");
    await page.goto("/for-organizers");
    await expect(page.locator("#organizer-submit-cta")).toHaveAttribute("href", /^mailto:hello@noida.fit/);
    await expect(page.getByRole("link", { name: "Read FAQ", exact: true })).toHaveAttribute("href", "#faq");
    await expect(page.getByText("Sample listings are not partnerships or confirmed sessions.", { exact: false })).toBeVisible();
  });
}
