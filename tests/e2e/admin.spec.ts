import { test, expect } from "@playwright/test";

test("admin dashboard is not discoverable without an authenticated admin session", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?callbackUrl=(?:%2F|\/)admin$/);
  await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
});

test("all administrator APIs reject guests before reading input or operational data", async ({ request }) => {
  for (const path of ["/api/admin/content/events", "/api/admin/members", "/api/admin/attendance?eventId=synthetic", "/api/admin/audit"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  }
  for (const path of ["/api/admin/content/events", "/api/admin/members", "/api/admin/attendance"]) {
    const response = await request.post(path, { data: {} });
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  }
});

test("admin guide route remains excluded from search indexing", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("/admin");
});
