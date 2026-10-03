import { test, expect } from "@playwright/test";

function gate() {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  return { wait, release };
}

for (const flow of ["login", "signup"] as const) {
  test(`${flow} stays busy after the API succeeds until navigation completes`, async ({ page }) => {
    const apiStarted = gate();
    const releaseApi = gate();
    const navigationStarted = gate();
    const releaseNavigation = gate();
    let submissions = 0;
    // Browser UX test only: no real accounts or sessions are created.
    await page.route(`**/api/auth/${flow}`, async route => {
      submissions++;
      apiStarted.release();
      await releaseApi.wait;
      await route.fulfill({ json: { ok: true, redirectTo: "/about?auth-loading-test=1" } });
    });
    await page.route(url => url.pathname === "/about", async route => {
      navigationStarted.release();
      await releaseNavigation.wait;
      await route.continue();
    });
    try {
      await page.goto(`/${flow}?callbackUrl=%2Fabout`);
      if (flow === "signup") {
        await page.getByLabel("Display name", { exact: true }).fill("Loading Test");
        await page.getByLabel("Username", { exact: true }).fill("loading-test");
      }
      await page.getByLabel("Email", { exact: true }).fill("loading@example.test");
      await page.getByLabel("Password", { exact: true }).fill("Test-password-123");
      const form = page.locator("form");
      const button = form.locator('button[type="submit"]');
      await button.click();
      await apiStarted.wait;
      await expect(button).toBeDisabled();
      await expect(form).toHaveAttribute("aria-busy", "true");
      releaseApi.release();
      await navigationStarted.wait;
      await expect(button).toBeDisabled({ timeout: 2000 });
      await expect(form).toHaveAttribute("aria-busy", "true");
      await expect(button.locator("svg.animate-spin")).toBeVisible();
      await expect(button).toContainText("Opening your page");
      // Even another submit event during navigation must not issue a second request.
      await form.evaluate(node => (node as HTMLFormElement).requestSubmit());
      expect(submissions).toBe(1);
      releaseNavigation.release();
      await page.waitForURL(url => url.pathname === "/about");
      await expect(page.locator("h1")).toBeVisible();
      await expect(form).toHaveCount(0);
    } finally {
      releaseApi.release();
      releaseNavigation.release();
    }
  });

  for (const failure of ["http", "network"] as const) {
    test(`${flow} clears the spinner and allows retry after ${failure} failure`, async ({ page }) => {
      let submissions = 0;
      await page.route(`**/api/auth/${flow}`, async route => {
        submissions++;
        if (failure === "network") await route.abort("failed");
        else await route.fulfill({ status: 503, json: { error: "Test service unavailable" } });
      });
      await page.goto(`/${flow}`);
      if (flow === "signup") {
        await page.getByLabel("Display name", { exact: true }).fill("Loading Test");
        await page.getByLabel("Username", { exact: true }).fill("loading-test");
      }
      await page.getByLabel("Email", { exact: true }).fill("loading@example.test");
      await page.getByLabel("Password", { exact: true }).fill("Test-password-123");
      const form = page.locator("form");
      const button = form.locator('button[type="submit"]');
      for (let attempt = 1; attempt <= 2; attempt++) {
        await button.click();
        await expect(form.getByRole("alert")).toBeVisible();
        await expect(form).toHaveAttribute("aria-busy", "false");
        await expect(button).toBeEnabled();
        await expect(button.locator("svg.animate-spin")).toHaveCount(0);
        expect(submissions).toBe(attempt);
      }
      await expect(page.getByLabel("Email", { exact: true })).toHaveValue("loading@example.test");
    });
  }
}
