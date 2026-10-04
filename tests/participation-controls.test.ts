import assert from "node:assert/strict";
import { after, before, test } from "node:test";

// Isolated SDK transport: no credentials, accounts or live Appwrite mutations.
let services: typeof import("../lib/services/participation");
const originalFetch = globalThis.fetch;
let rows = new Map<string, Record<string, unknown>[]>();
let calls: string[] = [];
let failure = "";
before(async () => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "controls-test",
    APPWRITE_KEY: "synthetic-key", NEXT_PUBLIC_APPWRITE_DATABASE_ID: "controls-test",
    ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(key => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${key}`, key.toLowerCase()])),
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://appwrite.test");
    assert.equal(init?.method, "GET");
    const collection = /collections\/([^/]+)\/documents$/.exec(url.pathname)?.[1];
    assert.ok(collection);
    calls.push(collection);
    if (failure === collection) return Response.json({ code: 503, message: "Synthetic failure", type: "general_unknown" }, { status: 503 });
    const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
    const owner = queries.find(query => query.method === "equal" && query.attribute === "userId");
    assert.deepEqual(owner?.values, ["test-owner"], "every query remains scoped to the authenticated owner");
    let documents = (rows.get(collection) ?? []).filter(row => row.userId === owner.values[0]);
    const total = documents.length;
    const cursor = queries.find(query => query.method === "cursorAfter");
    if (cursor) documents = documents.slice(documents.findIndex(row => row.$id === cursor.values[0]) + 1);
    const limit = queries.find(query => query.method === "limit");
    documents = documents.slice(0, limit?.values[0] ?? 25);
    return Response.json({ total, documents });
  };
  services = await import("../lib/services/participation");
});
after(() => { globalThis.fetch = originalFetch; });

function fixture(historySize = 0) {
  calls = []; failure = "";
  const base = { userId: "test-owner", createdAt: "2026-09-30T00:00:00Z", $permissions: ["private"], futurePrivateAttribute: "must-not-escape" };
  rows = new Map<string, Record<string, unknown>[]>([
    ["rsvps", [{ ...base, $id: "rsvp", eventId: "event", status: "confirmed", seatNumber: 1 }]],
    ["saved_items", [{ ...base, $id: "saved", itemId: "place", itemType: "place" }, { ...base, $id: "other", userId: "other-owner", itemId: "other-place", itemType: "place" }]],
    ["memberships", [{ ...base, $id: "membership", communityId: "community", status: "active" }]],
    ["participations", Array.from({ length: historySize }, (_, i) => ({ ...base, $id: `p-${i}`, eventId: `event-${i}`, title: "Synthetic activity", occurredAt: base.createdAt, status: "verified", source: "event", activityId: "running" }))],
    ["checkins", Array.from({ length: historySize }, (_, i) => ({ ...base, $id: `c-${i}`, eventId: `event-${i}`, timestamp: base.createdAt, verificationMethod: "organizer" }))],
  ]);
}

test("full participation contract preserves all five lists, pagination and owner-only DTOs", async t => {
  t.mock.method(console, "info", () => {});
  fixture(1000);
  const result = await services.getAccountParticipation("test-owner");
  assert.equal(result.checkins.length, 1000);
  assert.equal(result.participations.length, 1000);
  assert.equal(result.savedItems.length, 1);
  assert.equal(calls.length, 25);
  assert.doesNotMatch(JSON.stringify(result), /futurePrivateAttribute|\$permissions|other-owner/);
  console.log(`Full history fixture: ${calls.length} database requests; ${Buffer.byteLength(JSON.stringify(result))} response bytes`);
});

test("control state is identical without history reads, regardless of history size", async t => {
  t.mock.method(console, "info", () => {});
  for (const size of [0, 100, 1000]) {
    fixture(size);
    const full = await services.getAccountParticipation("test-owner");
    calls = [];
    const controls = await services.getParticipationControls("test-owner");
    assert.deepEqual(controls, { rsvps: full.rsvps, savedItems: full.savedItems, memberships: full.memberships });
    assert.deepEqual(calls.sort(), ["memberships", "rsvps", "saved_items"]);
    assert.doesNotMatch(JSON.stringify(controls), /futurePrivateAttribute|\$permissions|other-owner|checkins|participations/);
    console.log(`Controls fixture (${size} history rows per table): ${calls.length} database requests; ${Buffer.byteLength(JSON.stringify(controls))} response bytes`);
  }
});

test("controls paginate, stay fresh after changes, and propagate failures", async t => {
  t.mock.method(console, "info", () => {});
  fixture();
  rows.set("saved_items", Array.from({ length: 201 }, (_, i) => ({ $id: `saved-${i}`, userId: "test-owner", itemId: `place-${i}`, itemType: "place", createdAt: "2026-09-30T00:00:00Z" })));
  assert.equal((await services.getParticipationControls("test-owner")).savedItems.length, 201);
  assert.equal(calls.filter(collection => collection === "saved_items").length, 3);
  rows.set("saved_items", []);
  assert.deepEqual((await services.getParticipationControls("test-owner")).savedItems, []);
  failure = "memberships";
  t.mock.method(console, "error", () => {});
  await assert.rejects(services.getParticipationControls("test-owner"));
  calls = [];
  await assert.rejects(services.getParticipationControls("invalid/owner"));
  assert.deepEqual(calls, []);
});
