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

test("a paid event is never confirmed by an RSVP: its ticket starts as a hold at the price the member confirmed", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const rsvp = await service.createRsvp(member, "free");
  assert.equal(rsvp.status, "confirmed");
  assert.equal("amount" in rsvp, false); assert.equal("paymentStatus" in rsvp, false);
  assert.equal("amount" in writes[0].data!, false, "free RSVPs never send ticket attributes");
  writes = [];
  await assert.rejects(service.createRsvp(member, "paid"), { code: "PAYMENT_REQUIRED" });
  await assert.rejects(service.holdTicket(member, "paid", 14900), { code: "PRICE_CHANGED" });
  await assert.rejects(service.holdTicket("other-member", "free", 19900), { code: "PRICE_CHANGED" });
  assert.equal(writes.length, 0);
  const hold = await service.holdTicket(member, "paid", 19900);
  assert.deepEqual({ status: hold.status, amount: hold.amount, paymentStatus: hold.paymentStatus, seatNumber: hold.seatNumber }, { status: "pending", amount: 19900, paymentStatus: "pending", seatNumber: 1 });
  assert.deepEqual(await service.holdTicket(member, "paid", 19900), hold, "a retry returns the same hold");
  assert.equal(writes.length, 1);
  // A later price change never reprices a hold.
  rows.get("events/paid")!.payload = JSON.stringify({ price: "₹249" });
  assert.equal((await service.holdTicket(member, "paid", 24900)).amount, 19900);
  assert.equal((await service.holdTicket("other-member", "paid", 24900)).amount, 24900);
  assert.throws(() => service.rsvpInputSchema.parse({ eventId: "paid", amount: 199.5 }));
  assert.throws(() => service.rsvpInputSchema.parse({ eventId: "paid", amount: 19900, userId: "spoofed" }));
});

test("tickets fail closed, without a free seat, until the ticket attributes are provisioned", async t => {
  t.mock.method(console, "info", () => {}); reset(); ticketSchema = false;
  await assert.rejects(service.holdTicket(member, "paid", 19900), { code: "TICKETS_NOT_CONFIGURED", status: 503 });
  assert.equal(ticketRow("paid"), undefined);
  assert.equal((await service.createRsvp(member, "free")).status, "confirmed");
});

test("only a confirmed payment confirms a ticket: amount-checked, idempotent, and never cancelled away", async t => {
  t.mock.method(console, "info", () => {}); reset();
  await service.holdTicket(member, "paid", 19900);
  await service.createRsvp(member, "free");
  await service.holdTicket("other-member", "paid", 19900);
  await assert.rejects(service.confirmTicketPayment("paid", member, 100, "pay_synthetic"), { code: "AMOUNT_MISMATCH" });
  await assert.rejects(service.confirmTicketPayment("free", member, 19900, "pay_synthetic"), { code: "TICKET_NOT_FOUND" });
  assert.deepEqual({ status: ticketRow("paid")!.status, paymentStatus: ticketRow("paid")!.paymentStatus }, { status: "pending", paymentStatus: "pending" });
  writes = [];
  const ticket = await service.confirmTicketPayment("paid", member, 19900, "pay_synthetic");
  assert.deepEqual({ status: ticket.status, paymentStatus: ticket.paymentStatus }, { status: "confirmed", paymentStatus: "paid" });
  assert.equal((await service.confirmTicketPayment("paid", member, 19900, "pay_synthetic")).paymentStatus, "paid", "the same payment settles twice harmlessly");
  await assert.rejects(service.confirmTicketPayment("paid", member, 19900, "pay_repeat"), { code: "DUPLICATE_PAYMENT" }, "a second payment is refunded, not absorbed");
  assert.equal(writes.length, 1);
  assert.deepEqual({ status: ticketRow("paid")!.status, paymentRef: ticketRow("paid")!.paymentRef }, { status: "confirmed", paymentRef: "pay_synthetic" });
  await assert.rejects(service.cancelRsvp(member, "paid"), { code: "TICKET_PAID" });
  assert.ok(ticketRow("paid"));
  await service.cancelRsvp("other-member", "paid");
  assert.equal(ticketRow("paid", "other-member"), undefined, "an unpaid hold can be let go");
});

