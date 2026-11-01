import assert from "node:assert/strict";
import { before, after, beforeEach, test } from "node:test";
import { createRequire } from "node:module";

const organizer = { id: "club-organizer", labels: [] as string[] };
const stranger = { id: "someone-else", labels: [] as string[] };
const originalFetch = globalThis.fetch;
let service: typeof import("../lib/services/organizer-events");
let rows: Map<string, Record<string, unknown>[]>;
let sequence = 0;

const doc = (collection: string, row: Record<string, unknown>) => rows.set(collection, [...(rows.get(collection) ?? []), { $updatedAt: "2026-10-01T00:00:00.000Z", ...row }]);
const futureDate = new Date(Date.now() + 330 * 60_000 + 7 * 86_400_000).toISOString().slice(0, 10);
const form = (overrides: Record<string, unknown> = {}) => ({
  title: "Sunday sunrise 5K", description: "An easy social run for every pace. Meet at gate 2.", date: futureDate,
  startTime: "06:00 AM", endTime: "07:15 AM", venueSlug: "stadium", capacity: 25, price: "FREE", status: "published", whatToBring: ["Water"], ...overrides,
});

before(async () => {
  // node/tsx resolves Next's client entries; give the data layer a request-free connection().
  const require = createRequire(import.meta.url);
  const serverPath = require.resolve("next/server");
  require.cache[serverPath] = { id: serverPath, filename: serverPath, loaded: true, exports: { ...require("next/server"), connection: async () => undefined } } as NodeJS.Module;
  Object.assign(process.env, {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "organizer-events-test",
    APPWRITE_KEY: "synthetic-key", NEXT_PUBLIC_APPWRITE_DATABASE_ID: "organizer-events-test",
    ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(key => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${key}`, key.toLowerCase()])),
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://appwrite.test", "tests never contact a real backend");
    if (/\/users\//.test(url.pathname)) return Response.json({ $id: url.pathname.split("/").at(-1), status: true });
    const match = /collections\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(url.pathname);
    assert.ok(match, `Unexpected SDK request: ${url.pathname}`);
    const [, collection, id] = match;
    const method = init?.method ?? "GET";
    const current = rows.get(collection) ?? [];
    if (method === "GET" && id) {
      const row = current.find(item => item.$id === id);
      return row ? Response.json(row) : Response.json({ code: 404, type: "document_not_found", message: "absent" }, { status: 404 });
    }
    if (method === "GET") {
      const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
      const documents = current.filter(row => queries.filter(query => query.method === "equal").every(query => query.values.includes(row[query.attribute])));
      return Response.json({ total: documents.length, documents });
    }
    const body = JSON.parse(String(init?.body ?? "{}")) as { documentId?: string; data: Record<string, unknown>; permissions?: string[] };
    const documentId = id ?? String(body.documentId);
    if (!id && current.some(row => row.$id === documentId)) return Response.json({ code: 409, type: "document_already_exists", message: "conflict" }, { status: 409 });
    const row = { ...(id ? current.find(item => item.$id === id) : {}), ...body.data, $id: documentId, $updatedAt: new Date(Date.parse("2026-10-02T00:00:00Z") + ++sequence * 1000).toISOString() };
    rows.set(collection, [...current.filter(item => item.$id !== documentId), row]);
    return Response.json(row, { status: id ? 200 : 201 });
  };
  service = await import("../lib/services/organizer-events");
});
after(() => { globalThis.fetch = originalFetch; });

beforeEach(async () => {
  rows = new Map();
  // Shared reads are cached per isolate; start every test from a clean slate.
  const { invalidateSharedReads } = await import("../lib/appwrite/database");
  for (const collection of ["events", "communities", "places", "activities", "memberships", "rsvps"]) invalidateSharedReads(collection);
  doc("activities", { $id: "activity-running", slug: "running", name: "Running", status: "published", payload: JSON.stringify({ slug: "running", name: "Running", emoji: "🏃", description: "Running in Noida together." }) });
  for (const [slug, name] of [["dawn-runners", "Dawn Runners"], ["other-club", "Other Club"]]) {
    doc("communities", { $id: `community-${slug}`, slug, activityId: "activity-running", status: "published", payload: JSON.stringify({ slug, name, category: "running", activityId: "activity-running" }) });
  }
  doc("places", { $id: "place-stadium", slug: "stadium", status: "published", payload: JSON.stringify({ slug: "stadium", name: "Noida Stadium", sector: "Sector 21A" }) });
  doc("places", { $id: "place-park", slug: "park", status: "published", payload: JSON.stringify({ slug: "park", name: "Botanical Park", sector: "Sector 38" }) });
  // The organizer already runs one Dawn Runners session, which is what lets them schedule more.
  doc("events", { $id: "existing", slug: "existing", title: "Existing", status: "published", organizerUserId: organizer.id, communitySlug: "dawn-runners", capacity: 10, featured: true,
    payload: JSON.stringify({ slug: "existing", title: "Existing run", description: "An existing session for this club.", category: "running", activityId: "activity-running", communitySlug: "dawn-runners", communityName: "Dawn Runners", venueSlug: "stadium", venueName: "Noida Stadium", sector: "Sector 21A", date: futureDate, startTime: "06:00 AM", endTime: "07:00 AM", startsAt: new Date(`${futureDate}T00:30:00Z`).toISOString(), endsAt: new Date(`${futureDate}T01:30:00Z`).toISOString(), price: "FREE", capacity: 10, attendeesCount: 0, featured: true, demo: false, status: "published", organizerUserId: organizer.id, imageUrl: "/images/run.jpg" }) });
});

test("an organizer schedules a session for their own club and is assigned to it", async () => {
  const created = await service.createOrganizerEvent(organizer, { ...form(), communitySlug: "dawn-runners" });
  const row = rows.get("events")!.find(item => item.$id === created.id)!;
  const record = JSON.parse(String(row.payload));
  assert.equal(row.organizerUserId, organizer.id);
  assert.equal(record.communityName, "Dawn Runners");
  assert.equal(record.venueName, "Noida Stadium");
  assert.equal(record.featured, false);
  assert.equal(created.slug, `sunday-sunrise-5k-${futureDate}`);
  // 06:00 IST is 00:30 UTC; the schedule matches what the public page shows.
  assert.equal(record.startsAt, new Date(`${futureDate}T00:30:00Z`).toISOString());
  assert.equal(record.endsAt, new Date(`${futureDate}T01:45:00Z`).toISOString());
});

test("organizers cannot schedule for clubs they do not run, or with bad times or venues", async () => {
  await assert.rejects(service.createOrganizerEvent(organizer, { ...form(), communitySlug: "other-club" }), { code: "ORGANIZER_REQUIRED" });
  await assert.rejects(service.createOrganizerEvent(stranger, { ...form(), communitySlug: "dawn-runners" }), { code: "ORGANIZER_REQUIRED" });
  await assert.rejects(service.createOrganizerEvent(organizer, { ...form({ endTime: "05:00 AM" }), communitySlug: "dawn-runners" }), { message: /end time must be after/ });
  await assert.rejects(service.createOrganizerEvent(organizer, { ...form({ venueSlug: "nowhere" }), communitySlug: "dawn-runners" }), { message: /venue/ });
  await assert.rejects(service.createOrganizerEvent(organizer, { ...form({ description: "short" }), communitySlug: "dawn-runners" }), { code: "INVALID_EVENT" });
  await assert.rejects(service.createOrganizerEvent(organizer, { ...form({ featured: true }), communitySlug: "dawn-runners" }), { code: "INVALID_EVENT" });
});

test("editing keeps team-owned fields, enforces ownership, versions and RSVP capacity", async () => {
  const stored = await service.getManagedEventRecord(organizer, "existing");
  await service.updateOrganizerEvent(organizer, "existing", form({ title: "Renamed run", venueSlug: "park", capacity: 12 }), stored.updatedAt);
  const row = rows.get("events")!.find(item => item.$id === "existing")!;
  const record = JSON.parse(String(row.payload));
  assert.equal(record.title, "Renamed run");
  assert.equal(record.venueName, "Botanical Park");
  assert.equal(record.slug, "existing");
  assert.equal(record.featured, true);
  assert.equal(record.imageUrl, "/images/run.jpg");
  assert.equal(row.organizerUserId, organizer.id);

  await assert.rejects(service.updateOrganizerEvent(organizer, "existing", form(), stored.updatedAt), { code: "STALE_CONTENT" });
  await assert.rejects(service.updateOrganizerEvent(stranger, "existing", form(), String(row.$updatedAt)), { code: "ORGANIZER_REQUIRED" });
  for (const seat of [1, 2, 3]) doc("rsvps", { $id: `rsvp-${seat}`, eventId: "existing", userId: `member-${seat}`, status: "confirmed", seatNumber: seat });
  await assert.rejects(service.updateOrganizerEvent(organizer, "existing", form({ capacity: 2 }), String(row.$updatedAt)), { code: "CAPACITY_TOO_SMALL" });
});
