import assert from "node:assert/strict";
import { after, before, test } from "node:test";

// Isolated SDK transport: no credentials, accounts or live Appwrite mutations.
let service: typeof import("../lib/services/participation");
const originalFetch = globalThis.fetch;
let rows = new Map<string, Record<string, unknown>>();
let writes: { method: string; collection: string; data?: Record<string, unknown> }[] = [];
let ticketSchema = true;
const member = "ticket-member";
const fitnessId = "NF-0123456789ABCDEF";
const operator = { id: "assigned-operator", labels: [] };

before(async () => {
  Object.assign(process.env, { NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "tickets-test", APPWRITE_KEY: "synthetic-runtime-key", APPWRITE_CHECKIN_SECRET: "synthetic-checkin-secret-".repeat(3), NEXT_PUBLIC_APPWRITE_DATABASE_ID: "tickets-test", ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(name => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${name}`, name.toLowerCase()])) });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); assert.equal(url.origin, "https://appwrite.test");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.pathname === `/v1/users/${member}`) return Response.json({ $id: member, status: true });
    const match = /collections\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(url.pathname); assert.ok(match, url.pathname);
    const [, collection, id] = match;
    const key = `${collection}/${id ?? body.documentId}`;
    if (method === "GET" && id) return rows.has(key) ? Response.json(rows.get(key)) : Response.json({ code: 404, type: "document_not_found", message: "absent" }, { status: 404 });
    if (method === "GET") {
      const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
      const documents = [...rows.entries()].filter(([path, row]) => path.startsWith(`${collection}/`) && queries.filter(query => query.method === "equal").every(query => query.values.includes(row[query.attribute]))).map(([, row]) => row);
      return Response.json({ total: documents.length, documents });
    }
    writes.push({ method, collection, data: body.data });
    if (method === "DELETE") { rows.delete(key); return new Response(null, { status: 204 }); }
    // A project where `npm run appwrite:setup` has not yet added the ticket attributes.
    if (!ticketSchema && body.data && "amount" in body.data) return Response.json({ code: 400, type: "document_invalid_structure", message: "Unknown attribute: amount" }, { status: 400 });
    if (method === "POST" && rows.has(key)) return Response.json({ code: 409, type: "document_already_exists", message: "conflict" }, { status: 409 });
    const row = { ...rows.get(key), ...body.data, $id: id ?? body.documentId };
    rows.set(key, row);
    return Response.json(row, { status: method === "POST" ? 201 : 200 });
  };
  service = await import("../lib/services/participation");
});
after(() => { globalThis.fetch = originalFetch; });

function reset() {
  rows = new Map(); writes = []; ticketSchema = true;
  const schedule = { status: "published", activityId: "running", capacity: 2, organizerUserId: operator.id, startsAt: new Date(Date.now() + 10 * 60_000).toISOString(), endsAt: new Date(Date.now() + 70 * 60_000).toISOString() };
  rows.set("events/paid", { $id: "paid", title: "Synthetic paid session", ...schedule, payload: JSON.stringify({ price: "₹199" }) });
  rows.set("events/free", { $id: "free", title: "Synthetic free session", ...schedule, payload: JSON.stringify({ price: "FREE" }) });
  rows.set(`fitness_ids/${member}`, { $id: member, userId: member, publicId: fitnessId, status: "active" });
  rows.set(`profiles/${member}`, { $id: member, userId: member, displayName: "Ticket holder" });
}
const ticketRow = (eventId: string, userId = member) => rows.get(`rsvps/${service.rsvpDocumentId(eventId, userId)}`);

test("a paid event issues a ticket only at the price the member confirmed; free RSVPs are unchanged", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const rsvp = await service.createRsvp(member, "free");
  assert.equal("amount" in rsvp, false); assert.equal("paymentStatus" in rsvp, false);
  assert.equal("amount" in writes[0].data!, false, "free RSVPs never send ticket attributes");
  writes = [];
  await assert.rejects(service.createRsvp(member, "paid"), { code: "PRICE_CHANGED" });
  await assert.rejects(service.createRsvp(member, "paid", 14900), { code: "PRICE_CHANGED" });
  await assert.rejects(service.createRsvp("other-member", "free", 19900), { code: "PRICE_CHANGED" });
  assert.equal(writes.length, 0);
  const ticket = await service.createRsvp(member, "paid", 19900);
  assert.deepEqual({ amount: ticket.amount, paymentStatus: ticket.paymentStatus, seatNumber: ticket.seatNumber, status: ticket.status }, { amount: 19900, paymentStatus: "pending", seatNumber: 1, status: "confirmed" });
  assert.deepEqual(await service.createRsvp(member, "paid", 19900), ticket, "a retry returns the same ticket");
  assert.equal(writes.length, 1);
  // A later price change never rewrites a ticket already issued.
  rows.get("events/paid")!.payload = JSON.stringify({ price: "₹249" });
  assert.equal((await service.getUserRsvp("paid", member))?.amount, 19900);
  assert.equal((await service.createRsvp("other-member", "paid", 24900)).amount, 24900);
  assert.throws(() => service.rsvpInputSchema.parse({ eventId: "paid", amount: 199.5 }));
  assert.throws(() => service.rsvpInputSchema.parse({ eventId: "paid", amount: 19900, userId: "spoofed" }));
});

test("tickets fail closed, without a free seat, until the ticket attributes are provisioned", async t => {
  t.mock.method(console, "info", () => {}); reset(); ticketSchema = false;
  await assert.rejects(service.createRsvp(member, "paid", 19900), { code: "TICKETS_NOT_CONFIGURED", status: 503 });
  assert.equal(ticketRow("paid"), undefined);
  assert.equal((await service.createRsvp(member, "free")).status, "confirmed");
});

test("payment confirmation is amount-checked and idempotent, and a paid ticket cannot be cancelled away", async t => {
  t.mock.method(console, "info", () => {}); reset();
  await service.createRsvp(member, "paid", 19900);
  await service.createRsvp(member, "free");
  await service.createRsvp("other-member", "paid", 19900);
  await assert.rejects(service.confirmTicketPayment("paid", member, 100, "pay_synthetic"), { code: "AMOUNT_MISMATCH" });
  await assert.rejects(service.confirmTicketPayment("free", member, 19900, "pay_synthetic"), { code: "TICKET_NOT_FOUND" });
  assert.equal(ticketRow("paid")!.paymentStatus, "pending");
  writes = [];
  assert.equal((await service.confirmTicketPayment("paid", member, 19900, "pay_synthetic")).paymentStatus, "paid");
  assert.equal((await service.confirmTicketPayment("paid", member, 19900, "pay_repeat")).paymentStatus, "paid");
  assert.equal(writes.length, 1);
  assert.equal(ticketRow("paid")!.paymentRef, "pay_synthetic");
  await assert.rejects(service.cancelRsvp(member, "paid"), { code: "TICKET_PAID" });
  assert.ok(ticketRow("paid"));
  await service.cancelRsvp("other-member", "paid");
  assert.equal(ticketRow("paid", "other-member"), undefined, "an unpaid ticket can still be cancelled");
});

test("the check-in desk and guest list see what is still due, never account IDs", async t => {
  t.mock.method(console, "info", () => {}); reset();
  await service.createRsvp(member, "paid", 19900);
  const organizer = await import("../lib/services/organizer");
  const event = { id: "paid", slug: "paid", title: "Synthetic paid session", status: "published", organizerUserId: operator.id, capacity: 2, startsAt: rows.get("events/paid")!.startsAt, endsAt: rows.get("events/paid")!.endsAt } as unknown as import("../types/event").Event;
  const summary = await organizer.getOrganizerEventSummary(operator, event);
  assert.deepEqual(summary.attendees, [{ displayName: "Ticket holder", rsvpStatus: "confirmed", seatNumber: 1, ticket: { amount: 19900, paid: false }, checkInStatus: "not_checked_in" }]);
  assert.ok(!JSON.stringify(summary).includes(member));
  const { token } = await service.createParticipantCheckInToken(member);
  const result = await service.checkInParticipant(operator, "paid", token);
  assert.equal(result.amountDue, 19900);
  reset();
  await service.createRsvp(member, "paid", 19900);
  await service.confirmTicketPayment("paid", member, 19900, "pay_synthetic");
  assert.equal("amountDue" in await service.checkInParticipant(operator, "paid", token), false);
});

test("organizers price a session as FREE or a rupee amount, never free-form text", async () => {
  const { organizerEventInputSchema } = await import("../lib/services/organizer-events");
  const input = { title: "Synthetic session", description: "A synthetic session used only by this test.", date: "2026-12-01", startTime: "06:00 AM", endTime: "07:00 AM", venueSlug: "stadium", capacity: 20, status: "published" };
  for (const price of ["FREE", "₹200"]) assert.equal(organizerEventInputSchema.safeParse({ ...input, price }).success, true, price);
  for (const price of ["200", "Pay at venue", "₹200 onwards"]) assert.equal(organizerEventInputSchema.safeParse({ ...input, price }).success, false, price);
});
