import assert from "node:assert/strict";
import { test } from "node:test";
import type { Directory } from "../lib/data";
import { buildSitemap } from "../lib/sitemap";

const directory = (): Directory => ({
  activities: [
    { id: "running", slug: "running", name: "Running", emoji: "", description: "", status: "published" },
    { id: "demo", slug: "demo-activity", name: "Demo", emoji: "", description: "", status: "published", demo: true },
    { id: "draft", slug: "draft-activity", name: "Draft", emoji: "", description: "", status: "draft" },
  ],
  events: [
    { id: "real-event", slug: "real-event", title: "Real event", category: "running", communitySlug: "club", communityName: "Club", venueSlug: "park", venueName: "Park", sector: "Noida", date: "2026-10-13", startTime: "06:00 AM", endTime: "07:00 AM", price: "FREE", description: "", featured: false, attendeesCount: 0, status: "published" },
    { id: "cancelled-event", slug: "cancelled-event", title: "Cancelled", category: "running", communitySlug: "club", communityName: "Club", venueSlug: "park", venueName: "Park", sector: "Noida", date: "2026-10-13", startTime: "06:00 AM", endTime: "07:00 AM", price: "FREE", description: "", featured: false, attendeesCount: 0, status: "cancelled" },
  ],
  communities: [],
  places: [],
});

test("sitemap includes public static routes and only published non-demo listings", () => {
  const entries = buildSitemap(directory(), "https://noida.fit/");
  const urls = entries.map((entry) => entry.url);

  assert.ok(urls.includes("https://noida.fit/"));
  assert.ok(urls.includes("https://noida.fit/privacy"));
  assert.ok(urls.includes("https://noida.fit/terms"));
  assert.ok(urls.includes("https://noida.fit/event/real-event"));
  assert.ok(urls.includes("https://noida.fit/activities/running"));
  assert.ok(!urls.includes("https://noida.fit/event/cancelled-event"));
  assert.ok(!urls.includes("https://noida.fit/activities/demo-activity"));
  assert.ok(!urls.includes("https://noida.fit/activities/draft-activity"));
  assert.equal(new Set(urls).size, urls.length);
});

test("sitemap encodes dynamic slugs and normalizes the configured site origin", () => {
  const data = directory();
  data.activities.push({ id: "unicode", slug: "city & movement", name: "City", emoji: "", description: "", status: "published" });
  const entries = buildSitemap(data, "https://example.test/some-build-path");
  assert.ok(entries.some((entry) => entry.url === "https://example.test/activities/city%20%26%20movement"));
  assert.ok(entries.every((entry) => entry.url.startsWith("https://example.test/")));
});
