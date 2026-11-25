import assert from "node:assert/strict";
import { before, after, beforeEach, test } from "node:test";
import { createRequire } from "node:module";

const organizer = { id: "club-organizer", labels: [] as string[] };
const stranger = { id: "someone-else", labels: [] as string[] };
const originalFetch = globalThis.fetch;
let service: typeof import("../lib/services/organizer-events");
let rows: Map<string, Record<string, unknown>[]>;
let uploads: { bucket: string; name: string; permissions: string[] }[];
let sequence = 0;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);

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
    APPWRITE_KEY: "synthetic-key", NEXT_PUBLIC_APPWRITE_DATABASE_ID: "organizer-events-test", NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA: "main",
    ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(key => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${key}`, key.toLowerCase()])),
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://appwrite.test", "tests never contact a real backend");
    if (/\/users\//.test(url.pathname)) return Response.json({ $id: url.pathname.split("/").at(-1), status: true });
    const storage = /^\/v1\/storage\/buckets\/([^/]+)\/files$/.exec(url.pathname);
    if (storage && init?.method === "POST") {
      const upload = init.body as FormData;
      uploads.push({ bucket: storage[1], name: (upload.get("file") as File).name, permissions: [...upload.getAll("permissions[]")].map(String) });
      return Response.json({ $id: upload.get("fileId"), bucketId: storage[1] }, { status: 201 });
    }
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
  uploads = [];
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

const eventRow = (id: string) => rows.get("events")!.find(item => item.$id === id)!;
const eventRecord = (id: string) => JSON.parse(String(eventRow(id).payload));

test("a new session takes a banner the organizer uploaded, and nothing else", async () => {
  const created = await service.createOrganizerEvent(organizer, { ...form({ coverImageUrl: "/media/banner123" }), communitySlug: "dawn-runners" });
  assert.equal(eventRecord(created.id).coverImageUrl, "/media/banner123");
  for (const coverImageUrl of ["https://example.com/banner.jpg", "/images/run.jpg", "/media/../secret", "/media/a?x=1", "javascript:alert(1)"]) {
    await assert.rejects(service.createOrganizerEvent(organizer, { ...form({ title: "Another run", coverImageUrl }), communitySlug: "dawn-runners" }), { code: "INVALID_EVENT" }, coverImageUrl);
  }
  const plain = await service.createOrganizerEvent(organizer, { ...form({ title: "No banner run", coverImageUrl: "" }), communitySlug: "dawn-runners" });
  assert.equal("coverImageUrl" in eventRecord(plain.id), false);
});

test("an organizer switches late sign-ups on and off; off leaves nothing behind", async () => {
  const created = await service.createOrganizerEvent(organizer, { ...form({ title: "Walk-in run", lateSignup: true }), communitySlug: "dawn-runners" });
  assert.equal(eventRecord(created.id).lateSignup, true);
  await service.updateOrganizerEvent(organizer, created.id, form({ title: "Walk-in run", lateSignup: false }), String(eventRow(created.id).$updatedAt));
  assert.equal("lateSignup" in eventRecord(created.id), false, "off is the default, so it isn't stored");
  await service.updateOrganizerEvent(organizer, created.id, form({ title: "Walk-in run", lateSignup: true }), String(eventRow(created.id).$updatedAt));
  assert.equal(eventRecord(created.id).lateSignup, true);
  await assert.rejects(service.createOrganizerEvent(organizer, { ...form({ title: "Bad flag", lateSignup: "yes" }), communitySlug: "dawn-runners" }), { code: "INVALID_EVENT" });
});

test("an organizer sets a closing time for sign-ups before the end, and clears it", async () => {
  const closes = new Date(`${futureDate}T00:00:00Z`).toISOString();
  const created = await service.createOrganizerEvent(organizer, { ...form({ title: "Closing run", bookingClosesAt: closes }), communitySlug: "dawn-runners" });
  assert.equal(eventRecord(created.id).bookingClosesAt, closes);
  // The session ends 01:45 UTC: a closing time at or after it is refused.
  await assert.rejects(service.updateOrganizerEvent(organizer, created.id, form({ title: "Closing run", bookingClosesAt: new Date(`${futureDate}T01:45:00Z`).toISOString() }), String(eventRow(created.id).$updatedAt)), { message: /before the session ends/ });
  await service.updateOrganizerEvent(organizer, created.id, form({ title: "Closing run", bookingClosesAt: "" }), String(eventRow(created.id).$updatedAt));
  assert.equal("bookingClosesAt" in eventRecord(created.id), false, "cleared");
  await assert.rejects(service.createOrganizerEvent(organizer, { ...form({ title: "Bad close", bookingClosesAt: "tomorrow" }), communitySlug: "dawn-runners" }), { code: "INVALID_EVENT" });
});

test("editing keeps a banner the team set until the organizer replaces or removes it", async () => {
  eventRow("existing").payload = JSON.stringify({ ...eventRecord("existing"), coverImageUrl: "https://images.unsplash.com/photo-team" });
  const version = () => String(eventRow("existing").$updatedAt);
  await service.updateOrganizerEvent(organizer, "existing", form({ title: "Renamed run" }), version());
  assert.equal(eventRecord("existing").coverImageUrl, "https://images.unsplash.com/photo-team", "an edit that doesn't touch the banner keeps it");
  await assert.rejects(service.updateOrganizerEvent(organizer, "existing", form({ coverImageUrl: "https://example.com/x.png" }), version()), { code: "INVALID_EVENT" });
  await service.updateOrganizerEvent(organizer, "existing", form({ coverImageUrl: "/media/newbanner" }), version());
  assert.equal(eventRecord("existing").coverImageUrl, "/media/newbanner");
  await service.updateOrganizerEvent(organizer, "existing", form({ coverImageUrl: "" }), version());
  assert.equal("coverImageUrl" in eventRecord("existing"), false);
  assert.equal(eventRecord("existing").imageUrl, "/images/run.jpg", "other images stay with the team");
});

test("only club organizers can upload a banner, and only a real image is stored", async () => {
  await assert.rejects(service.uploadOrganizerBanner(stranger, new File([png], "x.png")), { code: "ORGANIZER_REQUIRED" });
  assert.equal(uploads.length, 0);
  const { path } = await service.uploadOrganizerBanner(organizer, new File([png], "../../my banner.svg", { type: "image/svg+xml" }));
  assert.match(path, /^\/media\/[a-zA-Z0-9]+$/);
  assert.deepEqual(uploads.map(upload => ({ ...upload, name: upload.name.replace(/^listing-[a-zA-Z0-9]+/, "listing-<id>") })), [{ bucket: "main", name: "listing-<id>.png", permissions: ['read("any")'] }]);
  await assert.rejects(service.uploadOrganizerBanner(organizer, new File([new TextEncoder().encode("<svg onload=alert(1)>")], "x.png", { type: "image/png" })), { code: "MEDIA_TYPE_UNSUPPORTED" });
  await assert.rejects(service.uploadOrganizerBanner(organizer, "not a file"), { code: "MEDIA_REQUIRED" });
  assert.equal(uploads.length, 1);
});

test("the team's club organizers run every session of their club, and can schedule its first one", async () => {
  const owner = { id: "club-owner", labels: [] as string[] };
  const coOwner = { id: "co-owner", labels: [] as string[] };
  // Other Club has no sessions yet; the team made two people its organizers.
  const club = rows.get("communities")!.find(row => row.slug === "other-club")!;
  club.payload = JSON.stringify({ ...JSON.parse(String(club.payload)), organizerUserIds: [owner.id, coOwner.id] });
  assert.deepEqual((await service.organizerClubs(owner)).map(community => community.slug), ["other-club"]);
  const created = await service.createOrganizerEvent(owner, { ...form(), communitySlug: "other-club" });
  assert.deepEqual(eventRecord(created.id).organizerUserIds, [owner.id]);
  assert.equal(eventRow(created.id).organizerUserId, owner.id, "the column keeps the first organizer");
  // The club's other organizer runs it too, though they didn't create it, and editing keeps the assignments.
  const stored = await service.getManagedEventRecord(coOwner, created.id);
  await service.updateOrganizerEvent(coOwner, created.id, form({ title: "Renamed by the co-owner" }), stored.updatedAt);
  assert.equal(eventRecord(created.id).title, "Renamed by the co-owner");
  assert.deepEqual(eventRecord(created.id).organizerUserIds, [owner.id]);
  // Only their own club.
  await assert.rejects(service.getManagedEventRecord(owner, "existing"), { code: "ORGANIZER_REQUIRED" });
  await assert.rejects(service.createOrganizerEvent(owner, { ...form(), communitySlug: "dawn-runners" }), { code: "ORGANIZER_REQUIRED" });
});

test("an event's co-organizers run that session, and an older single organizer becomes the first of the list", async () => {
  const coHost = { id: "co-host", labels: [] as string[] };
  await assert.rejects(service.getManagedEventRecord(coHost, "existing"), { code: "ORGANIZER_REQUIRED" });
  const legacy = await service.getManagedEventRecord(organizer, "existing");
  assert.deepEqual(legacy.record.organizerUserIds, [organizer.id]);
  assert.equal("organizerUserId" in legacy.record, false);
  const existing = eventRow("existing");
  existing.payload = JSON.stringify({ ...JSON.parse(String(existing.payload)), organizerUserIds: [organizer.id, coHost.id] });
  const stored = await service.getManagedEventRecord(coHost, "existing");
  await service.updateOrganizerEvent(coHost, "existing", form({ title: "Co-hosted run" }), stored.updatedAt);
  assert.equal(eventRecord("existing").title, "Co-hosted run");
  assert.deepEqual(eventRecord("existing").organizerUserIds, [organizer.id, coHost.id]);
  assert.equal(eventRecord("existing").organizerUserId, undefined, "the payload holds only the list");
  assert.equal(eventRow("existing").organizerUserId, organizer.id);
  // Co-hosting one session lets them schedule for its club, but not for another.
  assert.deepEqual((await service.organizerClubs(coHost)).map(community => community.slug), ["dawn-runners"]);
  await assert.rejects(service.createOrganizerEvent(coHost, { ...form(), communitySlug: "other-club" }), { code: "ORGANIZER_REQUIRED" });
});

test("an older event's organizer comes only from its database column, as before; a stale payload copy grants nothing", async () => {
  const { organizerIdsOf } = await import("../lib/services/organizers");
  assert.deepEqual(organizerIdsOf({ organizerUserId: "column", payload: JSON.stringify({ organizerUserId: "stale" }) }), ["column"]);
  assert.deepEqual(organizerIdsOf({ organizerUserId: null, payload: JSON.stringify({ organizerUserId: "stale" }) }), []);
  assert.deepEqual(organizerIdsOf({ organizerUserId: "column", payload: JSON.stringify({ organizerUserIds: ["co-host", "column"] }) }), ["co-host", "column"]);
  assert.deepEqual(organizerIdsOf({ organizerUserIds: ["a", "a", "b"], organizerUserId: "c" }), ["a", "b", "c"]);
  assert.deepEqual(organizerIdsOf({ payload: "not json" }), []);
});

test("organizers manage a paid session's discount codes from its dashboard, and editing the session keeps them", async () => {
  process.env.APPWRITE_CHECKIN_SECRET = "synthetic-checkin-secret-".repeat(3);
  const coupons = await import("../lib/services/event-coupons");
  const stored = await service.getManagedEventRecord(organizer, "existing");
  await service.updateOrganizerEvent(organizer, "existing", form({ price: "₹199" }), stored.updatedAt);
  const [created] = await coupons.createEventCoupon(organizer, "existing", { code: "early20", kind: "percent", value: 20, maxUses: 5 });
  assert.deepEqual({ code: created.code, kind: created.kind, value: created.value, maxUses: created.maxUses, uses: created.uses }, { code: "EARLY20", kind: "percent", value: 20, maxUses: 5, uses: 0 });
  assert.ok(!String(eventRow("existing").payload).includes("EARLY20"), "stored encrypted");
  await assert.rejects(coupons.createEventCoupon(organizer, "existing", { code: "EARLY20", kind: "flat", value: 10 }), { code: "COUPON_EXISTS" });
  await assert.rejects(coupons.createEventCoupon(organizer, "existing", { code: "x", kind: "flat", value: 10 }), { code: "INVALID_COUPON" });
  await assert.rejects(coupons.createEventCoupon(stranger, "existing", { code: "MINE", kind: "flat", value: 10 }), { code: "ORGANIZER_REQUIRED" });
  doc("rsvps", { $id: "paid-1", eventId: "existing", userId: "member-1", status: "confirmed", seatNumber: 1, amount: 15900, paymentStatus: "paid", paymentRef: `payu:NFabc:1;c=${created.id}` });
  assert.equal((await coupons.listEventCoupons(organizer, "existing"))[0].uses, 1);

  assert.equal((await coupons.updateEventCoupon(organizer, "existing", created.id, { paused: true }))[0].paused, true);
  // Editing the session's details leaves its codes alone.
  const latest = await service.getManagedEventRecord(organizer, "existing");
  await service.updateOrganizerEvent(organizer, "existing", form({ price: "₹199", title: "Renamed" }), latest.updatedAt);
  assert.equal(eventRecord("existing").coupons.length, 1);
  assert.equal((await coupons.updateEventCoupon(organizer, "existing", created.id, { paused: false }))[0].paused, undefined);
  assert.deepEqual(await coupons.deleteEventCoupon(organizer, "existing", created.id), []);
  assert.equal(eventRecord("existing").coupons, undefined);

  const free = await service.getManagedEventRecord(organizer, "existing");
  await service.updateOrganizerEvent(organizer, "existing", form({ price: "FREE" }), free.updatedAt);
  await assert.rejects(coupons.createEventCoupon(organizer, "existing", { code: "FREEBIE", kind: "flat", value: 10 }), { code: "COUPON_FREE_EVENT" });
});
