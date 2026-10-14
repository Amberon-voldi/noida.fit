import assert from "node:assert/strict";
import { test } from "node:test";
import { activities, communities, events, places } from "../data/seed";

const expectedPaidEvents = [
  { id: "evt_06", title: "Alpha doubles: rotate and rally", slug: "alpha-doubles-rotate-and-rally", price: "₹199" },
  { id: "evt_07", title: "Sector 79 seven-a-side", slug: "sector-79-seven-a-side", price: "₹299" },
  { id: "evt_12", title: "Core & coffee: mat Pilates", slug: "core-coffee-mat-pilates", price: "₹299" },
  { id: "evt_18", title: "Alpha beginner doubles clinic", slug: "alpha-beginner-doubles-clinic", price: "₹199" },
] as const;

const validDays = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
const validTime = /^(0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/;
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const monetaryAmount = /(?:₹|INR|Rs\.?)\s*[\d,]+(?:\.\d+)?/i;
const demoOrSampleText = /\b(?:demo|demos|sample|samples)\b/i;

function assertUnique(label: string, values: string[]) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function displayedStrings(value: unknown, path: string): Array<[path: string, value: string]> {
  if (typeof value === "string") return [[path, value]];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => displayedStrings(item, `${path}[${index}]`));
  return Object.entries(value).flatMap(([key, nested]) => key === "demo" ? [] : displayedStrings(nested, `${path}.${key}`));
}

const catalogRecords = [
  ["activities", activities],
  ["communities", communities],
  ["places", places],
  ["events", events],
] as const;

test("published catalog has the exact promoted inventory and paid event mapping", () => {
  assert.equal(activities.length, 26);
  assert.equal(communities.length, 12);
  assert.equal(places.length, 18);
  assert.equal(events.length, 24);
  assertUnique("activity IDs", activities.map((item) => item.id));
  assertUnique("activity slugs", activities.map((item) => item.slug));
  assertUnique("community IDs", communities.map((item) => item.id));
  assertUnique("community slugs", communities.map((item) => item.slug));
  assertUnique("place IDs", places.map((item) => item.id));
  assertUnique("place slugs", places.map((item) => item.slug));
  assertUnique("event IDs", events.map((item) => item.id));
  assertUnique("event slugs", events.map((item) => item.slug));

  const paidEvents = events.filter((event) => event.price !== "FREE");
  assert.deepEqual(paidEvents.map(({ id, title, slug, price }) => ({ id, title, slug, price })), expectedPaidEvents);
  assert.equal(events.filter((event) => event.price === "FREE").length, 20);
  assert.ok(events.every((event) => /^(FREE|₹(?:199|299))$/.test(event.price)));
  assert.equal(events.filter((event) => event.price === "₹199").length, 2);
  assert.equal(events.filter((event) => event.price === "₹299").length, 2);
});

test("published source values contain no demo or sample copy and no venue ticket amounts", () => {
  for (const [kind, records] of catalogRecords) {
    for (const [index, record] of records.entries()) {
      assert.equal(record.status, "published", `${kind}[${index}] status`);
      assert.equal(record.demo, false, `${kind}[${index}] demo flag`);
      for (const [path, value] of displayedStrings(record, `${kind}[${index}]`)) {
        assert.doesNotMatch(value, demoOrSampleText, path);
      }
    }
  }

  for (const [index, place] of places.entries()) {
    assert.equal("price" in place, false, `places[${index}] must not have an event price`);
    assert.doesNotMatch(place.priceIndicator ?? "", monetaryAmount, `places[${index}].priceIndicator`);
  }
  for (const record of [...activities, ...communities]) assert.equal("price" in record, false);
});

