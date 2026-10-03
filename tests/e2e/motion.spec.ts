import { test, expect } from "@playwright/test";

function gate() {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  return { wait, release };
}

test("bottom navigation gives feedback while a destination is delayed", async ({ page }) => {
  const entered = gate();
  const release = gate();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(url => url.pathname === "/communities", async route => {
    entered.release();
    await release.wait;
    await route.continue();
  });
  try {
    await page.goto("/login");
    const groups = page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", { name: "Groups", exact: true });
    await groups.click();
    await entered.wait;
    await expect(groups.locator('[data-nav-pending="true"]')).toBeVisible();
    await expect(groups.getByRole("status")).toContainText("Opening Groups");
    const box = (await groups.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    release.release();
    await page.waitForURL(url => url.pathname === "/communities");
    await expect(page.locator("h1")).toBeVisible();
    await expect(groups).toHaveAttribute("aria-current", "page");
    await expect(groups.locator('[data-nav-pending="true"]')).toHaveCount(0);
  } finally { release.release(); }
});

test("card reveals are bounded, dialogs reopen cleanly, and reduced motion remains static", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    const records: { duration: number; delay: number }[] = [];
    Object.assign(window, { revealRecords: records });
    Element.prototype.animate = function (frames, options) {
      if (this.hasAttribute("data-reveal-item") && typeof options === "object") {
        records.push({ duration: Number(options.duration), delay: Number(options.delay ?? 0) });
      }
      return animate.call(this, frames, options);
    };
  });
  const records = () => page.evaluate(() => (window as unknown as { revealRecords: { duration: number; delay: number }[] }).revealRecords);
  await page.goto("/");
  await expect.poll(async () => (await records()).length).toBeGreaterThan(1);
  expect((await records()).every(item => item.duration + item.delay <= 400)).toBe(true);
  await page.goto("/discover");
  const trigger = page.getByRole("button", { name: /^Filters/ });
  const dialog = page.getByRole("dialog", { name: "Refine your search" });
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  expect(await records()).toEqual([]);
  await page.goto("/discover");
  await trigger.click();
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(node => getComputedStyle(node).transitionDuration.split(",").every(value => parseFloat(value) <= 0.01))).toBe(true);
  await page.getByRole("button", { name: "Close filters" }).click();
  await expect(dialog).toBeHidden();
});

test("save confirmation only animates after success, and failed saves remain unselected", async ({ page }) => {
  // Synthetic participation responses: this test never writes to Appwrite.
  const saved: { id: string; itemType: string; itemId: string; userId: string; createdAt: string }[] = [];
  let fail = true;
  await page.route(url => url.pathname === "/api/participation", route => route.fulfill({ json: { rsvps: [], memberships: [], savedItems: saved } }));
  await page.route("**/api/participation/saved", async route => {
    if (fail) {
      fail = false;
      await route.fulfill({ status: 503, json: { error: "Test save unavailable" } });
      return;
    }
    const data = route.request().postDataJSON();
    saved.push({ id: "test-save", itemId: data.itemId, itemType: data.itemType, userId: "test-user", createdAt: "2026-10-01T00:00:00Z" });
    await route.fulfill({ json: { saved: true } });
  });
  await page.goto("/places");
  await page.getByRole("link", { name: /^View / }).first().click();
  const button = page.getByRole("button", { name: "Save place", exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole("alert").filter({ hasText: "Test save unavailable" })).toBeVisible();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button.locator('[data-selected="true"]')).toHaveCount(0);
  await button.click();
  const selected = page.getByRole("button", { name: "Saved place", exact: true });
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  await expect(selected.locator('[data-selected="true"]')).toBeVisible();
});
