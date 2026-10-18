import { test, expect } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test(`vector hero responds to pointer and keyboard, and stops for pause/reduced motion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/");
    const energy = page.locator(".hero-energy");
    const control = page.getByRole("button", { name: "Send a pulse", exact: true });
    await expect(energy).toHaveAttribute("data-energy", "running");
    await expect(control).toBeEnabled();
    await expect(page.locator(".hero-vector-backdrop")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".kinetic-hero")).not.toContainText("Move your pointer. Tap the centre to pulse.");
    await expect(page.locator(".kinetic-hero")).not.toContainText("Your pace. Your people. No account needed to browse.");
    await expect(page.locator(".kinetic-hero-art img, canvas")).toHaveCount(0);
    await page.mouse.move(width - 24, 160);
    await expect.poll(() => energy.evaluate(node => parseFloat((node as HTMLElement).style.getPropertyValue("--hero-x")))).toBeGreaterThan(5);
    const pose = await energy.evaluate(node => ["--hero-x", "--hero-y", "--hero-roll"].map(name => parseFloat((node as HTMLElement).style.getPropertyValue(name))));
    expect(Math.abs(pose[0])).toBeLessThanOrEqual(18);
    expect(Math.abs(pose[1])).toBeLessThanOrEqual(14);
    expect(Math.abs(pose[2])).toBeLessThanOrEqual(5);
    await control.focus(); await expect(control).toBeFocused(); await control.press("Enter");
    await expect(energy).toHaveAttribute("data-pulsing", "true");
    expect(await energy.locator(".hero-energy-burst").evaluateAll(nodes => nodes.reduce((count, node) => count + node.getAnimations().length, 0))).toBe(2);
    await page.getByRole("button", { name: "Pause landing motion" }).click();
    await expect(energy).toHaveAttribute("data-energy", "still");
    await expect(control).toBeDisabled();
    await expect(energy).not.toHaveAttribute("data-pulsing");
    await expect.poll(() => energy.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
    await page.mouse.move(24, 180);
    expect(await energy.evaluate(node => (node as HTMLElement).style.getPropertyValue("--hero-x"))).toBe("");
    expect(await page.locator(".hero-energy-plane").evaluate(node => getComputedStyle(node).transform)).toBe("none");
    await page.getByRole("button", { name: "Resume landing motion" }).click();
    await expect(energy).toHaveAttribute("data-energy", "running");
    await control.press("Space"); await expect(energy).toHaveAttribute("data-pulsing", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(energy).toHaveAttribute("data-energy", "still");
    await expect(control).toBeHidden();
    await expect.poll(() => energy.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(energy).not.toHaveAttribute("data-pulsing");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(energy).toHaveAttribute("data-energy", "running");
  });
}

test("ambient hero motion stops offscreen, in a hidden page and on pagehide; resumes only when allowed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
  const energy = page.locator(".hero-energy");
  await expect(energy).toHaveAttribute("data-energy", "running");
  await expect.poll(() => energy.evaluate(node => node.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect(energy).toHaveAttribute("data-energy", "still");
  await expect.poll(() => energy.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(energy).toHaveAttribute("data-energy", "running");
  // Synthetic page lifecycle states, not a claim about physical-device suspension.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(energy).toHaveAttribute("data-energy", "still");
  await expect.poll(() => energy.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await page.evaluate(() => { Reflect.deleteProperty(document, "hidden"); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(energy).toHaveAttribute("data-energy", "running");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(energy).toHaveAttribute("data-energy", "still");
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(energy).toHaveAttribute("data-energy", "running");
  await page.addStyleTag({ content: "html{font-size:200%}" });
  await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-layout", "flow");
  await expect(energy).toHaveAttribute("data-energy", "still");
  await expect.poll(() => energy.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
});

test("touch can send a pulse without tracking or preventing touch movement", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage(); await page.goto("/");
    const energy = page.locator(".hero-energy");
    await expect(energy).toHaveAttribute("data-energy", "running");
    await page.getByRole("button", { name: "Send a pulse" }).tap();
    await expect(energy).toHaveAttribute("data-pulsing", "true");
    const prevented = await page.locator(".kinetic-hero").evaluate(node => {
      const event = new PointerEvent("pointermove", { pointerType: "touch", clientX: 24, clientY: 180, bubbles: true, cancelable: true });
      node.dispatchEvent(event); return event.defaultPrevented;
    });
    expect(prevented).toBe(false);
    expect(await energy.evaluate(node => (node as HTMLElement).style.getPropertyValue("--hero-x"))).toBe("");
  } finally { await context.close(); }
});

test("hero interaction listeners clean up on navigation and do not multiply after pause/resume", async ({ page }) => {
  await page.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener; const remove = EventTarget.prototype.removeEventListener;
    const listeners = new Map<EventListenerOrEventListenerObject, { type: string; passive: boolean }>();
    Object.assign(window, { heroListenerProbe: listeners });
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (listener && ((this instanceof HTMLElement && this.classList.contains("kinetic-hero") && ["pointermove", "pointerleave", "pointercancel"].includes(type)) || (this === window && ["pagehide", "pageshow"].includes(type)))) listeners.set(listener, { type, passive: typeof options === "object" && options.passive === true });
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (listener && listeners.get(listener)?.type === type) listeners.delete(listener);
      return remove.call(this, type, listener, options);
    };
  });
  const registrations = () => page.evaluate(() => [...(window as unknown as { heroListenerProbe: Map<unknown, { type: string; passive: boolean }> }).heroListenerProbe.values()]);
  const heroRegistrations = () => registrations().then(items => items.filter(item => item.type.startsWith("pointer")));
  await page.goto("/"); await expect(page.locator(".hero-energy")).toHaveAttribute("data-energy", "running");
  // pointerleave and pointercancel intentionally share one callback; the probe map keeps the final registration.
  const before = await heroRegistrations(); expect(before).toHaveLength(2);
  expect(before.every(item => item.passive)).toBe(true);
  const allBefore = await registrations();
  await page.getByRole("button", { name: "Pause landing motion" }).click();
  await page.getByRole("button", { name: "Resume landing motion" }).click();
  expect(await registrations()).toEqual(allBefore);
  await page.getByRole("link", { name: "Explore the home hub", exact: true }).first().click();
  await expect(page).toHaveURL(/\/home$/); await expect.poll(heroRegistrations).toEqual([]);
});

test("missing visibility observation keeps a safe static vector fallback", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: undefined }); });
  await page.goto("/");
  await expect(page.locator(".hero-energy-svg")).toBeVisible();
  await expect(page.locator(".hero-energy")).toHaveAttribute("data-energy", "still");
  await expect(page.getByRole("button", { name: "Send a pulse" })).toBeDisabled();
  expect(await page.locator(".hero-energy").evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
});
