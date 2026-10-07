import { test, expect, type Page } from "@playwright/test";

async function scrollProgress(page: Page, selector: string, progress: number) {
  await page.locator(selector).evaluate((node, progress) => {
    const rect = node.getBoundingClientRect();
    const root = node.closest(".kinetic-landing")!;
    const offset = parseFloat(getComputedStyle(root).getPropertyValue("--scene-top"));
    const y = scrollY + rect.top - offset + (rect.height - innerHeight + offset) * progress;
    window.scrollTo({ top: y, behavior: "instant" });
  }, progress);
}
const value = (page: Page, selector: string, property: string) => page.locator(selector).evaluate((node, property) => parseFloat((node as HTMLElement).style.getPropertyValue(property)), property);

for (const width of [320, 390, 768, 1440]) {
  test(`kinetic landing is readable, motion-led and leads into /home at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto("/"); expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("GO TOGETHER.");
    expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).pathname).toBe("/");
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "active");
    await expect(page.getByRole("link", { name: "Explore the home hub", exact: true }).first()).toHaveAttribute("href", "/home");
    await expect(page.getByRole("search")).toHaveCount(0);
    await expect(page.locator(".app-topbar, .kinetic-hero-top, .kinetic-coordinate")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
    await expect(page.locator(".kinetic-hero")).not.toContainText("Noida / Greater Noida");
    await expect(page.locator(".kinetic-hero")).not.toContainText("A city. A shared rhythm.");
    await expect(page.getByRole("navigation", { name: "Quick navigation" })).toHaveCount(0);
    await expect(page.locator(".home-hub, .base-card, .intro-hero")).toHaveCount(0);
    await expect(page.locator(".kinetic-steps > li")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Pause landing motion" })).toBeVisible();
    await expect.poll(() => page.locator(".kinetic-hero-image img").evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator(".kinetic-hero-credit")).toContainText("Illustrative");
    for (const selector of [".kinetic-hero", "#community-scene", "#fitness-id", "#how-it-works", ".kinetic-finale"]) {
      if (selector === "#community-scene" || selector === "#fitness-id") await scrollProgress(page, selector, .5);
      else await page.locator(selector).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await expect.poll(() => page.locator(".kinetic-community-image img").evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator(".kinetic-community-image img")).toHaveAttribute("alt", /illustrative party photograph/);
    await expect(page.locator(".kinetic-community-image figcaption")).toContainText("not a NOIDA.FIT event");
    await expect(page.locator(".kinetic-story-art")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".kinetic-id-figure figcaption")).toContainText("Not a real member");
    await expect(page.locator(".sample-id-perspective")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".sample-id-perspective button, .sample-id-perspective a, .sample-id-perspective canvas")).toHaveCount(0);
    for (const control of await page.locator(".kinetic-landing a, .kinetic-motion-toggle").all()) {
      const box = (await control.boundingBox())!; expect(Math.round(box.width * 1000) / 1000).toBeGreaterThanOrEqual(44); expect(Math.round(box.height * 1000) / 1000).toBeGreaterThanOrEqual(44);
    }
    if (process.env.E2E_LANDING_SCREENSHOTS) {
      await scrollProgress(page, "#fitness-id", .25);
      await expect.poll(async () => Math.abs(await value(page, "#fitness-id", "--id-rotation"))).toBeLessThan(1);
      await page.screenshot({ path: `/tmp/noidafit-kinetic-card-${width}.png` });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: `/tmp/noidafit-kinetic-hero-${width}.png` });
    }
    await page.getByRole("link", { name: "Explore the home hub", exact: true }).first().click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { name: "Welcome.", exact: true })).toBeVisible();
    await expect(page.locator(".kinetic-landing, .kinetic-motion-toggle")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`parallax, sliding curtains and Fitness ID spin track scroll and reverse at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/");
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "active");
    await expect.poll(async () => Number.isFinite(await value(page, ".kinetic-hero-image", "--depth-shift"))).toBe(true);
    const before = await value(page, ".kinetic-hero-image", "--depth-shift");
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: "instant" }));
    await expect.poll(async () => Math.abs((await value(page, ".kinetic-hero-image", "--depth-shift")) - before)).toBeGreaterThan(2);
    await scrollProgress(page, "#community-scene", .05);
    await expect.poll(async () => await value(page, "#community-scene", "--curtain-open")).toBeLessThan(.1);
    const closed = await page.locator(".kinetic-curtain-left").evaluate(node => getComputedStyle(node).transform);
    await scrollProgress(page, "#community-scene", .8);
    await expect.poll(async () => await value(page, "#community-scene", "--curtain-open")).toBe(1);
    expect(await page.locator(".kinetic-curtain-left").evaluate(node => getComputedStyle(node).transform)).not.toBe(closed);
    expect(await page.locator(".kinetic-community-image figcaption").evaluate(node => {
      const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x + 8, rect.y + 8));
    })).toBe(true); // Provenance must paint above the shade, not inside the scaled-photo stacking context.
    await scrollProgress(page, "#fitness-id", .05);
    await expect.poll(async () => await value(page, "#fitness-id", "--id-reveal")).toBeLessThan(.3);
    await scrollProgress(page, "#fitness-id", .25);
    await expect.poll(async () => await value(page, "#fitness-id", "--id-reveal")).toBe(1);
    const front = await page.locator(".sample-id-spin").evaluate(node => getComputedStyle(node).transform);
    await scrollProgress(page, "#fitness-id", .55);
    await expect.poll(async () => await value(page, "#fitness-id", "--id-rotation")).toBeGreaterThan(170);
    expect(await page.locator(".sample-id-spin").evaluate(node => getComputedStyle(node).transform)).not.toBe(front);
    await scrollProgress(page, "#fitness-id", .95);
    await expect.poll(async () => await value(page, "#fitness-id", "--id-rotation")).toBe(360);
    await expect.poll(async () => await value(page, "#fitness-id", "--id-handoff")).toBeGreaterThan(.85);
    await scrollProgress(page, "#fitness-id", .25);
    await expect.poll(async () => Math.abs(await value(page, "#fitness-id", "--id-rotation"))).toBeLessThan(1);
    await page.getByRole("button", { name: "Pause landing motion" }).click();
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "paused");
    await expect(page.getByRole("button", { name: "Resume landing motion" })).toHaveAttribute("aria-pressed", "true");
    expect(await page.locator(".sample-id-spin").evaluate(node => getComputedStyle(node).transform)).toBe("none");
    await expect(page.locator(".kinetic-curtain-left")).toBeHidden();
    await page.getByRole("button", { name: "Resume landing motion" }).click();
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "active");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "reduced");
    await expect(page.getByRole("button", { name: /landing motion/ })).toBeHidden();
    expect(await page.locator(".sample-id-spin").evaluate(node => getComputedStyle(node).transform)).toBe("none");
    expect(await page.locator(".sample-id-back").evaluate(node => getComputedStyle(node).transform)).toBe("matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)");
  });
}

