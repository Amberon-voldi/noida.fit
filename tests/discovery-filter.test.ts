import assert from "node:assert/strict";
import { test } from "node:test";
import type { Directory } from "../lib/data";
import type { Event } from "../types/event";
import type { Community } from "../types/community";
import type { Place } from "../types/place";
import { eventIsUpcoming, eventTimestamp, filterDirectory, filterUrl, indiaDate, readFilters } from "../components/discovery/filter";
import { listingMetadata } from "../components/discovery/metadata";

const NOW = new Date("2026-09-30T00:00:00+05:30");
const event = (id: string, changes: Partial<Event> = {}): Event => ({ id, slug: id, title: "Sunrise run", category: "running", activityId: "a-running", communitySlug: "track-crew", communityName: "Track Crew", venueSlug: "stadium", venueName: "Noida Stadium", sector: "Sector 21A", date: "2026-09-30", startTime: "06:00 AM", endTime: "07:00 AM", price: "FREE", description: "An easy local gathering", featured: false, attendeesCount: 0, status: "published", ...changes });
const community = (id: string, changes: Partial<Community> = {}): Community => ({ id, slug: id, name: "Track Crew", category: "running", activityId: "a-running", tagline: "Move together", description: "A local running group", baseLocation: "Sector 21A, Noida", primaryVenueSlug: "stadium", membersCount: 0, verified: false, featured: false, meetingDays: ["Wednesday"], captains: [], socialLinks: {}, ...changes });
const place = (id: string, changes: Partial<Place> = {}): Place => ({ id, slug: id, name: "Noida Stadium", category: "Sports Complex", sector: "Sector 21A", address: "Sector 21A, Noida", coordinates: { lat: 28.59, lng: 77.34 }, amenities: ["Track"], activities: ["running"], description: "A training place", activeCommunitiesCount: 0, priceIndicator: "FREE", ...changes });
const directory: Directory = {
  activities: [
    { id: "a-running", slug: "running", name: "Running", description: "", emoji: "" },
    { id: "a-yoga", slug: "yoga", name: "Yoga", description: "", emoji: "" },
    { id: "a-wellness", slug: "wellness", name: "Wellness", description: "", emoji: "" },
    { id: "a-sports", slug: "sports", name: "Sports", description: "", emoji: "" },
    { id: "a-tennis", slug: "tennis", name: "Tennis", description: "", emoji: "" },
  ],
  events: [
    event("morning"),
    event("day", { startTime: "08:30 AM", endTime: "10:00 AM", price: "₹200" }),
    event("evening", { startTime: "05:00 PM", endTime: "06:00 PM", sector: "Sector 137" }),
    event("tomorrow", { date: "2026-10-01", title: "Recovery yoga", category: "wellness", activityId: "a-yoga" }),
    event("saturday", { date: "2026-10-03" }),
    event("sunday", { date: "2026-10-04" }),
    event("next-week", { date: "2026-10-07" }),
    event("past", { date: "2026-09-29" }),
    event("cancelled", { status: "cancelled" }),
    event("draft", { status: "draft" }),
  ],
  communities: [community("track-crew"), community("yoga-crew", { name: "Yoga Circle", category: "wellness", activityId: "a-yoga", baseLocation: "Sector 137" })],
  places: [place("stadium"), place("court", { name: "Rally court", category: "Tennis Court", activities: ["a-tennis"], sector: "Sector 137", address: "Sector 137, Noida", priceIndicator: "₹150 sample court split" }), place("unknown", { name: "Unconfirmed venue", activities: ["yoga"], sector: "Sector 50", address: "Sector 50", priceIndicator: "Check gate 4 for fees" })],
};
const search = (params: Parameters<typeof readFilters>[0], now = NOW) => filterDirectory(directory, readFilters(params), now);
const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);

test("empty filters return published upcoming events, communities and places", () => {
  const results = search({});
  assert.equal(results.total, 12);
  assert.deepEqual(ids(results.events), ["morning", "day", "evening", "tomorrow", "saturday", "sunday", "next-week"]);
});

