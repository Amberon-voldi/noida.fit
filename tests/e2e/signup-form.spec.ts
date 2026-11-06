import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Real form and request body, synthetic API response. Does not contact Appwrite.
let script: string, stylesheet: string;
test.beforeAll(async () => {
  const output = await build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
    import { SignupForm } from './components/auth/SignupForm';
    window.navigations = [];
    const router = { push(){}, prefetch(){}, back(){}, forward(){}, refresh(){}, replace(href){ window.navigations.push(href); } };
    createRoot(document.getElementById('fixture')).render(React.createElement(AppRouterContext.Provider, { value: router }, React.createElement(SignupForm, { callbackUrl: '/events' })));
  ` }, bundle: true, write: false, outfile: "signup-fixture.js", platform: "browser", format: "iife", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' } });
  script = output.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet = (await postcss([tailwindcss()]).process(readFileSync("app/globals.css", "utf8"), { from: join(process.cwd(), "app/globals.css") })).css;
});

test("signup asks only for name, email and password and lets the server pick the username", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", route => route.request().isNavigationRequest() ? route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><main id="fixture" style="max-width:420px;margin:auto;padding:24px 16px"></main>` }) : route.abort());
  await page.goto("https://fixture.invalid/signup");
  await page.addScriptTag({ content: script });
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/auth/signup", async route => { bodies.push(route.request().postDataJSON()); await route.fulfill({ json: { ok: true, redirectTo: "/events" } }); });

  await expect(page.getByLabel("Your name")).toBeFocused();
  await expect(page.getByLabel("Username")).toHaveCount(0);
  await expect(page.getByText("You can change it any time in Settings.")).toBeVisible();
  await page.getByLabel("Your name").fill("Rahul Sharma");
  await page.getByLabel("Email").fill("rahul@example.test");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("runfast123");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByLabel("I agree to the Terms and Conditions").check();
  await page.getByLabel(/I have read and agree to the Privacy Policy/).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/signup.png` });
  await page.getByRole("button", { name: "Create .fit ID" }).click();

  await expect.poll(() => page.evaluate(() => (window as unknown as { navigations: string[] }).navigations)).toEqual(["/events"]);
  expect(bodies).toEqual([{ name: "Rahul Sharma", email: "rahul@example.test", password: "runfast123", acceptTerms: true, acceptPrivacy: true, callbackUrl: "/events" }]);
});
