import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { FitnessProfile } from "../../types/user";

// Render the real card with production CSS and synthetic props. No account,
// session, database fixture, or production profile is needed to check 3D faces.
let fixtureScript: string;
let stylesheet: string;
test.beforeAll(async () => {
  const cssDirectory = join(process.cwd(), ".next/static/chunks");
  stylesheet = readdirSync(cssDirectory).filter(file => file.endsWith(".css"))
    .map(file => readFileSync(join(cssDirectory, file), "utf8")).join("\n");
  const result = await build({
    stdin: {
      contents: `import React from "react";
        import { createRoot } from "react-dom/client";
        import { FitnessCard } from "./components/cards/FitnessCard";
        window.renderCard = (profile) => createRoot(document.getElementById("card-fixture"))
          .render(React.createElement(FitnessCard, {user: profile}));`,
      loader: "tsx", resolveDir: process.cwd(),
    },
    bundle: true, write: false, platform: "browser", format: "iife",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SITE_URL": '"https://noida.fit"' },
  });
  fixtureScript = result.outputFiles[0].text;
});

for (const width of [320, 390, 1024]) {
  for (const reduced of [false, true]) {
    test(`Fitness ID back stays upright at ${width}px${reduced ? " with reduced motion" : ""}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      // Logo loading is not part of this orientation check; never reach an external origin.
      await page.route("**/*", route => route.abort());
      await page.setContent(`<style>${stylesheet}</style><main style="padding:16px"><div id="card-fixture" style="max-width:512px;margin:auto"></div></main>`);
      await page.addScriptTag({ content: fixtureScript });
      const profile: FitnessProfile = {
        id: "NF-SYNTHETIC", cardNumber: "NF-SYNTHETIC", name: "Synthetic Card Member", slug: "synthetic-member", handle: "@synthetic-member",
        joinedAt: "2026-09-01T00:00:00Z", city: "Noida", visibility: "public", showActivity: true, showCommunities: false,
        communityMemberships: [], stats: { verifiedActivities: 1, eventsAttended: 1, communitiesJoined: 0, streakWeeks: 1 },
      };
      await page.evaluate(profile => {
        (window as unknown as { renderCard: (profile: FitnessProfile) => void }).renderCard(profile);
      }, profile);
      const card = page.getByRole("button", { name: /^Fitness ID for/ });
      const back = page.locator(".fitness-card-back");
      const front = page.locator(".fitness-card-front");
      await expect(card).toHaveAttribute("aria-pressed", "false");
      await expect(back).toHaveAttribute("aria-hidden", "true");
      expect(await back.evaluate(node => getComputedStyle(node).backfaceVisibility)).toBe("hidden");
      expect(await back.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m11)).toBeCloseTo(-1);
      await card.focus();
      await page.keyboard.press("Enter");
      await expect(card).toHaveAttribute("aria-pressed", "true");
      await expect(front).toHaveAttribute("aria-hidden", "true");
      await expect(back).toHaveAttribute("aria-hidden", "false");
      // Parent 180° × back-face 180° = an upright 360°. This fails when the
      // face transform is removed, even though the React state still toggles.
      await expect.poll(() => back.evaluate(node => {
        const parent = new DOMMatrix(getComputedStyle(node.parentElement!).transform);
        const face = new DOMMatrix(getComputedStyle(node).transform);
        const composed = parent.multiply(face);
        return Math.abs(composed.m11 - 1) + Math.abs(composed.m22 - 1) + Math.abs(composed.m33 - 1);
      })).toBeLessThan(0.001);
      await expect(page.getByRole("img", { name: "QR code for @synthetic-member" })).toBeVisible();
      await expect(back).toContainText("Scan to open profile");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: /^Flip ID/ }).click();
      await expect(card).toHaveAttribute("aria-pressed", "false");
      await expect(front).toHaveAttribute("aria-hidden", "false");
      await expect(back).toHaveAttribute("aria-hidden", "true");
      expect(errors).toEqual([]);
    });
  }
}