test("a hold that runs out unpaid keeps its seat until someone needs it; a late payment is reissued or refused", async t => {
  t.mock.method(console, "info", () => {}); reset();
  rows.get("events/paid")!.capacity = 1;
  const lapse = (userId = member) => { ticketRow("paid", userId)!.createdAt = new Date(Date.now() - 31 * 60_000).toISOString(); };
  await service.holdTicket(member, "paid", 19900);
  await assert.rejects(service.holdTicket("other-member", "paid", 19900), { code: "EVENT_FULL" }, "a live hold keeps its seat");
  lapse();
  const renewed = await service.holdTicket(member, "paid", 19900);
  assert.equal(renewed.seatNumber, 1);
  assert.ok(Date.now() - Date.parse(renewed.createdAt) < 5_000, "retrying renews a hold that ran out");
  lapse();
  const taken = await service.holdTicket("other-member", "paid", 19900);
  assert.deepEqual({ seatNumber: taken.seatNumber, status: taken.status }, { seatNumber: 1, status: "pending" }, "the seat goes to the next buyer");
  assert.equal(ticketRow("paid"), undefined);
  // The first member's payment lands after all: no seat is free, so it is refused (and refunded by the caller).
  await assert.rejects(service.confirmTicketPayment("paid", member, 19900, "pay_late"), { code: "EVENT_FULL" });
  rows.get("events/paid")!.capacity = 2;
  const reissued = await service.confirmTicketPayment("paid", member, 19900, "pay_late");
  assert.deepEqual({ seatNumber: reissued.seatNumber, status: reissued.status, paymentStatus: reissued.paymentStatus }, { seatNumber: 2, status: "confirmed", paymentStatus: "paid" });
  // A confirmed ticket is never reclaimed, however old.
  rows.get("events/paid")!.capacity = 2;
  lapse();
  await assert.rejects(service.holdTicket("third-member", "paid", 19900), { code: "EVENT_FULL" });
});

test("the guest list and check-in desk count only paid tickets, never account IDs", async t => {
  t.mock.method(console, "info", () => {}); reset();
  await service.holdTicket(member, "paid", 19900);
  const organizer = await import("../lib/services/organizer");
  const event = { id: "paid", slug: "paid", title: "Synthetic paid session", status: "published", organizerUserId: operator.id, capacity: 2, startsAt: rows.get("events/paid")!.startsAt, endsAt: rows.get("events/paid")!.endsAt } as unknown as import("../types/event").Event;
  assert.deepEqual((await organizer.getOrganizerEventSummary(operator, event)).attendees, [], "a hold is not a guest");
  const { token } = await service.createParticipantCheckInToken(member);
  await assert.rejects(service.checkInParticipant(operator, "paid", token), { code: "PAYMENT_PENDING" });
  await service.confirmTicketPayment("paid", member, 19900, "pay_synthetic");
  const summary = await organizer.getOrganizerEventSummary(operator, event);
  assert.deepEqual(summary.attendees, [{ displayName: "Ticket holder", rsvpStatus: "confirmed", seatNumber: 1, ticket: { amount: 19900, paid: true }, checkInStatus: "not_checked_in" }]);
  assert.ok(!JSON.stringify(summary).includes(member));
  assert.equal("amountDue" in await service.checkInParticipant(operator, "paid", token), false);
  // A ticket issued before online payment (confirmed, unpaid) still admits its holder; the desk is told what to collect.
  reset();
  rows.set(`rsvps/${service.rsvpDocumentId("paid", member)}`, { $id: service.rsvpDocumentId("paid", member), eventId: "paid", userId: member, status: "confirmed", seatNumber: 1, createdAt: new Date().toISOString(), amount: 19900, paymentStatus: "pending" });
  assert.equal((await service.checkInParticipant(operator, "paid", token)).amountDue, 19900);
});

test("a spot booked to pay on WhatsApp is confirmed at once with its price due, and its number reaches only its owner and the organizer", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const contact = { name: "Asha Rao", phone: "9876543210" };
  await assert.rejects(service.reserveTicket(member, "paid", 14900, contact), { code: "PRICE_CHANGED" });
  await assert.rejects(service.reserveTicket(member, "free", 19900, contact), { code: "PRICE_CHANGED" });
  assert.equal(writes.length, 0);
  const spot = await service.reserveTicket(member, "paid", 19900, contact);
  assert.deepEqual({ status: spot.status, amount: spot.amount, paymentStatus: spot.paymentStatus, seatNumber: spot.seatNumber, whatsapp: spot.whatsapp }, { status: "confirmed", amount: 19900, paymentStatus: "pending", seatNumber: 1, whatsapp: contact });
  assert.equal(ticketRow("paid")!.paymentRef, "whatsapp:9876543210:Asha Rao");
  assert.deepEqual(await service.reserveTicket(member, "paid", 19900, { name: "Someone else", phone: "9123456789" }), spot, "a retry returns the same spot unchanged");
  assert.equal(writes.length, 1);
  assert.deepEqual((await service.getParticipationControls(member)).rsvps[0].whatsapp, contact);

  const organizer = await import("../lib/services/organizer");
  const event = { id: "paid", slug: "paid", title: "Synthetic paid session", status: "published", organizerUserId: operator.id, capacity: 2, startsAt: rows.get("events/paid")!.startsAt, endsAt: rows.get("events/paid")!.endsAt } as unknown as import("../types/event").Event;
  const summary = await organizer.getOrganizerEventSummary(operator, event);
  assert.deepEqual(summary.attendees, [{ displayName: "Asha Rao", rsvpStatus: "confirmed", seatNumber: 1, ticket: { amount: 19900, paid: false }, whatsapp: "9876543210", checkInStatus: "not_checked_in" }]);
  assert.equal(summary.revenue, 0, "an unpaid spot is no revenue");
  assert.ok(!JSON.stringify(summary).includes(member));
  const { token } = await service.createParticipantCheckInToken(member);
  assert.equal((await service.checkInParticipant(operator, "paid", token)).amountDue, 19900, "the desk is told what is still due");

  // Capacity holds as for any ticket, and an unpaid spot can be let go.
  assert.equal((await service.reserveTicket("other-member", "paid", 19900, contact)).seatNumber, 2);
  await assert.rejects(service.reserveTicket("third-member", "paid", 19900, contact), { code: "EVENT_FULL" });
  await service.cancelRsvp("other-member", "paid");
  assert.equal(ticketRow("paid", "other-member"), undefined);
  // Paid later online, the WhatsApp contact gives way to the payment's reference.
  const paid = await service.confirmTicketPayment("paid", member, 19900, "pay_synthetic");
  assert.deepEqual({ paymentStatus: paid.paymentStatus, whatsapp: paid.whatsapp }, { paymentStatus: "paid", whatsapp: undefined });
});