test("catalog references and schedule fields use the published schema", () => {
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const activitiesBySlug = new Map(activities.map((activity) => [activity.slug, activity]));
  const communitiesBySlug = new Map(communities.map((community) => [community.slug, community]));
  const placesBySlug = new Map(places.map((place) => [place.slug, place]));

  for (const [index, activity] of activities.entries()) {
    assert.match(activity.id, /^activity_[a-z0-9-]+$/i, `activities[${index}].id`);
    assert.match(activity.slug, validSlug, `activities[${index}].slug`);
    assert.ok(activity.name.trim());
    assert.ok(activity.description.trim());
    assert.ok(activity.emoji.trim());
    assert.ok(activity.tags?.length, `activities[${index}].tags`);
  }

  for (const [index, community] of communities.entries()) {
    assert.match(community.slug, validSlug, `communities[${index}].slug`);
    assert.ok(activitiesById.has(community.activityId ?? ""), `communities[${index}].activityId`);
    assert.ok(placesBySlug.has(community.primaryVenueSlug ?? ""), `communities[${index}].primaryVenueSlug`);
    assert.ok(community.meetingDays.length > 0, `communities[${index}].meetingDays`);
    assert.deepEqual(community.schedule?.map((item) => item.day), community.meetingDays, `communities[${index}] schedule days`);
    assert.equal(community.schedule?.length, community.meetingDays.length, `communities[${index}] schedule length`);
    for (const day of community.meetingDays) assert.ok(validDays.has(day), `communities[${index}] invalid meeting day ${day}`);
    for (const item of community.schedule ?? []) {
      assert.ok(validTime.test(item.time), `communities[${index}] invalid schedule time`);
      assert.ok(item.sessionType.trim());
      assert.ok(item.venueName.trim());
    }
  }

  for (const [index, place] of places.entries()) {
    assert.match(place.slug, validSlug, `places[${index}].slug`);
    assert.ok(Number.isFinite(place.coordinates.lat) && Number.isFinite(place.coordinates.lng), `places[${index}].coordinates`);
    assert.ok(place.coordinates.lat >= -90 && place.coordinates.lat <= 90, `places[${index}].latitude`);
    assert.ok(place.coordinates.lng >= -180 && place.coordinates.lng <= 180, `places[${index}].longitude`);
    assert.ok(place.amenities.length > 0, `places[${index}].amenities`);
    for (const activity of place.activities ?? []) {
      assert.ok(activitiesById.has(activity) || activitiesBySlug.has(activity), `places[${index}].activities reference ${activity}`);
    }
  }

  for (const [index, event] of events.entries()) {
    const community = communitiesBySlug.get(event.communitySlug);
    const place = placesBySlug.get(event.venueSlug);
    const activity = activitiesById.get(event.activityId ?? "") ?? activitiesBySlug.get(event.activityId ?? "");
    assert.ok(community, `events[${index}].communitySlug`);
    assert.ok(place, `events[${index}].venueSlug`);
    assert.ok(activity, `events[${index}].activityId`);
    assert.equal(event.category, community?.category, `events[${index}].category`);
    assert.equal(event.communityName, community?.name, `events[${index}].communityName`);
    assert.equal(event.venueName, place?.name, `events[${index}].venueName`);
    assert.equal(event.sector, place?.sector, `events[${index}].sector`);
    assert.match(event.slug, validSlug, `events[${index}].slug`);
    assert.match(event.date, /^\d{4}-\d{2}-\d{2}$/, `events[${index}].date`);
    assert.equal(new Date(`${event.date}T00:00:00Z`).toISOString().slice(0, 10), event.date, `events[${index}].date value`);
    assert.ok(event.startsAt && Number.isFinite(Date.parse(event.startsAt)), `events[${index}].startsAt`);
    assert.ok(event.endsAt && Number.isFinite(Date.parse(event.endsAt)), `events[${index}].endsAt`);
    assert.ok(event.startsAt?.startsWith(event.date), `events[${index}].startsAt date`);
    assert.ok(event.endsAt?.startsWith(event.date), `events[${index}].endsAt date`);
    assert.ok(validTime.test(event.startTime), `events[${index}].startTime`);
    assert.ok(validTime.test(event.endTime), `events[${index}].endTime`);
    assert.ok(event.capacity !== undefined && Number.isInteger(event.capacity) && event.capacity > 0, `events[${index}].capacity`);
    assert.ok(Number.isInteger(event.attendeesCount) && event.attendeesCount >= 0, `events[${index}].attendeesCount`);
    assert.ok(event.whatToBring?.length, `events[${index}].whatToBring`);
  }
});
