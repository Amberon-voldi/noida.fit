import { test, expect, type Page } from "@playwright/test";

const front = (page: Page) => page.locator('.hero-card[data-pos="0"]');
const focusableCards = (page: Page) => page.locator(".hero-card:not([inert])");

for (const width of [320, 390, 768, 1440]) {
  test(`hero deck tilts with the pointer, shuffles by click and keyboard, and stops for pause/reduced motion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/");
    // At narrow widths the cookie notice covers the top of the hero, where the pointer is moved.
    const notice = page.getByRole("button", { name: "Got it", exact: true });
    if (await notice.isVisible()) await notice.click();
    const deck = page.locator(".hero-deck");
    const next = page.getByRole("button", { name: "Next move", exact: true });
    await expect(deck).toHaveAttribute("data-tilt", "running");
    await expect(next).toBeEnabled();
    await expect(page.locator(".hero-vector-backdrop")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".kinetic-hero-art img, canvas")).toHaveCount(0);
    await expect(focusableCards(page)).toHaveCount(1);
    await expect(front(page)).toHaveAttribute("data-deck-label", "RUN");
    await page.mouse.move(width - 24, 160);
    await expect.poll(() => deck.evaluate(node => parseFloat((node as HTMLElement).style.getPropertyValue("--hero-x")))).toBeGreaterThan(5);
    const pose = await deck.evaluate(node => ["--hero-x", "--hero-y", "--hero-roll"].map(name => parseFloat((node as HTMLElement).style.getPropertyValue(name))));
    expect(Math.abs(pose[0])).toBeLessThanOrEqual(18);
    expect(Math.abs(pose[1])).toBeLessThanOrEqual(14);
    expect(Math.abs(pose[2])).toBeLessThanOrEqual(5);

    await next.click();
    await expect(front(page)).toHaveAttribute("data-deck-label", "RIDE");
    await expect(focusableCards(page)).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Explore cycling", exact: true })).toHaveAttribute("href", "/activities/cycling");
    await expect(page.getByRole("link", { name: "Explore running", exact: true })).toHaveCount(0);
    await expect(deck.getByRole("status")).toHaveText("RIDE — 2 of 5");
    await next.focus(); await next.press("Enter");
    await expect(front(page)).toHaveAttribute("data-deck-label", "LIFT");
    await expect.poll(() => deck.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);

    await page.getByRole("button", { name: "Pause landing motion" }).click();
    await expect(deck).toHaveAttribute("data-tilt", "still");
    await page.mouse.move(24, 180);
    expect(await deck.evaluate(node => (node as HTMLElement).style.getPropertyValue("--hero-x"))).toBe("");
    expect(await page.locator(".hero-deck-plane").evaluate(node => getComputedStyle(node).transform)).toBe("none");
    // The shuffle is content, not decoration: it still works while motion is paused, without animating.
    await next.press("Space");
    await expect(front(page)).toHaveAttribute("data-deck-label", "FLOW");
    expect(await deck.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => !(animation instanceof CSSTransition)).length)).toBe(0);
    await page.getByRole("button", { name: "Resume landing motion" }).click();
    await expect(deck).toHaveAttribute("data-tilt", "running");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(deck).toHaveAttribute("data-tilt", "still");
    await next.click();
    await expect(front(page)).toHaveAttribute("data-deck-label", "PLAY");
    await expect.poll(() => deck.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
    await next.click();
    await expect(front(page)).toHaveAttribute("data-deck-label", "RUN");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(deck).toHaveAttribute("data-tilt", "running");
  });
}

test("hero tilt stops offscreen, in a hidden page and on pagehide; resumes only when allowed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
  const deck = page.locator(".hero-deck");
  await expect(deck).toHaveAttribute("data-tilt", "running");
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect(deck).toHaveAttribute("data-tilt", "still");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(deck).toHaveAttribute("data-tilt", "running");
  // Synthetic page lifecycle states, not a claim about physical-device suspension.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(deck).toHaveAttribute("data-tilt", "still");
  await page.evaluate(() => { Reflect.deleteProperty(document, "hidden"); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(deck).toHaveAttribute("data-tilt", "running");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(deck).toHaveAttribute("data-tilt", "still");
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(deck).toHaveAttribute("data-tilt", "running");
  await page.addStyleTag({ content: "html{font-size:200%}" });
  await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-layout", "flow");
  await expect(deck).toHaveAttribute("data-tilt", "still");
});

test("touch can shuffle the deck without tracking or preventing touch movement", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage(); await page.goto("/");
    const deck = page.locator(".hero-deck");
    await expect(deck).toHaveAttribute("data-tilt", "running");
    await page.getByRole("button", { name: "Next move" }).tap();
    await expect(front(page)).toHaveAttribute("data-deck-label", "RIDE");
    const prevented = await page.locator(".kinetic-hero").evaluate(node => {
      const event = new PointerEvent("pointermove", { pointerType: "touch", clientX: 24, clientY: 180, bubbles: true, cancelable: true });
      node.dispatchEvent(event); return event.defaultPrevented;
    });
    expect(prevented).toBe(false);
    expect(await deck.evaluate(node => (node as HTMLElement).style.getPropertyValue("--hero-x"))).toBe("");
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
  await page.goto("/"); await expect(page.locator(".hero-deck")).toHaveAttribute("data-tilt", "running");
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

test("missing visibility observation keeps a static deck that still shuffles", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: undefined }); });
  await page.goto("/");
  await expect(front(page)).toBeVisible();
  await expect(page.locator(".hero-deck")).toHaveAttribute("data-tilt", "still");
  await page.getByRole("button", { name: "Next move" }).click();
  await expect(front(page)).toHaveAttribute("data-deck-label", "RIDE");
  expect(await page.locator(".hero-deck").evaluate(node => node.getAnimations({ subtree: true }).filter(animation => !(animation instanceof CSSTransition)).length)).toBe(0);
});
