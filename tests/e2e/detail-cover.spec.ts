import { test, expect } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The real compiled stylesheet and the cover classes used by the event, club and place pages.
let stylesheet: string;
test.beforeAll(async () => {
  stylesheet = (await postcss([tailwindcss()]).process(readFileSync("app/globals.css", "utf8"), { from: join(process.cwd(), "app/globals.css") })).css;
});
const covers = { event: "aspect-[16/9] sm:aspect-[16/7]", club: "aspect-[16/7] sm:aspect-[3/1]" };

for (const width of [320, 390, 430, 600, 767, 1024]) {
  test(`detail page banners fill the full content width at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><div class="mx-auto max-w-7xl px-4"><header class="detail-header">${Object.entries(covers).map(([id, ratio]) => `<div id="${id}"><div class="detail-cover relative mb-7 ${ratio} overflow-hidden rounded-2xl border border-border-subtle"></div></div>`).join("")}</header></div>` }));
    await page.goto("https://fixture.invalid/");
    for (const id of Object.keys(covers)) {
      const [cover, column] = await page.evaluate(id => [`#${id} .detail-cover`, `#${id}`].map(selector => document.querySelector(selector)!.getBoundingClientRect().width), id);
      expect(Math.round(cover), id).toBe(Math.round(column));
    }
    if (width < 768) expect((await page.locator("#event .detail-cover").boundingBox())!.height).toBeLessThanOrEqual(180);
  });
}
