import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { AdminDashboardData } from "../../types/admin";

// Real presentation + synthetic authorized data. Does not prove hosted admin login or Appwrite ACLs.
let script: string;
let stylesheet: string;
test.beforeAll(async () => {
  const directory = join(process.cwd(), ".next/static/chunks");
  stylesheet = readdirSync(directory).filter(file => file.endsWith(".css")).map(file => readFileSync(join(directory, file), "utf8")).join("\n");
  const result = await build({
    stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
      import React from 'react'; import { createRoot } from 'react-dom/client';
      import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
      import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
      import { AdminNav } from './components/admin/AdminNav';
      import { AdminDashboard } from './components/admin/AdminDashboard';
      import { AdminContentManager } from './components/admin/AdminContentManager';
      import { AdminMembers } from './components/admin/AdminMembers';
      import { AdminAttendance } from './components/admin/AdminAttendance';
      import './components/admin/admin.css';
      const components = {overview: AdminDashboard, content: AdminContentManager, members: AdminMembers, attendance: AdminAttendance};
      const root = createRoot(document.getElementById('fixture'));
      const router = {push(){}, replace(){}, prefetch(){}, back(){}, forward(){}, refresh(){}};
      window.renderAdmin = (mode, props) => {
        const {pathname = '/admin', ...componentProps} = props;
        root.render(React.createElement(AppRouterContext.Provider,{value:router},
          React.createElement(PathnameContext.Provider,{value:pathname},
            React.createElement('div',{className:'admin-shell'},React.createElement(AdminNav),
              React.createElement('main',{className:'admin-workspace'},React.createElement(components[mode],componentProps))))));
      };
    ` }, bundle: true, write: false, outfile: "admin-fixture.js", platform: "browser", format: "iife", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  });
  script = result.outputFiles.find(file => file.path.endsWith(".js"))!.text;
  stylesheet += result.outputFiles.find(file => file.path.endsWith(".css"))!.text;
});
function overview(): AdminDashboardData {
  const count = { total: 1, published: 1, draft: 0, cancelled: 0, demo: 0 };
  return { generatedAt: "2026-09-30T00:00:00Z", configuration: { ready: true, endpointOrigin: "https://appwrite.test", projectId: "synthetic", databaseId: "synthetic", missing: [], apiKeyPresent: true, checkInSecretPresent: true, siteUrlPresent: true }, users: { total: 1, profiles: 1, publicProfiles: 0, privateProfiles: 1, activitySharing: 0, communitySharing: 0 }, content: { activities: count, communities: count, places: count, events: count }, entries: { activities: [], communities: [], places: [], events: [] }, participation: { confirmedRsvps: 1, cancelledRsvps: 0, waitlistedRsvps: 0, checkins: 1, verifiedParticipations: 1, pendingParticipations: 0, activeMemberships: 1, savedItems: 1 }, operational: { upcomingEvents: 1, pastEvents: 0, cancelledEvents: 0, assignedEvents: 1, unassignedPublishedEvents: 0, verifiedCommunities: 1, demoListings: 0 }, audit: { configured: true, readable: true, entries: [] } };
}
async function mount(page: Page, mode: string, props: unknown) {
  await page.route("**/*", async route => {
    if (route.request().isNavigationRequest()) return route.fulfill({ contentType: "text/html", body: `<style>${stylesheet}</style><div id="fixture"></div>` });
    return route.abort();
  });
  await page.goto("https://fixture.invalid/admin"); await page.addScriptTag({ content: script });
  await page.evaluate(({ mode, props }) => (window as unknown as { renderAdmin: (mode: string, props: unknown) => void }).renderAdmin(mode, props), { mode, props });
}

for (const width of [320, 390, 768, 1440]) {
  test(`admin overview and complete guide link remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(page, "overview", { data: overview() });
    await expect(page.getByRole("heading", { name: "Admin dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Complete admin guide", exact: true })).toHaveAttribute("href", "/admin/guide");
    await expect(page.getByRole("link", { name: "Manage Events" })).toHaveAttribute("href", "/admin/content/events");
    for (const section of await page.locator("section[aria-labelledby]").all()) {
      expect(await section.evaluate(node => Boolean(document.getElementById(node.getAttribute("aria-labelledby")!)))).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("content editor sends an audited explicit update, filters records and shows stale-save failures", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const record = { id: "activity", name: "Synthetic activity", slug: "synthetic-activity", description: "A synthetic activity for the admin fixture.", emoji: "↗", status: "draft", demo: true };
  await mount(page, "content", { kind: "activities", initialRecords: [{ id: "activity", updatedAt: "version-one", record }], template: record, writesEnabled: true });
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/admin/content/activities", async route => {
    const body = route.request().postDataJSON(); writes.push(body);
    if (writes.length > 1) return route.fulfill({ status: 409, json: { error: "This record changed; reload it before saving" } });
    return route.fulfill({ json: { record: { id: "activity", updatedAt: "version-two", record: body.record } } });
  });
  await page.getByRole("button", { name: "Edit Synthetic activity" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel("Name", { exact: true }).fill("Edited activity");
  await page.getByLabel("Mutation reason", { exact: false }).fill("Review and publish synthetic fixture");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  expect(writes[0].expectedUpdatedAt).toBe("version-one");
  expect((writes[0].record as Record<string, unknown>).name).toBe("Edited activity");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("reload it");
  await page.getByLabel("Search", { exact: true }).fill("no-match");
  await expect(page.getByText("No records match these filters.")).toBeVisible();
});

test("member controls require typed confirmation and attendance recovery never offers invented check-in", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page, "members", { writesEnabled: true });
  await page.route("**/api/admin/members**", route => route.fulfill({ json: { total: 1, members: [{ id: "member-test", name: "Synthetic Member", enabled: true, admin: false, joinedAt: "2026-09-01T00:00:00Z", emailVerified: false }] } }));
  await page.getByRole("button", { name: "Search members" }).click();
  await page.getByRole("button", { name: "Suspend account", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm audited action" })).toBeDisabled();
  await page.getByLabel("Operational reason").fill("Verified support case");
  await page.getByLabel("Type account ID:", { exact: false }).fill("member-test");
  await expect(page.getByRole("button", { name: "Confirm audited action" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => (window as unknown as { renderAdmin: (mode: string, props: unknown) => void }).renderAdmin("attendance", { events: [{ id: "event", title: "Synthetic event", status: "published" }], writesEnabled: true }));
  await page.route("**/api/admin/attendance**", route => route.fulfill({ json: { event: { id: "event", title: "Synthetic event", status: "published" }, total: 1, confirmed: 1, checkins: 0, needsRepair: 0, entries: [{ userId: "member", displayName: "Synthetic attendee", confirmed: true, verified: false }] } }));
  await page.getByRole("button", { name: "Load attendance" }).click();
  await expect(page.getByRole("button", { name: "Repair derived record" })).toBeDisabled();
  await expect(page.getByText("No attendance", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: /Mark.*checked in/i })).toHaveCount(0);
});

for (const width of [320, 390, 768, 1440]) {
  test(`compact admin preserves expanded details and navigation at ${width}px with enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const data = overview();
    data.entries.activities = [{ id: "fixture-run", label: "Synthetic running record", slug: "fixture-run", status: "draft", demo: true }];
    data.entries.events = Array.from({ length: 6 }, (_, index) => ({ id: `event-${index}`, label: `Synthetic event ${index}`, title: `Synthetic event ${index}`, slug: `event-${index}`, status: "published", demo: true, date: "2026-09-30", organizerAssigned: false, confirmedRsvps: index, checkins: 0 }));
    data.audit.entries = Array.from({ length: 6 }, (_, index) => ({ id: `audit-${index}`, actor: "Administrator" as const, action: `fixture.action-${index}`, target: `events/event-${index}`, reason: "Synthetic verification fixture", status: "completed" as const, occurredAt: "2026-09-30T00:00:00Z" }));
    await mount(page, "overview", { data });
    await expect(page.getByRole("heading", { name: "Admin dashboard", exact: true })).toBeVisible();
    await page.addStyleTag({ content: "html {font-size: 200% !important}" });
    // Native disclosures preserve every returned label, event, audit entry and reference.
    await page.locator(".admin-disclosure").evaluateAll(nodes => nodes.forEach(node => (node as HTMLDetailsElement).open = true));
    await expect(page.getByText("Synthetic running record", { exact: false })).toBeVisible();
    await expect(page.getByText("Synthetic event 5", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("fixture.action-5", { exact: true })).toBeVisible();
    await expect(page.getByText("Safe configuration view", { exact: false })).toBeVisible();
    await expect(page.getByRole("table").filter({ has: page.getByText("API endpoints", { exact: true }) })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const navigation = page.getByRole("navigation", { name: "Admin modules", exact: true }).filter({ visible: true });
    if (width < 1024) {
      const summary = navigation.locator(".admin-module-switcher > summary");
      await summary.focus(); await page.keyboard.press("Enter");
      await expect(navigation.getByRole("link", { name: "Events", exact: true })).toBeVisible();
      await expect(navigation.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(summary).toBeFocused();
      await expect(navigation.locator(".admin-module-switcher")).not.toHaveAttribute("open");
    }
    await expect(navigation.getByRole("link", { name: "Admin guide", exact: true })).toBeVisible();
  });
}

test("admin navigation identifies every module without a wall of mobile tabs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await mount(page, "overview", { data: overview() });
  const navigation = page.getByRole("navigation", { name: "Admin modules", exact: true }).filter({ visible: true });
  const modules = [["/admin", "Overview"], ["/admin/content/events", "Events"], ["/admin/content/communities", "Clubs"], ["/admin/content/places", "Places"], ["/admin/content/activities", "Activities"], ["/admin/members", "Members"], ["/admin/attendance", "Attendance"], ["/admin/audit", "Audit trail"], ["/admin/guide", "Admin guide"]];
  for (const [pathname, label] of modules) {
    await page.evaluate(({ pathname, data }) => (window as unknown as { renderAdmin: (mode: string, props: unknown) => void }).renderAdmin("overview", { data, pathname }), { pathname, data: overview() });
    await expect(navigation.locator(".admin-module-switcher > summary strong")).toHaveText(label);
    await navigation.locator(".admin-module-switcher > summary").click();
    await expect(navigation.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    await navigation.locator(".admin-module-switcher > summary").press("Escape");
    await expect(navigation.getByRole("link", { name: "Admin guide", exact: true })).toBeVisible();
  }
});

test("overview distinguishes an empty readable audit store from a read failure and unavailable metrics", async ({ page }) => {
  const data = overview();
  await mount(page, "overview", { data });
  await expect(page.getByText("Audit store is readable. No admin actions recorded yet.", { exact: true })).toBeVisible();
  data.audit.readable = false;
  await page.evaluate(data => (window as unknown as { renderAdmin: (mode: string, props: unknown) => void }).renderAdmin("overview", { data }), data);
  await expect(page.getByRole("alert")).toContainText("Audit could not be read");
  await expect(page.getByText("Audit store is readable. No admin actions recorded yet.", { exact: true })).toHaveCount(0);
  data.backendError = "unavailable";
  await page.evaluate(data => (window as unknown as { renderAdmin: (mode: string, props: unknown) => void }).renderAdmin("overview", { data }), data);
  await expect(page.getByRole("alert")).toContainText("Metrics are unavailable");
  await expect(page.locator(".admin-metric-value")).toHaveText(["—", "—", "—", "—"]);
});