for (const width of [390, 1440]) {
  test(`story wheel settles and cards fly into place with native scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/");
    const position = async (selector: string, viewportY: number) => page.locator(selector).evaluate((node, y) => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top - y, behavior: "instant" }), viewportY);
    await position("#how-it-works", 740);
    await expect.poll(() => value(page, "#how-it-works", "--story-wheel-rotation")).toBeLessThan(-250);
    const arrivingWheel = await page.locator(".kinetic-story-loop").evaluate(node => getComputedStyle(node).transform);
    await position("#how-it-works", 50);
    await expect.poll(() => value(page, "#how-it-works", "--story-wheel-rotation")).toBe(0);
    expect(await page.locator(".kinetic-story-loop").evaluate(node => getComputedStyle(node).transform)).not.toBe(arrivingWheel);
    const card = '.kinetic-steps > li[data-journey-card="0"]';
    await position(card, 774);
    await expect.poll(() => value(page, card, "--fly-progress")).toBeLessThan(.5);
    const arrivingCard = await page.locator(`${card} .kinetic-step-card`).evaluate(node => getComputedStyle(node).transform);
    await position(card, 260);
    await expect.poll(() => value(page, card, "--fly-progress")).toBe(1);
    expect(await page.locator(`${card} .kinetic-step-card`).evaluate(node => getComputedStyle(node).transform)).not.toBe(arrivingCard);
    await position(card, 774);
    await page.locator(card).getByRole("link").focus();
    // Native focus scrolling settles on the next paint; inspect the final hit-test position.
    await expect.poll(() => page.locator(card).getByRole("link").evaluate(node => {
      const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
    expect(await page.locator(`${card} .kinetic-step-card`).evaluate(node => getComputedStyle(node).transform)).toBe("none");
    expect(await page.locator(`${card} .kinetic-step-card`).evaluate(node => getComputedStyle(node).opacity)).toBe("1");
    await page.getByRole("button", { name: "Pause landing motion" }).click();
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "paused");
    expect(await page.locator(".kinetic-story-loop").evaluate(node => getComputedStyle(node).transform)).toBe("none");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "reduced");
    for (const node of await page.locator(".kinetic-step-card, .kinetic-story-art, .kinetic-story-loop").all()) expect(await node.evaluate(node => getComputedStyle(node).transform)).toBe("none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("curtains never obscure a focused link and the story keeps the operator-scanned check-in flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 }); await page.goto("/");
  await scrollProgress(page, "#community-scene", .05);
  const action = page.getByRole("link", { name: "Meet the communities", exact: true }); await action.focus();
  await expect(action).toBeFocused();
  await expect.poll(async () => await value(page, "#community-scene", "--curtain-open")).toBe(1);
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await expect(page.locator("#how-it-works")).toBeInViewport();
  await expect(page.getByRole("heading", { name: "Show up. Show your QR.", exact: true })).toBeVisible();
  await expect(page.locator(".kinetic-steps")).toContainText("assigned club or venue operator");
  await expect(page.locator(".kinetic-steps")).toContainText("private movement passport");
  await expect(page.getByRole("link", { name: "Create your account", exact: true })).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "For community & venue organizers", exact: true })).toHaveAttribute("href", "/for-organizers");
});

for (const width of [320, 390, 768, 1440]) {
  test(`kinetic landing keeps static content readable at 200% text and reduced motion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/");
    await page.addStyleTag({ content: "html{font-size:200%}" });
    const action = page.getByRole("link", { name: "Explore the home hub", exact: true }).first();
    await action.focus(); await expect(action).toBeFocused(); await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Find a community", exact: true })).toBeFocused();
    for (const section of await page.locator(".kinetic-landing section").all()) {
      await section.scrollIntoViewIfNeeded(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    for (const curtain of await page.locator(".kinetic-curtain, .kinetic-id-curtain").all()) await expect(curtain).toBeHidden();
    expect(await page.locator(".sample-id-spin").evaluate(node => getComputedStyle(node).transform)).toBe("none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-layout", "flow");
    expect(await page.locator(".sample-id-spin").evaluate(node => getComputedStyle(node).transform)).toBe("none");
  });
}

test("on-scroll reveals are bounded and stop for reduced motion", async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    const records: { duration: number; delay: number }[] = []; Object.assign(window, { landingReveals: records });
    Element.prototype.animate = function (frames, options) {
      if (this.hasAttribute("data-scroll-reveal") && typeof options === "object") records.push({ duration: Number(options.duration), delay: Number(options.delay ?? 0) });
      return animate.call(this, frames, options);
    };
  });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => (window as unknown as { landingReveals: unknown[] }).landingReveals.length)).toBeGreaterThan(1);
  expect(await page.evaluate(() => (window as unknown as { landingReveals: { duration: number; delay: number }[] }).landingReveals.every(item => item.duration + item.delay <= 400))).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.reload();
  expect(await page.evaluate(() => (window as unknown as { landingReveals: unknown[] }).landingReveals)).toEqual([]);
});

