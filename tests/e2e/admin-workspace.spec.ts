import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { AdminDashboardData } from "../../types/admin";
import { contentTemplates } from "../../lib/content-schema";

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

test("club editor uploads a logo and banner to storage and saves their /media paths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const record = { ...contentTemplates.communities, id: "club", name: "Synthetic club" };
  await mount(page, "content", { kind: "communities", initialRecords: [{ id: "club", updatedAt: "version-one", record }], template: record, writesEnabled: true });
  // A real 2x1 PNG so the previews actually render.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGNk+M9Q38DAwMAAAA8eAgHCzJXLAAAAAElFTkSuQmCC", "base64");
  const uploads: { reason: string; size: number }[] = [];
  await page.route("**/api/admin/media", async route => {
    const body = route.request().postDataBuffer()!.toString("latin1");
    uploads.push({ reason: /name="reason"\r\n\r\n([^\r]*)/.exec(body)?.[1] ?? "", size: body.length });
    return route.fulfill({ status: 201, json: { media: { id: `file${uploads.length}`, path: `/media/file${uploads.length}` } } });
  });
  await page.route("**/media/file*", route => route.fulfill({ contentType: "image/png", body: png }));
  await page.route("**/api/admin/content/activities", route => route.fulfill({ json: { records: [{ id: "activity-running", updatedAt: "v", record: { ...contentTemplates.activities, name: "Running", slug: "running", status: "published" } }] } }));
  await page.route("**/api/admin/content/places", route => route.fulfill({ json: { records: [] } }));
  const saves: Record<string, unknown>[] = [];
  await page.route("**/api/admin/content/communities", async route => {
    const body = route.request().postDataJSON(); saves.push(body);
    return route.fulfill({ json: { record: { id: "club", updatedAt: "version-two", record: body.record } } });
  });

  await page.getByRole("button", { name: "Edit Synthetic club" }).click();
  const images = page.getByRole("group", { name: "Images" });
  await expect(images.getByText("No image")).toHaveCount(2);
  await page.locator("#image-crestUrl").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("status").filter({ hasText: "Logo uploaded." })).toBeVisible();
  await page.locator("#image-bannerUrl").setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("status").filter({ hasText: "Banner image uploaded." })).toBeVisible();
  await expect(images.getByLabel("Logo", { exact: true })).toHaveValue("/media/file1");
  await expect(images.getByLabel("Banner image", { exact: true })).toHaveValue("/media/file2");
  for (const name of ["Current logo", "Current banner image"]) {
    await expect.poll(() => images.getByRole("img", { name }).evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(2);
  }
  expect(uploads.map(upload => upload.reason)).toEqual(["Upload logo for community new-community", "Upload banner image for community new-community"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.SCREENSHOT_DIR) await images.screenshot({ path: `${process.env.SCREENSHOT_DIR}/admin-club-images.png` });

  await page.getByLabel("Mutation reason", { exact: false }).fill("Add club logo and banner");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  expect(saves[0].record).toMatchObject({ crestUrl: "/media/file1", bannerUrl: "/media/file2" });

  // Remove clears the optional field rather than saving an invalid empty string.
  await images.getByRole("button", { name: "Remove" }).first().click();
  await expect(images.getByLabel("Logo", { exact: true })).toHaveValue("");
  await page.getByLabel("Mutation reason", { exact: false }).fill("Remove club logo");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => saves.length).toBe(2);
  expect(saves[1].record).not.toHaveProperty("crestUrl");
  expect(saves[1].record).toMatchObject({ bannerUrl: "/media/file2" });
});