test("an unpaid hold becomes the spot booked to pay on WhatsApp, at the price it was held at", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const hold = await service.holdTicket(member, "paid", 19900);
  rows.get("events/paid")!.payload = JSON.stringify({ price: "₹249" });
  const spot = await service.reserveTicket(member, "paid", 24900, { name: "Asha Rao", phone: "9876543210" });
  assert.deepEqual({ status: spot.status, amount: spot.amount, seatNumber: spot.seatNumber }, { status: "confirmed", amount: 19900, seatNumber: hold.seatNumber });
});

test("booking to pay on WhatsApp needs a name and an Indian mobile number, and never books a demo listing", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const payments = await import("../lib/services/ticket-payments");
  rows.set("events/demo", { ...rows.get("events/paid")!, $id: "demo", payload: JSON.stringify({ price: "₹199", demo: true }) });
  const reserve = (input: { eventId?: string; name: string; phone: string }) => payments.reserveTicketOnWhatsapp({ id: member }, { eventId: "paid", amount: 19900, ...input });
  await assert.rejects(reserve({ name: " A ", phone: "9876543210" }), { code: "NAME_REQUIRED" });
  await assert.rejects(reserve({ name: "Asha Rao", phone: "12345" }), { code: "PHONE_INVALID" });
  await assert.rejects(reserve({ eventId: "demo", name: "Asha Rao", phone: "9876543210" }), { code: "DEMO_EVENT" });
  assert.equal(writes.length, 0);
  const spot = await reserve({ name: "  Asha\n\t Rao ", phone: "+91 98765-43210" });
  assert.deepEqual(spot.whatsapp, { name: "Asha Rao", phone: "9876543210" });
  assert.throws(() => payments.ticketReservationInputSchema.parse({ eventId: "paid", amount: 19900, name: "Asha", phone: "9876543210", userId: "spoofed" }));
});

test("a club's organizers work the check-in desk for its sessions, which strangers cannot", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const owner = { id: "club-owner", labels: [] as string[] };
  rows.get("events/free")!.communitySlug = "dawn-runners";
  rows.set("communities/club", { $id: "club", slug: "dawn-runners", status: "published", payload: JSON.stringify({ name: "Dawn Runners", organizerUserIds: ["co-owner", owner.id] }) });
  await service.createRsvp(member, "free");
  const { token } = await service.createParticipantCheckInToken(member);
  await assert.rejects(service.checkInParticipant({ id: "someone-else", labels: [] }, "free", token), { code: "ORGANIZER_REQUIRED" });
  assert.equal(await service.canManageEvent({ id: "someone-else", labels: [] }, "free"), false);
  assert.equal(await service.canManageEvent(owner, "free"), true);
  assert.equal((await service.checkInParticipant(owner, "free", token)).alreadyCheckedIn, false);
  // A club's organizers run only that club's sessions.
  await assert.rejects(service.checkInParticipant(owner, "paid", token), { code: "ORGANIZER_REQUIRED" });
});

test("organizers price a session as FREE or a rupee amount, never free-form text", async () => {
  const { organizerEventInputSchema } = await import("../lib/services/organizer-events");
  const input = { title: "Synthetic session", description: "A synthetic session used only by this test.", date: "2026-12-01", startTime: "06:00 AM", endTime: "07:00 AM", venueSlug: "stadium", capacity: 20, status: "published" };
  for (const price of ["FREE", "₹200"]) assert.equal(organizerEventInputSchema.safeParse({ ...input, price }).success, true, price);
  for (const price of ["200", "Pay at venue", "₹200 onwards"]) assert.equal(organizerEventInputSchema.safeParse({ ...input, price }).success, false, price);
});
