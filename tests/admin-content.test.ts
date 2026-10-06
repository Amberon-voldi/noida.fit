import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";
import { contentCreateSchemas, contentSchemas, contentTemplates, validateRecord, validateSchedule } from "../lib/content-schema";

const actor = { id: "admin-test", labels: ["admin"] };
const version = "2026-09-30T00:00:00.000Z";
const originalFetch = globalThis.fetch;
let service: typeof import("../lib/admin/content");
let rows = new Map<string, Record<string, unknown>[]>();
let writes: { collection: string; method: string; body: Record<string, unknown> }[] = [];
let sequence = 0;
let failCollection = "";
let navigationPath: string;
let navigationCache: NodeJS.Module | undefined;

before(async () => {
  // Next's bundler resolves the server navigation entry. node/tsx instead loads
  // the client entry; use the real server entry without mounting a React router.
  const require = createRequire(import.meta.url);
  navigationPath = require.resolve("next/navigation");
  navigationCache = require.cache[navigationPath];
  require.cache[navigationPath] = { id: navigationPath, filename: navigationPath, loaded: true, exports: require("next/dist/client/components/navigation.react-server") } as NodeJS.Module;
  Object.assign(process.env, {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "content-test",
    APPWRITE_KEY: "synthetic-key", NEXT_PUBLIC_APPWRITE_DATABASE_ID: "content-test", APPWRITE_ADMIN_AUDIT_COLLECTION_ID: "audit",
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
    if (failCollection === collection) return Response.json({ code: 503, type: "general_unknown", message: "Synthetic failure" }, { status: 503 });
    const current = rows.get(collection) ?? [];
    if (method === "GET" && id) {
      const row = current.find(item => item.$id === id);
      return row ? Response.json(row) : Response.json({ code: 404, type: "document_not_found", message: "Synthetic absent row" }, { status: 404 });
    }
    if (method === "GET") {
      const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
      let documents = current.filter(row => queries.filter(query => query.method === "equal").every(query => query.values.includes(row[query.attribute])));
      const total = documents.length;
      const cursor = queries.find(query => query.method === "cursorAfter");
      if (cursor) documents = documents.slice(documents.findIndex(row => row.$id === cursor.values[0]) + 1);
      documents = documents.slice(0, queries.find(query => query.method === "limit")?.values[0] ?? 25);
      return Response.json({ total, documents });
    }
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    writes.push({ collection, method, body });
    if (method === "DELETE") { rows.set(collection, current.filter(row => row.$id !== id)); return new Response(null, { status: 204 }); }
    assert.ok(["POST", "PATCH", "PUT"].includes(method));
    const documentId = id ?? String(body.documentId);
    const data = body.data as Record<string, unknown>;
    if (!id && current.some(row => row.$id === documentId || (collection !== "audit" && row.slug === data.slug))) return Response.json({ code: 409, type: "document_already_exists", message: "Synthetic conflict" }, { status: 409 });
    const row = { ...(id ? current.find(item => item.$id === id) : {}), ...data, $id: documentId, $updatedAt: new Date(Date.parse(version) + ++sequence * 1000).toISOString(), $permissions: body.permissions ?? [] };
    rows.set(collection, [...current.filter(item => item.$id !== documentId), row]);
    return Response.json(row, { status: id ? 200 : 201 });
  };
  service = await import("../lib/admin/content");
});
after(() => {
  globalThis.fetch = originalFetch;
  const require = createRequire(import.meta.url);
  if (navigationCache) require.cache[navigationPath] = navigationCache; else delete require.cache[navigationPath];
});
function fixture() { rows = new Map(); writes = []; sequence = 0; failCollection = ""; process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID = "audit"; }
function put(kind: keyof typeof contentSchemas, id: string, changes: Record<string, unknown> = {}): Record<string, unknown> {
  const record = { ...contentTemplates[kind], id, ...changes };
  const row = { ...record, payload: JSON.stringify(record), $id: id, $updatedAt: version, $permissions: ["private"], unknownColumn: "must-not-escape" };
  rows.set(kind, [...(rows.get(kind) ?? []), row]);
  return record;
}
function contentWrites() { return writes.filter(write => write.collection !== "audit"); }

test("strict schemas accept existing nested fields and safe images, but reject HTML and metadata", () => {
  for (const kind of ["activities", "communities", "places", "events"] as const) assert.equal(contentCreateSchemas[kind].parse(contentTemplates[kind]).status, "draft");
  const activity = { ...contentTemplates.activities, id: "activity-1" };
  for (const imageUrl of ["/images/activity.jpg", "https://example.test/image.jpg"]) assert.equal(validateRecord("activities", { ...activity, imageUrl }).id, "activity-1");
  for (const imageUrl of ["https://", "http://example.test/image.jpg", "/images/../secret", "//example.test/image.jpg", "javascript:alert(1)"]) assert.throws(() => validateRecord("activities", { ...activity, imageUrl }));
  for (const extra of [{ description: "<script>alert(1)</script>" }, { unknown: true }, { $permissions: ["write(any)"] }]) assert.throws(() => validateRecord("activities", { ...activity, ...extra }));
  assert.throws(() => contentCreateSchemas.activities.parse(activity), "creates never accept an existing record ID");
  assert.throws(() => validateRecord("events", { ...contentTemplates.events, id: "event", attendeesCount: 99 }));
});

test("shared schemas remain compatible with the existing public seed record shapes", async () => {
  const seed = await import("../data/seed");
  for (const kind of ["activities", "communities", "places", "events"] as const) {
    for (const record of seed[kind]) validateSchedule(validateRecord(kind, record));
  }
});

test("content body allowance remains bounded at 64KiB, without changing the default limit", async () => {
  const { readJson } = await import("../lib/http");
  const { z } = await import("zod");
  const schema = z.object({ text: z.string() });
  const request = (size: number) => new Request("https://noida.fit/api/admin/content/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "a".repeat(size) }) });
  assert.equal((await readJson(request(12000), schema, 65536)).text.length, 12000);
  await assert.rejects(readJson(request(65536), schema, 65536), /too large/);
  await assert.rejects(readJson(request(12000), schema), /too large/);
});

test("event schedule rejects rollover, timestamp/display disagreement and reversed bounds", () => {
  const event = { ...contentTemplates.events, id: "event" };
  validateSchedule(validateRecord("events", event));
  const invalid = [
    { startsAt: "2026-01-01T08:00:00+05:30" }, { endsAt: "2026-01-01T05:00:00+05:30" },
    { date: "2026-02-30" }, { date: "2026-99-99" }, { startTime: "25:00 AM" }, { endTime: "07:99 AM" },
  ];
  for (const fields of invalid) assert.throws(() => validateSchedule(validateRecord("events", { ...event, ...fields })));
  validateSchedule(validateRecord("events", { ...event, startTime: "11:00 PM", startsAt: "2026-01-01T23:00:00+05:30", endsAt: "2026-01-02T07:00:00+05:30" }));
});

test("CRUD is explicit, audited, searchable, read-only ACL and stale-form protected", async t => {
  t.mock.method(console, "info", () => {}); fixture();
  const created = await service.createAdminContent(actor, "activities", contentTemplates.activities, "Create local activity draft");
  assert.equal(contentWrites()[0].method, "POST");
  assert.equal(writes[0].collection, "audit", "durable audit intent precedes content write");
  assert.deepEqual(contentWrites()[0].body.permissions, []);
  assert.ok(created.id); assert.equal(created.record.status, "draft");
  const published = await service.updateAdminContent(actor, "activities", created.id, { ...created.record, status: "published", name: "Local runners" }, created.updatedAt, "Publish reviewed activity");
  assert.deepEqual(contentWrites().at(-1)?.body.permissions, ['read("any")']);
  assert.equal((await service.listAdminContent(actor, "activities", { search: "runners", status: "published" })).length, 1);
  assert.equal((await service.listAdminContent(actor, "activities", { status: "draft" })).length, 0);
  assert.doesNotMatch(JSON.stringify(await service.listAdminContent(actor, "activities")), /\$permissions|unknownColumn/);
  const count = contentWrites().length;
  await assert.rejects(service.updateAdminContent(actor, "activities", created.id, published.record, created.updatedAt, "Stale form write"), /reload/);
  await assert.rejects(service.updateAdminContent(actor, "activities", created.id, published.record, undefined, "Missing version"), /reload/);
  assert.equal(contentWrites().length, count);
  const privateAgain = await service.updateAdminContent(actor, "activities", created.id, { ...published.record, status: "draft" }, published.updatedAt, "Unpublish activity for review");
  assert.deepEqual(contentWrites().at(-1)?.body.permissions, []);
  await assert.rejects(service.deleteAdminContent(actor, "activities", created.id, "wrong", "Remove draft", privateAgain.updatedAt), /exact record ID/);
  await service.deleteAdminContent(actor, "activities", created.id, created.id, "Remove unused draft", privateAgain.updatedAt);
  assert.equal((await service.listAdminContent(actor, "activities")).length, 0);
  assert.ok(contentWrites().every(write => ["POST", "PATCH", "DELETE"].includes(write.method)), "no PUT/upsert calls");
});

test("create conflicts never overwrite existing content and lists paginate", async t => {
  t.mock.method(console, "info", () => {}); fixture();
  const existing = put("activities", "existing", { name: "Existing record" });
  await assert.rejects(service.createAdminContent(actor, "activities", contentTemplates.activities, "Create duplicate slug"));
  assert.equal(rows.get("activities")?.length, 1);
  assert.equal(JSON.parse(String(rows.get("activities")?.[0].payload)).name, existing.name);
  assert.ok(contentWrites().every(write => write.method === "POST"));
  for (let i = 0; i < 205; i++) put("activities", `activity-${i}`, { slug: `activity-${i}` });
  assert.equal((await service.listAdminContent(actor, "activities")).length, 206);
});

test("authorization and audit failure prevent backend content writes", async t => {
  t.mock.method(console, "info", () => {}); fixture();
  await assert.rejects(service.listAdminContent({ id: "member", labels: [] }, "events"), /Administrator/);
  await assert.rejects(service.createAdminContent({ id: "member", labels: [] }, "activities", contentTemplates.activities, "Create new draft"), /Administrator/);
  await assert.rejects(service.createAdminContent(actor, "activities", contentTemplates.activities, ""), /reason/);
  delete process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID;
  await assert.rejects(service.createAdminContent(actor, "activities", contentTemplates.activities, "Create new draft"), /audit/);
  process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID = "audit"; failCollection = "audit";
  await assert.rejects(service.createAdminContent(actor, "activities", contentTemplates.activities, "Create new draft"), /audit/);
  assert.deepEqual(contentWrites(), []);
});

test("published event references, capacity seats and organizer assignment remain validated", async t => {
  t.mock.method(console, "info", () => {}); fixture();
  put("activities", "activity-running", { status: "published" });
  put("communities", "community", { status: "published", slug: "new-community" });
  put("places", "place", { status: "published", slug: "new-place" });
  const record = put("events", "event", { status: "draft", organizerUserId: "organizer-1" });
  rows.set("rsvps", [{ $id: "reservation", eventId: "event", status: "confirmed", seatNumber: 20 }]);
  await assert.rejects(service.updateAdminContent(actor, "events", "event", { ...record, capacity: 5 }, version, "Reduce event capacity"), /allocated seats/);
  rows.set("places", []);
  await assert.rejects(service.updateAdminContent(actor, "events", "event", { ...record, status: "published" }, version, "Publish reviewed event"), /published.*references/);
  put("places", "place", { status: "published", slug: "new-place" });
  const withoutOrganizer = { ...record };
  delete withoutOrganizer.organizerUserId;
  const result = await service.updateAdminContent(actor, "events", "event", { ...withoutOrganizer, status: "published" }, version, "Publish and clear organizer");
  assert.equal(result.record.organizerUserId, undefined);
  assert.equal((contentWrites().at(-1)?.body.data as Record<string, unknown>).organizerUserId, null);
});

test("all historical reference kinds block deletion; unrelated IDs do not", async t => {
  t.mock.method(console, "info", () => {});
  const cases: [keyof typeof contentSchemas, string, Record<string, unknown>][] = [
    ["events", "rsvps", { eventId: "target", status: "cancelled" }],
    ["events", "checkins", { eventId: "target" }],
    ["events", "participations", { eventId: "target" }],
    ["events", "saved_items", { itemId: "target", itemType: "event" }],
    ["activities", "participations", { activityId: "target" }],
    ["communities", "memberships", { communityId: "target", status: "inactive" }],
    ["places", "saved_items", { itemId: "target", itemType: "place" }],
    ["communities", "events", { communitySlug: "new-community", status: "cancelled" }],
    ["places", "events", { venueSlug: "new-place", status: "draft" }],
  ];
  for (const [kind, collection, link] of cases) {
    fixture(); put(kind, "target"); rows.set(collection, [{ $id: "link", ...link }]);
    await assert.rejects(service.deleteAdminContent(actor, kind, "target", "target", "Delete unused record", version), /preserve history/);
    assert.deepEqual(contentWrites(), [], `${kind} must retain ${collection} history`);
  }
  fixture(); put("events", "target"); rows.set("rsvps", [{ $id: "unrelated", eventId: "other" }]);
  await service.deleteAdminContent(actor, "events", "target", "target", "Delete unused record", version);
  assert.equal(contentWrites().at(-1)?.method, "DELETE");
  assert.equal(rows.get("rsvps")?.length, 1);
});

test("slug edits cannot orphan linked events and backend reference failures fail closed", async t => {
  t.mock.method(console, "info", () => {}); t.mock.method(console, "error", () => {}); fixture();
  const record = put("communities", "community");
  put("events", "event", { communitySlug: "new-community", status: "cancelled" });
  await assert.rejects(service.updateAdminContent(actor, "communities", "community", { ...record, slug: "renamed-community" }, version, "Rename community URL"), /preserve existing references/);
  failCollection = "events";
  await assert.rejects(service.deleteAdminContent(actor, "communities", "community", "community", "Delete draft community", version));
  assert.deepEqual(contentWrites(), []);
});
