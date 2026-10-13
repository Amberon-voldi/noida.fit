import { test, expect } from "@playwright/test";

test("unknown routes return a real 404 page", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Lost on the route?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to NOIDA.FIT", exact: true })).toHaveAttribute("href", "/");
});

test("legal pages expose their effective dates and footer links", async ({ page }) => {
  for (const [path, heading] of [["/privacy", "Privacy Policy"], ["/terms", "Terms & Conditions"]] as const) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
    await expect(page.getByText("Effective date: 13 October 2026", { exact: true })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
  }
  await page.goto("/about");
  await expect(page.getByRole("navigation", { name: "Legal information" }).getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
  await expect(page.getByRole("navigation", { name: "Legal information" }).getByRole("link", { name: "Terms", exact: true })).toHaveAttribute("href", "/terms");
});

test("cookie notice explains the essential session cookie and remembers dismissal", async ({ page }) => {
  await page.goto("/about");
  const notice = page.getByRole("complementary", { name: "Cookie notice" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("essential session cookie");
  await expect(notice.getByRole("link", { name: "Read our Privacy Policy" })).toHaveAttribute("href", "/privacy");
  await notice.getByRole("button", { name: "Got it" }).click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Cookie notice" })).toBeHidden();
});