test("event editor picks its activity, club, place and organizer from dropdowns instead of typed IDs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const record = { ...contentTemplates.events, id: "event", title: "Synthetic event" };
  await mount(page, "content", { kind: "events", initialRecords: [{ id: "event", updatedAt: "version-one", record }], template: record, writesEnabled: true });
  const entry = (kind: keyof typeof contentTemplates, id: string, changes: Record<string, unknown>) => ({ id, updatedAt: "v", record: { ...contentTemplates[kind], id, ...changes } });
  await page.route("**/api/admin/content/activities", route => route.fulfill({ json: { records: [entry("activities", "act-cycle", { name: "Cycling", slug: "cycling", status: "published" }), entry("activities", "act-run", { name: "Running", slug: "running", status: "draft" })] } }));
  await page.route("**/api/admin/content/communities", route => route.fulfill({ json: { records: [entry("communities", "club-1", { name: "Sunrise Riders", slug: "sunrise-riders", status: "published", crestUrl: "/media/crest1" })] } }));
  await page.route("**/api/admin/content/places", route => route.fulfill({ json: { records: [entry("places", "place-1", { name: "Sector 18 Park", slug: "sector-18-park", sector: "Sector 18", status: "published" })] } }));
  const searches: string[] = [];
  await page.route("**/api/admin/members**", route => {
    const q = new URL(route.request().url()).searchParams.get("q") ?? ""; searches.push(q);
    const all = [{ id: "user-asha", name: "Asha Organizer", enabled: true }, { id: "user-blocked", name: "Asha Suspended", enabled: false }, { id: "user-ravi", name: "Ravi", enabled: true }];
    return route.fulfill({ json: { total: 3, members: all.filter(member => member.name.toLowerCase().includes(q.toLowerCase())) } });
  });
  const saves: Record<string, unknown>[] = [];
  await page.route("**/api/admin/content/events", async route => {
    const body = route.request().postDataJSON(); saves.push(body);
    return route.fulfill({ json: { record: { id: "event", updatedAt: "version-two", record: body.record } } });
  });

  await page.getByRole("button", { name: "Edit Synthetic event" }).click();
  const activity = page.getByLabel("Activity", { exact: true });
  await expect(activity.locator("option", { hasText: "Running · draft" })).toHaveCount(1);
  await activity.selectOption({ label: "Cycling" });
  await page.getByLabel("Category", { exact: true }).selectOption("cycling");
  await page.getByLabel("Community", { exact: true }).selectOption({ label: "Sunrise Riders" });
  await page.getByLabel("Place", { exact: true }).selectOption({ label: "Sector 18 Park" });
  await expect(page.getByLabel("Sector", { exact: true })).toHaveValue("Sector 18");
  await page.getByLabel("Find organizer by name").fill("asha");
  const organizer = page.getByLabel("Organizer", { exact: true });
  await expect(organizer.locator("option", { hasText: "Asha Organizer" })).toHaveCount(1);
  await expect(organizer.locator("option", { hasText: "Asha Suspended" })).toHaveCount(0);
  await organizer.selectOption({ label: "Asha Organizer · user-asha" });
  await expect.poll(() => searches).toContain("asha");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.SCREENSHOT_DIR) await page.getByRole("group", { name: "Community, venue & organizer" }).screenshot({ path: `${process.env.SCREENSHOT_DIR}/admin-event-refs.png` });

  await page.getByLabel("Mutation reason", { exact: false }).fill("Link event to club and place");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => saves.length).toBe(1);
  expect(saves[0].record).toMatchObject({ activityId: "act-cycle", category: "cycling", communitySlug: "sunrise-riders", communityName: "Sunrise Riders", communityCrestUrl: "/media/crest1", venueSlug: "sector-18-park", venueName: "Sector 18 Park", sector: "Sector 18", organizerUserId: "user-asha" });

  // "No organizer" removes the assignment rather than saving an empty ID.
  await organizer.selectOption("");
  await page.getByLabel("Mutation reason", { exact: false }).fill("Remove organizer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => saves.length).toBe(2);
  expect(saves[1].record).not.toHaveProperty("organizerUserId");
});

test("place editor ticks its activities and club editor picks an optional primary place", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const place = { ...contentTemplates.places, id: "place", name: "Synthetic place", activities: ["running"] };
  await mount(page, "content", { kind: "places", initialRecords: [{ id: "place", updatedAt: "version-one", record: place }], template: place, writesEnabled: true });
  await page.route("**/api/admin/content/activities", route => route.fulfill({ json: { records: ["running", "yoga"].map(slug => ({ id: `act-${slug}`, updatedAt: "v", record: { ...contentTemplates.activities, name: slug === "yoga" ? "Yoga" : "Running", slug, status: "published" } })) } }));
  const saves: Record<string, unknown>[] = [];
  await page.route("**/api/admin/content/places", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { records: [] } });
    const body = route.request().postDataJSON(); saves.push(body);
    return route.fulfill({ json: { record: { id: "place", updatedAt: "version-two", record: body.record } } });
  });
  await page.getByRole("button", { name: "Edit Synthetic place" }).click();
  const offered = page.getByRole("group", { name: "Activities offered here" });
  await expect(offered.getByLabel("Running")).toBeChecked();
  await offered.getByLabel("Yoga").check();
  await offered.getByLabel("Running").uncheck();
  await page.getByLabel("Mutation reason", { exact: false }).fill("Update activities offered");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => saves.length).toBe(1);
  expect((saves[0].record as Record<string, unknown>).activities).toEqual(["yoga"]);
});

