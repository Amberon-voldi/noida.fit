import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  // Auth and check-in secrets must not end up in traces, recordings or screenshots.
  use: { baseURL: process.env.E2E_BASE_URL || "http://localhost:3000", actionTimeout: 20_000, navigationTimeout: 40_000, trace: "off", screenshot: "off", video: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