test("readFilters handles arrays, aliases, all sentinels and directory type override", () => {
  const filters = readFilters({ q: ["  run  ", "ignored"], activity: "all", type: "community", "free-paid": "paid", date: "all" });
  assert.equal(filters.q, "run");
  assert.equal(filters.type, "communities");
  assert.equal(filters.price, "paid");
  assert.equal(filters.activity, "");
  assert.equal(filters.date, "");
  assert.equal(readFilters({ type: "places" }, "events").type, "events");
  assert.equal(readFilters({ q: "a".repeat(200) }).q.length, 160);
});

test("URL changes preserve other filters and safely encode text", () => {
  const href = filterUrl("/search", readFilters({ q: "yoga & mobility", sector: "Sector 21A", price: "free" }), { price: "", activity: "yoga" });
  const url = new URL(href, "https://noida.fit");
  assert.equal(url.searchParams.get("q"), "yoga & mobility");
  assert.equal(url.searchParams.get("sector"), "Sector 21A");
  assert.equal(url.searchParams.get("activity"), "yoga");
  assert.equal(url.searchParams.has("price"), false);
});

test("keyword search matches activity, place and sector across entity types", () => {
  const result = search({ q: "running near Sector 21A" });
  assert.equal(result.communities.length, 1);
  assert.equal(result.places.length, 1);
  assert.equal(result.events.some((item) => item.id === "evening"), false);
  assert.equal(search({ q: "NOIDA STADIUM" }).places[0].id, "stadium");
});

test("search recognizes run synonyms and club intent", () => {
  const result = search({ q: "run clubs near sector 21a" });
  assert.deepEqual(ids(result.communities), ["track-crew"]);
  assert.equal(result.events.length, 0);
  assert.equal(result.places.length, 0);
});

test("search understands date, time and cost without inventing venue availability", () => {
  assert.deepEqual(ids(search({ q: "free morning running today" }).events), ["morning"]);
  assert.deepEqual(ids(search({ q: "yoga tomorrow" }).events), ["tomorrow"]);
  assert.equal(search({ q: "running morning" }).places.length, 0);
});

test("explicit filters take precedence over inferred query intent", () => {
  assert.deepEqual(ids(search({ q: "running morning", time: "evening" }).events), ["evening"]);
  assert.ok(search({ q: "running clubs", type: "events" }).events.length > 0);
});

test("activity ID and slug behave identically; broad category includes subactivities", () => {
  assert.deepEqual(ids(search({ activity: "yoga" }).events), ["tomorrow"]);
  assert.deepEqual(ids(search({ activity: "a-yoga" }).events), ["tomorrow"]);
  assert.deepEqual(ids(search({ activity: "wellness" }).events), ["tomorrow"]);
  assert.deepEqual(ids(search({ activity: "sports" }).places), ["court"]);
  assert.deepEqual(ids(search({ activity: "tennis" }).places), ["court"]);
});

test("places inherit linked event activity without requiring denormalized activities", () => {
  const result = filterDirectory({ ...directory, places: [place("stadium", { activities: [] })] }, readFilters({ activity: "running", type: "places" }), NOW);
  assert.equal(result.places.length, 1);
});

test("sector filtering is case-insensitive and not a numeric substring match", () => {
  assert.deepEqual(ids(search({ sector: "137", type: "events" }).events), ["evening"]);
  assert.equal(search({ sector: "Sector 1" }).total, 0);
  assert.equal(search({ sector: "sector 21a", type: "places" }).places.length, 1);
});

test("today, tomorrow, weekend and next-seven-days use IST calendar windows", () => {
  assert.deepEqual(ids(search({ date: "today" }).events), ["morning", "day", "evening"]);
  assert.deepEqual(ids(search({ date: "tomorrow" }).events), ["tomorrow"]);
  assert.deepEqual(ids(search({ date: "weekend" }).events), ["saturday", "sunday"]);
  assert.equal(search({ date: "week" }).events.length, 6);
  assert.deepEqual(ids(search({ date: "2026-10-03" }).events), ["saturday"]);
});

test("Sunday weekend means the current Sunday, not the following weekend", () => {
  assert.deepEqual(ids(search({ date: "weekend" }, new Date("2026-10-04T00:00:00+05:30")).events), ["sunday"]);
});