test("place editor offers the categories and sectors other places use, and still accepts new ones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const place = (id: string, changes: Record<string, unknown>) => ({ id, updatedAt: "version-one", record: { ...contentTemplates.places, id, ...changes } });
  const records = [
    place("park", { name: "Meghdootam Park", slug: "meghdootam-park", category: "Public Park", sector: "Sector 50" }),
    place("stadium", { name: "Noida Stadium", slug: "noida-stadium", category: "Sports Complex", sector: "Sector 21A" }),
    place("city-park", { name: "City Park", slug: "city-park", category: "Public Park", sector: "Sector 9" }),
  ];
  await mount(page, "content", { kind: "places", initialRecords: records, template: contentTemplates.places, writesEnabled: true });
  await page.route("**/api/admin/content/activities", route => route.fulfill({ json: { records: [] } }));
  const saves: Record<string, unknown>[] = [];
  await page.route("**/api/admin/content/places", async route => {
    const body = route.request().postDataJSON(); saves.push(body);
    return route.fulfill({ status: 201, json: { record: { id: "new", updatedAt: "version-two", record: body.record } } });
  });

  await page.getByRole("button", { name: "New place" }).click();
  const category = page.getByLabel("Category", { exact: true });
  const sector = page.getByLabel("Sector", { exact: true });
  // Each value once, sorted, with "Sector 9" before "Sector 21A".
  expect(await page.locator("#suggest-category option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(["Public Park", "Sports Complex"]);
  expect(await page.locator("#suggest-sector option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(["Sector 9", "Sector 21A", "Sector 50"]);
  await expect(category).toHaveAttribute("list", "suggest-category");
  await category.fill("Public Park");
  await sector.fill("Sector 62");
  await page.getByLabel("Name", { exact: true }).fill("Sector 62 Park");
  await page.getByLabel("Mutation reason", { exact: false }).fill("Add a new park");
  await page.getByRole("button", { name: "Create record", exact: true }).click();
  await expect.poll(() => saves.length).toBe(1);
  expect(saves[0].record).toMatchObject({ category: "Public Park", sector: "Sector 62", name: "Sector 62 Park" });
});

test("slugs are made from the name for new records, stay put on existing ones, and can be regenerated", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const existing = { id: "club-1", updatedAt: "version-one", record: { ...contentTemplates.communities, id: "club-1", name: "Sunrise Riders", slug: "sunrise-riders", status: "published" } };
  await mount(page, "content", { kind: "communities", initialRecords: [existing], template: contentTemplates.communities, writesEnabled: true });
  await page.route("**/api/admin/content/activities", route => route.fulfill({ json: { records: [] } }));
  await page.route("**/api/admin/content/places", route => route.fulfill({ json: { records: [] } }));
  const name = page.getByLabel("Name", { exact: true });
  const slug = page.getByLabel("Slug", { exact: true });

  // New record: the slug follows the name, accents and symbols included, and avoids a slug already in use.
  await page.getByRole("button", { name: "New community" }).click();
  await name.fill("Café Runners & Walkers");
  await expect(slug).toHaveValue("cafe-runners-and-walkers");
  await name.fill("Sunrise Riders");
  await expect(slug).toHaveValue("sunrise-riders-2");
  // Editing the slug by hand stops it following the name; "Make from name" brings it back.
  await slug.fill("Riders-Of-Noida");
  await expect(slug).toHaveValue("riders-of-noida");
  await name.fill("Sunrise Riders Noida");
  await expect(slug).toHaveValue("riders-of-noida");
  await page.getByRole("button", { name: "Make from name" }).click();
  await expect(slug).toHaveValue("sunrise-riders-noida");
  await name.fill("Sunrise Riders Noida West");
  await expect(slug).toHaveValue("sunrise-riders-noida-west");

  // Existing record: renaming never changes its public address on its own.
  await page.getByRole("button", { name: "Close editor" }).click();
  await page.getByRole("button", { name: "Edit Sunrise Riders" }).click();
  await name.fill("Sunrise Riders Club");
  await expect(slug).toHaveValue("sunrise-riders");
  await expect(page.getByText("Changing it breaks existing links.")).toBeVisible();
  await page.getByRole("button", { name: "Make from name" }).click();
  await expect(slug).toHaveValue("sunrise-riders-club");
});
