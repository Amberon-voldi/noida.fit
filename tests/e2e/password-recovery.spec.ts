import { test, expect } from "@playwright/test";

// API calls are intercepted in the browser: these checks cover the UI flow, not Appwrite email delivery.
test("sign-in links to a recovery request that answers the same for any email", async ({ page }) => {
  let payload: unknown;
  await page.route("**/api/auth/recovery", async route => { payload = route.request().postDataJSON(); await route.fulfill({ json: { ok: true } }); });
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?", exact: true }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Forgot your password?");
  await page.getByLabel("Email", { exact: true }).fill("member@example.test");
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your inbox");
  await expect(page.getByRole("status")).toContainText("If an account exists for member@example.test");
  expect(payload).toEqual({ email: "member@example.test" });
  await page.getByRole("button", { name: "try another email", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

test("recovery request failures stay on the form with a message", async ({ page }) => {
  await page.route("**/api/auth/recovery", route => route.fulfill({ status: 429, json: { error: "Too many requests. Try again shortly.", code: "RATE_LIMITED" } }));
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill("member@example.test");
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Too many requests. Try again shortly.");
  await expect(page.getByRole("button", { name: "Send reset link", exact: true })).toBeEnabled();
});

test("an incomplete reset link offers a new one", async ({ page }) => {
  await page.goto("/reset-password?userId=only-user");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This reset link is incomplete");
  await expect(page.getByRole("link", { name: "Send a new link", exact: true })).toHaveAttribute("href", "/forgot-password");
});

test("a reset link sets a new password, explains expired links and never leaks its secret", async ({ page }) => {
  let payload: unknown;
  let expired = true;
  await page.route("**/api/auth/recovery/confirm", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill(expired
      ? { status: 400, json: { error: "This reset link has expired or was already used. Request a new one.", code: "RECOVERY_LINK_INVALID" } }
      : { json: { ok: true } });
  });
  await page.goto("/reset-password?userId=synthetic-user&secret=synthetic-secret");
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  await page.getByLabel("New password", { exact: true }).fill("NewPassw0rd");
  await page.getByLabel("Confirm new password", { exact: true }).fill("Different1");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Passwords don't match.");
  expect(payload).toBeUndefined();
  await page.getByLabel("Confirm new password", { exact: true }).fill("NewPassw0rd");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("expired or was already used");
  await expect(page.getByRole("link", { name: "Send a new link", exact: true })).toHaveAttribute("href", "/forgot-password");
  expired = false;
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Password updated");
  expect(payload).toEqual({ userId: "synthetic-user", secret: "synthetic-secret", password: "NewPassw0rd" });
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
});