test("kinetic landing and the card preview stay readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 }, baseURL });
  try {
    const page = await context.newPage(); await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("GO TOGETHER.");
    await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "static");
    await page.locator("#fitness-id").scrollIntoViewIfNeeded();
    await expect(page.locator(".kinetic-id-figure figcaption")).toBeVisible();
    await expect(page.locator(".kinetic-curtain-left")).toBeHidden();
    await page.getByRole("link", { name: "How it works", exact: true }).click(); await expect(page.locator("#how-it-works")).toBeInViewport();
    await expect(page.locator(".kinetic-steps")).toContainText("confirmed RSVP");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});

test("short viewports use static flow rather than cropped sticky scenes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 560 }); await page.goto("/");
  await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-layout", "flow");
  expect(await page.locator(".kinetic-id-pin").evaluate(node => getComputedStyle(node).position)).not.toBe("sticky");
  await page.locator("#fitness-id").scrollIntoViewIfNeeded();
  expect(await page.locator(".sample-id-spin").evaluate(node => getComputedStyle(node).transform)).toBe("none");
  await expect(page.locator(".kinetic-id-figure figcaption")).toBeVisible();
  await expect(page.locator(".kinetic-curtain-left")).toBeHidden();
});

test("native scroll handlers stay passive, do not run an idle loop, and clean up on navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const listeners = new Map<EventListenerOrEventListenerObject, { type: string; passive: boolean }>();
    const probe = { listeners, frames: 0 }; Object.assign(window, { landingProbe: probe });
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this === window && listener && ["scroll", "wheel", "touchmove"].includes(type)) listeners.set(listener, { type, passive: typeof options === "object" && options.passive === true });
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (this === window && listener && listeners.get(listener)?.type === type) listeners.delete(listener);
      return remove.call(this, type, listener, options);
    };
    const frame = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => { probe.frames++; return frame.call(window, callback); };
  });
  const registrations = () => page.evaluate(() => [...(window as unknown as { landingProbe: { listeners: Map<unknown, { type: string; passive: boolean }> } }).landingProbe.listeners.values()]);
  await page.goto("/"); await expect(page.locator(".kinetic-landing")).toHaveAttribute("data-motion", "active");
  expect(await registrations()).toEqual([{ type: "scroll", passive: true }]);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  await page.evaluate(() => { (window as unknown as { landingProbe: { frames: number } }).landingProbe.frames = 0; });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { landingProbe: { frames: number } }).landingProbe.frames)).toBe(0);
  await page.getByRole("button", { name: "Pause landing motion" }).click();
  await page.getByRole("button", { name: "Resume landing motion" }).click();
  expect(await registrations()).toEqual([{ type: "scroll", passive: true }]);
  await page.getByRole("link", { name: "Explore the home hub", exact: true }).first().click();
  await expect(page).toHaveURL(/\/home$/); await expect.poll(registrations).toEqual([]);
});

test("server-rendered landing contains the primary journey, safe preview and WebSite structured data", async ({ request }) => {
  const response = await request.get("/"); expect(response.status()).toBe(200); const html = await response.text();
  for (const text of ["TOGETHER.", "/home", "/communities", "participant check-in QR", "private movement passport", "WebSite", "Design preview", "QR placeholder"]) expect(html).toContain(text);
});
