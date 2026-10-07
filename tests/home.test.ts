import assert from "node:assert/strict";
import { test } from "node:test";
import { homeHighlights } from "../lib/home";
import type { Directory } from "../lib/data";
import type { Event } from "../types/event";
import type { Community } from "../types/community";
import type { Place } from "../types/place";

const now = new Date("2026-10-07T05:30:00+05:30");
const event = (id: string, date = "2026-10-07", status: Event["status"] = "published"): Event => ({ id, slug: id, title: id, category: "running", communitySlug: "club", communityName: "Synthetic club", venueSlug: "venue", venueName: "Synthetic venue", sector: "Sector 1", date, startTime: "06:00 AM", endTime: "07:00 AM", price: "FREE", description: "Synthetic test fixture", featured: false, attendeesCount: 0, status });
const club = (id: string, featured = false): Community => ({ id, slug: id, name: id, category: "running", tagline: "", description: "", baseLocation: "Sector 1", membersCount: 0, verified: false, featured, meetingDays: [], captains: [], socialLinks: {}, status: "published" });
const place = (id: string, featured = false): Place => ({ id, slug: id, name: id, category: "park", sector: "Sector 1", address: "", coordinates: { lat: 0, lng: 0 }, amenities: [], description: "", activeCommunitiesCount: 0, featured, status: "published" });
const empty = (): Directory => ({ activities: [], events: [], communities: [], places: [] });

test("home uses bounded chronological published sessions within the next seven IST days", () => {
  const data = empty();
  data.events = [event("later", "2026-10-09"), event("ended", "2026-10-06"), event("today"), event("draft", "2026-10-07", "draft"), event("cancelled", "2026-10-07", "cancelled"), event("tomorrow", "2026-10-08"), event("far", "2026-10-20")];
  const before = data.events.map(item => item.id);
  const result = homeHighlights(data, now);
  assert.equal(result.eventWindow, "week");
  assert.deepEqual(result.events.map(item => item.id), ["today", "tomorrow", "later"]);
  assert.deepEqual(data.events.map(item => item.id), before, "never reorder the shared request directory");
});

test("home shows honest future-session fallback when the next seven days are empty", () => {
  const data = empty(); data.events = [event("future", "2026-10-20")];
  const result = homeHighlights(data, now);
  assert.equal(result.eventWindow, "upcoming"); assert.equal(result.events[0].id, "future");
  data.events = [event("past", "2026-10-06")];
  assert.equal(homeHighlights(data, now).events.length, 0);
});

test("home prefers editorial featured clubs/places but fills slots without inventing listings", () => {
  const data = empty();
  data.communities = [club("normal"), club("featured", true), { ...club("private-editorial"), status: "draft" }, club("third"), club("fourth")];
  data.places = [place("normal"), place("featured", true), { ...place("cancelled"), status: "cancelled" }];
  const result = homeHighlights(data, now);
  assert.deepEqual(result.communities.map(item => item.id), ["featured", "normal", "third"]);
  assert.deepEqual(result.places.map(item => item.id), ["featured", "normal"]);
});

test("home preserves demo provenance and only links existing published activities", () => {
  const data = empty();
  data.activities = ["yoga", "outdoor", "sports", "running", "cycling", "strength", "wellness", "tennis"].map(slug => ({ id: `a-${slug}`, slug, name: slug, emoji: "", description: "", status: "published" as const }));
  data.activities.push({ id: "draft", slug: "draft", name: "draft", emoji: "", description: "", status: "draft" });
  data.communities = [{ ...club("demo"), demo: true }];
  const result = homeHighlights(data, now);
  assert.deepEqual(result.activities.map(item => item.slug), ["running", "cycling", "strength", "sports", "wellness", "outdoor"]);
  assert.equal(result.hasDemo, true); assert.equal(result.communities[0].demo, true);
});

test("empty published directory stays empty; no synthetic counts or fallback data", () => {
  assert.deepEqual(homeHighlights(empty(), now), { activities: [], events: [], communities: [], places: [], eventWindow: "upcoming", hasDemo: false });
});