test("timezone boundaries do not use the host UTC date", () => {
  assert.equal(indiaDate(new Date("2026-09-29T20:00:00Z")), "2026-09-30");
  assert.equal(search({ date: "today" }, new Date("2026-09-29T20:00:00Z")).events.length, 3);
});

test("morning, daytime and evening time windows have non-overlapping boundaries", () => {
  assert.deepEqual(ids(search({ date: "today", time: "morning" }).events), ["morning"]);
  assert.deepEqual(ids(search({ date: "today", time: "daytime" }).events), ["day"]);
  assert.deepEqual(ids(search({ date: "today", time: "evening" }).events), ["evening"]);
  const boundary = event("late", { startTime: "09:30 PM", endTime: "10:30 PM" });
  assert.equal(filterDirectory({ ...directory, events: [boundary] }, readFilters({ time: "evening" }), NOW).events.length, 0);
});

test("free and paid filters never infer unknown venue prices from a digit", () => {
  assert.deepEqual(ids(search({ price: "paid" }).events), ["day"]);
  assert.deepEqual(ids(search({ "free-paid": "paid" }).places), ["court"]);
  assert.deepEqual(ids(search({ price: "free" }).places), ["stadium"]);
  assert.equal(search({ price: "free" }).communities.length, 0);
});

test("date and time filter out non-event entities instead of assuming schedules", () => {
  assert.equal(search({ date: "today" }).communities.length, 0);
  assert.equal(search({ time: "morning" }).places.length, 0);
  assert.equal(search({ type: "places", date: "today" }).total, 0);
});

test("type aliases and place categories select the expected entities", () => {
  assert.equal(search({ type: "event" }).communities.length, 0);
  assert.deepEqual(ids(search({ type: "place", category: "Tennis Court" }).places), ["court"]);
  assert.equal(search({ type: "community" }).total, 2);
});

test("multiple filters intersect rather than broadening a result", () => {
  assert.deepEqual(ids(search({ q: "stadium", type: "events", activity: "running", date: "today", sector: "21A", price: "paid", time: "day" }).events), ["day"]);
  assert.equal(search({ activity: "yoga", price: "paid", sector: "21A" }).total, 0);
});

test("invalid filter values yield a safe empty state", () => {
  for (const params of [{ type: "unknown" }, { activity: "unknown" }, { date: "yesterday" }, { time: "never" }, { price: "cheap" }]) assert.equal(search(params).total, 0);
});

test("ended and cancelled sessions never show as upcoming", () => {
  assert.equal(eventIsUpcoming(event("old"), new Date("2026-09-30T08:00:00+05:30")), false);
  assert.equal(eventIsUpcoming(event("cancelled", { status: "cancelled" }), NOW), false);
  assert.equal(eventIsUpcoming(event("bad-end", { endsAt: "undefined" }), new Date("2026-09-30T08:00:00+05:30")), false);
});

test("timestamps normalize ISO offsets and 12/24-hour fallback times for sorting", () => {
  const later = event("later", { startTime: "07:00 AM", startsAt: "2026-09-30T01:30:00Z" });
  const earlier = event("earlier", { startTime: "06:00 AM", startsAt: "2026-09-30T06:00:00+05:30" });
  const results = filterDirectory({ ...directory, events: [later, earlier] }, readFilters({}), NOW);
  assert.deepEqual(ids(results.events), ["earlier", "later"]);
  assert.equal(eventTimestamp(event("noon", { startTime: "12:00 PM" })), Date.parse("2026-09-30T12:00:00+05:30"));
  assert.equal(eventTimestamp(event("24-hour", { startTime: "18:30" })), Date.parse("2026-09-30T18:30:00+05:30"));
  assert.equal(eventTimestamp(event("overnight", { startTime: "11:00 PM", endTime: "01:00 AM" }), true), Date.parse("2026-10-01T01:00:00+05:30"));
});

test("demo metadata is honest and excluded from indexing", () => {
  const metadata = listingMetadata({ title: "Sample run", description: "A session", path: "/event/sample", demo: true });
  assert.equal(metadata.title, "Sample run (Demo)");
  assert.match(metadata.description ?? "", /not a confirmed gathering/);
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(metadata.alternates?.canonical, "/event/sample");
});
