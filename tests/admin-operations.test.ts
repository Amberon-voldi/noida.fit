import assert from "node:assert/strict";
import { before, after, test } from "node:test";

let members: typeof import("../lib/admin/members");
let attendance: typeof import("../lib/admin/attendance");
let summary: typeof import("../lib/services/admin");
const originalFetch = globalThis.fetch;
let rows = new Map<string, Record<string, unknown>[]>();
let calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
let auditFailure = false;
let auditFinishFailure = false;
const actor = { id: "operator", labels: ["admin"] };
let target = { $id: "member", name: "Test Member", email: "must-not-escape@example.test", prefs: { private: true }, labels: ["captain", "admin"], status: true, emailVerification: false, $createdAt: "2026-09-01T00:00:00Z" };

before(async () => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "operations-test", APPWRITE_KEY: "synthetic-admin-key", NEXT_PUBLIC_APPWRITE_DATABASE_ID: "operations-test", APPWRITE_ADMIN_AUDIT_COLLECTION_ID: "audit",
    ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(key => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${key}`, key.toLowerCase()])),
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); assert.equal(url.origin, "https://appwrite.test");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ path: url.pathname, method, body });
    if (url.pathname === "/v1/users") return Response.json({ total: 1, users: [target] });
    if (url.pathname === "/v1/users/member" && method === "GET") return Response.json(target);
    if (url.pathname.endsWith("/users/member/labels")) { target = { ...target, labels: body.labels }; return Response.json(target); }
    if (url.pathname.endsWith("/users/member/status")) { target = { ...target, status: body.status }; return Response.json(target); }
    if (url.pathname.endsWith("/users/member/sessions") && method === "DELETE") return new Response(null, { status: 204 });
    const match = /collections\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(url.pathname); assert.ok(match, url.pathname);
    const [, collection, id] = match;
    const current = rows.get(collection) ?? [];
    if (collection === "audit" && (auditFailure || (auditFinishFailure && method === "PATCH"))) return Response.json({ code: 503, message: "private failure" }, { status: 503 });
    const absent = () => Response.json({ code: 404, message: "absent", type: "document_not_found" }, { status: 404 });
    if (method === "GET" && id) return current.find(row => row.$id === id) ? Response.json(current.find(row => row.$id === id)) : absent();
    if (method === "GET") {
      const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
      let list = current.filter(row => queries.filter(query => query.method === "equal").every(query => query.values.includes(row[query.attribute])));
      const total = list.length;
      const cursor = queries.find(query => query.method === "cursorAfter"); if (cursor) list = list.slice(list.findIndex(row => row.$id === cursor.values[0]) + 1);
      const offset = queries.find(query => query.method === "offset")?.values[0] ?? 0;
      const limit = queries.find(query => query.method === "limit")?.values[0] ?? 25;
      return Response.json({ total, documents: list.slice(offset, offset + limit) });
    }
    if (method === "POST" || method === "PATCH") {
      const documentId = id ?? body.documentId;
      const existing = current.find(row => row.$id === documentId);
      const row = { ...existing, ...body.data, $id: documentId, $updatedAt: "2026-09-30T00:00:00Z" };
      rows.set(collection, [...current.filter(row => row.$id !== documentId), row]); return Response.json(row, { status: method === "POST" ? 201 : 200 });
    }
    throw new Error(`Unexpected ${method} ${url.pathname}`);
  };
  members = await import("../lib/admin/members"); attendance = await import("../lib/admin/attendance"); summary = await import("../lib/services/admin");
});
after(() => { globalThis.fetch = originalFetch; });
function reset() { rows = new Map(); calls = []; auditFailure = false; auditFinishFailure = false; process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID = "audit"; target = { ...target, labels: ["captain", "admin"], status: true }; }

test("member DTO is minimized; access writes preserve unrelated labels and are durably audited", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const listing = await members.listAdminMembers(actor);
  assert.equal(listing.total, 1); assert.equal(listing.members[0].admin, true);
  assert.doesNotMatch(JSON.stringify(listing), /must-not-escape|email\"|prefs|private/);
  await members.manageAdminMember(actor, { userId: "member", action: "remove-admin", confirmation: "member", reason: "Remove temporary admin access" });
  assert.deepEqual(target.labels, ["captain"]);
  const write = calls.findIndex(call => call.path.endsWith("/users/member/labels"));
  assert.ok(calls.slice(0, write).some(call => call.path.includes("/audit/documents") && call.method === "POST"));
  await members.manageAdminMember(actor, { userId: "member", action: "grant-admin", confirmation: "member", reason: "Assign authorized operator" });
  assert.deepEqual(target.labels, ["captain", "admin"]);
  await members.manageAdminMember(actor, { userId: "member", action: "suspend", confirmation: "member", reason: "Confirmed safety incident" });
  assert.equal(target.status, false);
  await members.manageAdminMember(actor, { userId: "member", action: "restore", confirmation: "member", reason: "Incident review completed" });
  assert.equal(target.status, true);
});

test("self-action, unconfirmed, unauthorized and failed audit paths cannot modify member access", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const input = { userId: "member", action: "suspend" as const, confirmation: "member", reason: "Safety review action" };
  await assert.rejects(members.manageAdminMember({ id: "member", labels: [] }, input), /Administrator/);
  await assert.rejects(members.manageAdminMember(actor, { ...input, userId: "operator", confirmation: "operator" }), /own account/);
  await assert.rejects(members.manageAdminMember(actor, { ...input, confirmation: "other" }), /confirm/);
  auditFailure = true;
  await assert.rejects(members.manageAdminMember(actor, input), /audit/);
  assert.ok(!calls.some(call => call.method === "PATCH" && call.path.includes("/users/")));
});

test("audit completion failure reports an unknown outcome rather than inviting a duplicate write", async t => {
  t.mock.method(console, "info", () => {}); reset(); auditFinishFailure = true;
  await assert.rejects(members.manageAdminMember(actor, { userId: "member", action: "suspend", confirmation: "member", reason: "Audited safety review" }), (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "AUDIT_COMPLETION_PENDING"));
  assert.equal(target.status, false, "the action completed before audit finalization failed");
  assert.equal(rows.get("audit")?.[0].status, "started", "durable intent remains available for investigation");
});

test("attendance reconciles orphan check-ins and repairs only existing trusted records", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const { checkInDocumentId, participationDocumentId } = await import("../lib/services/participation");
  const timestamp = "2026-09-01T00:30:00Z";
  rows.set("events", [{ $id: "event", title: "Historical session", status: "cancelled", activityId: "running", startsAt: "2026-09-01T00:30:00Z", endsAt: "2026-09-01T01:30:00Z" }]);
  rows.set("profiles", [{ $id: "member", displayName: "Test member", email: "hidden@example.test", bio: "private biography" }]);
  rows.set("rsvps", [{ $id: "rsvp", eventId: "event", userId: "planned", status: "confirmed" }]);
  rows.set("checkins", [{ $id: checkInDocumentId("event", "member"), eventId: "event", userId: "member", timestamp, verificationMethod: "organizer_qr" }]);
  rows.set("participations", [{ $id: participationDocumentId("event", "member"), eventId: "event", userId: "member", occurredAt: timestamp, status: "pending" }]);
  const roster = await attendance.getAdminAttendance(actor, "event");
  assert.equal(roster.total, 2); assert.equal(roster.needsRepair, 1); assert.equal(roster.checkins, 1);
  assert.doesNotMatch(JSON.stringify(roster), /hidden@example|biography|permissions/);
  await attendance.repairAdminAttendance(actor, { eventId: "event", userId: "member", reason: "Repair interrupted passport write" });
  const repaired = rows.get("participations")?.[0];
  assert.equal(repaired?.status, "verified"); assert.equal(repaired?.occurredAt, timestamp); assert.equal(repaired?.source, "organizer_checkin");
  assert.equal((await attendance.getAdminAttendance(actor, "event")).needsRepair, 0);
  await assert.rejects(attendance.repairAdminAttendance(actor, { eventId: "event", userId: "planned", reason: "No check-in must not create credit" }), /No trusted attendance/);
  assert.equal(rows.get("checkins")?.length, 1);
});

test("summary handles private collection projections and exposes only aggregate content/member data", async t => {
  t.mock.method(console, "info", () => {}); reset();
  rows.set("saved_items", [{ $id: "bookmark", itemType: "event", userId: "private-person" }]);
  const data = await summary.getAdminDashboardData(actor);
  assert.equal(data.participation.savedItems, 1); assert.equal(data.users.total, 1);
  assert.equal(data.backendError, undefined);
  assert.doesNotMatch(JSON.stringify(data), /must-not-escape@example|private-person|synthetic-admin-key/);
  await assert.rejects(summary.getAdminDashboardData({ id: "ordinary", labels: [] }), /Administrator/);
});
