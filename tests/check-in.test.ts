import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createHmac } from "node:crypto";

let service: typeof import("../lib/services/participation");
const originalFetch = globalThis.fetch;
let rows = new Map<string, Record<string, unknown>>();
let calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
let failParticipation = false;
let memberEnabled = true;
const key = "synthetic-checkin-secret-".repeat(3);
const participantId = "private-member";
const fitnessId = "NF-0123456789ABCDEF";
const operator = { id: "assigned-operator", labels: [] };
const signed = (payload: object) => { const data = Buffer.from(JSON.stringify(payload)).toString("base64url"); return `${data}.${createHmac("sha256", key).update(data).digest("base64url")}`; };

before(async () => {
  Object.assign(process.env, { NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "check-in-test", APPWRITE_KEY: "synthetic-runtime-key", APPWRITE_CHECKIN_SECRET: key, NEXT_PUBLIC_APPWRITE_DATABASE_ID: "check-in-test", ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(name => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${name}`, name.toLowerCase()])) });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); assert.equal(url.origin, "https://appwrite.test");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ path: url.pathname, method, body });
    if (url.pathname === `/v1/users/${participantId}`) return Response.json({ $id: participantId, status: memberEnabled, email: "not-for-operator@example.test", prefs: { private: true } });
    const match = /collections\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(url.pathname); assert.ok(match, url.pathname);
    const [, collection, id] = match;
    const absent = () => Response.json({ code: 404, type: "document_not_found", message: "absent" }, { status: 404 });
    if (method === "GET" && id) return rows.has(`${collection}/${id}`) ? Response.json(rows.get(`${collection}/${id}`)) : absent();
    if (method === "GET") {
      const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
      const documents = [...rows.entries()].filter(([path, row]) => path.startsWith(`${collection}/`) && queries.filter(query => query.method === "equal").every(query => query.values.includes(row[query.attribute]))).map(([, row]) => row);
      return Response.json({ total: documents.length, documents });
    }
    if (method === "POST" || method === "PATCH") {
      if (collection === "participations" && failParticipation) return Response.json({ code: 503, message: "synthetic interruption" }, { status: 503 });
      const documentId = id ?? body.documentId;
      if (method === "POST" && rows.has(`${collection}/${documentId}`)) return Response.json({ code: 409, type: "document_already_exists", message: "conflict" }, { status: 409 });
      const row = { ...rows.get(`${collection}/${documentId}`), ...body.data, $id: documentId, $permissions: body.permissions ?? rows.get(`${collection}/${documentId}`)?.$permissions ?? [] };
      rows.set(`${collection}/${documentId}`, row); return Response.json(row, { status: method === "POST" ? 201 : 200 });
    }
    throw new Error(`Unexpected ${method} ${url.pathname}`);
  };
  service = await import("../lib/services/participation");
});
after(() => { globalThis.fetch = originalFetch; });
function reset() {
  rows = new Map(); calls = []; failParticipation = false; memberEnabled = true;
  rows.set("events/event", { $id: "event", title: "Synthetic session", status: "published", activityId: "running", organizerUserId: operator.id, startsAt: new Date(Date.now() + 10 * 60_000).toISOString(), endsAt: new Date(Date.now() + 70 * 60_000).toISOString() });
  rows.set(`fitness_ids/${participantId}`, { $id: participantId, userId: participantId, publicId: fitnessId, status: "active" });
  rows.set(`profiles/${participantId}`, { $id: participantId, userId: participantId, displayName: "Private participant", visibility: "private", bio: "private biography" });
  rows.set(`rsvps/${service.rsvpDocumentId("event", participantId)}`, { $id: service.rsvpDocumentId("event", participantId), eventId: "event", userId: participantId, status: "confirmed" });
}
async function pass() { return (await service.createParticipantCheckInToken(participantId)).token; }
const writes = () => calls.filter(call => ["POST", "PATCH"].includes(call.method));

test("participant QR is owner-issued, short-lived and contains no account/contact/private profile data", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const result = await service.createParticipantCheckInToken(participantId);
  const payload = JSON.parse(Buffer.from(result.token.split(".")[0], "base64url").toString());
  assert.equal(payload.purpose, "participant-checkin"); assert.equal(payload.fitnessId, fitnessId);
  assert.equal(payload.exp - payload.iat, service.CHECKIN_TOKEN_TTL);
  assert.doesNotMatch(JSON.stringify(payload), /private-member|email|userId|biography|visibility/);
  assert.equal(writes().length, 0);
  rows.get(`fitness_ids/${participantId}`)!.status = "revoked";
  await assert.rejects(service.createParticipantCheckInToken(participantId), /active Fitness ID/);
});

test("assigned operator scans a private participant QR; trusted attendance/passport are duplicate-safe and owner-only", async t => {
  t.mock.method(console, "info", () => {}); reset(); const token = await pass();
  const result = await service.checkInParticipant(operator, "event", token);
  assert.equal(result.displayName, "Private participant"); assert.equal(result.alreadyCheckedIn, false);
  assert.doesNotMatch(JSON.stringify(result), /private-member|userId|email|biography|permissions/);
  const checkin = rows.get(`checkins/${service.checkInDocumentId("event", participantId)}`)!;
  const participation = rows.get(`participations/${service.participationDocumentId("event", participantId)}`)!;
  assert.equal(checkin.userId, participantId); assert.equal(checkin.verificationMethod, "organizer_qr");
  assert.deepEqual(checkin.$permissions, [`read("user:${participantId}")`]);
  assert.equal(participation.status, "verified"); assert.equal(participation.occurredAt, checkin.timestamp);
  const repeated = await service.checkInParticipant(operator, "event", token);
  assert.equal(repeated.alreadyCheckedIn, true); assert.equal(repeated.checkedInAt, result.checkedInAt);
  assert.equal([...rows.keys()].filter(key => key.startsWith("checkins/")).length, 1);
});

test("participants, unrelated operators and label-only organizers cannot create or repair attendance", async t => {
  t.mock.method(console, "info", () => {}); reset(); const token = await pass(); calls = [];
  for (const actor of [{ id: participantId, labels: [] }, { id: "unrelated", labels: ["organizer"] }]) {
    await assert.rejects(service.checkInParticipant(actor, "event", token), /assigned operator/);
  }
  assert.equal(writes().length, 0);
  assert.ok(!calls.some(call => call.path.includes("fitness_ids")), "reject event access before resolving a private participant");
  await service.checkInParticipant({ id: "trusted-admin", labels: ["admin"] }, "event", token);
});

test("new attendance rejects expired/forged/legacy/profile QRs, wrong-event RSVP, bad windows and inactive accounts", async t => {
  t.mock.method(console, "info", () => {});
  for (const condition of ["expired", "forged", "legacy", "profile", "wrong-rsvp", "early", "closed", "cancelled", "inactive", "revoked"]) {
    reset(); let token = await pass();
    if (condition === "expired") token = signed({ v: 1, purpose: "participant-checkin", fitnessId, iat: Date.now() - 10000, exp: Date.now() - 1 });
    if (condition === "forged") token = token.slice(0, -2) + "xx";
    if (condition === "legacy") token = signed({ v: 1, purpose: "event-checkin", eventId: "event", iat: Date.now() - 10, exp: Date.now() + 10000 });
    if (condition === "profile") token = "https://noida.fit/@private-participant";
    if (condition === "wrong-rsvp") rows.delete(`rsvps/${service.rsvpDocumentId("event", participantId)}`);
    if (condition === "early") Object.assign(rows.get("events/event")!, { startsAt: new Date(Date.now() + 90 * 60_000).toISOString(), endsAt: new Date(Date.now() + 150 * 60_000).toISOString() });
    if (condition === "closed") Object.assign(rows.get("events/event")!, { startsAt: new Date(Date.now() - 180 * 60_000).toISOString(), endsAt: new Date(Date.now() - 90 * 60_000).toISOString() });
    if (condition === "cancelled") rows.get("events/event")!.status = "cancelled";
    if (condition === "inactive") memberEnabled = false;
    if (condition === "revoked") rows.get(`fitness_ids/${participantId}`)!.status = "revoked";
    calls = [];
    await assert.rejects(service.checkInParticipant(operator, "event", token), condition);
    assert.equal(writes().length, 0, condition);
  }
  assert.throws(() => service.checkInInputSchema.parse({ eventId: "event", token: "x".repeat(20), userId: "spoofed" }));
});

test("authorized retry repairs interrupted participation after cancellation without changing trusted attendance time", async t => {
  t.mock.method(console, "info", () => {}); reset(); const token = await pass(); failParticipation = true;
  await assert.rejects(service.checkInParticipant(operator, "event", token), /Attendance was recorded/);
  const timestamp = rows.get(`checkins/${service.checkInDocumentId("event", participantId)}`)!.timestamp;
  failParticipation = false; rows.get("events/event")!.status = "cancelled";
  const expired = signed({ v: 1, purpose: "participant-checkin", fitnessId, iat: Date.now() - 10000, exp: Date.now() - 1 });
  await assert.rejects(service.checkInParticipant({ id: "wrong", labels: [] }, "event", expired), /assigned operator/);
  const result = await service.checkInParticipant(operator, "event", expired);
  assert.equal(result.alreadyCheckedIn, true); assert.equal(result.checkedInAt, timestamp);
  assert.equal(rows.get(`participations/${service.participationDocumentId("event", participantId)}`)!.occurredAt, timestamp);
});
