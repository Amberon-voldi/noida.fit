import assert from "node:assert/strict";
import { after, before, test } from "node:test";

// Isolated Appwrite transport: no credentials, accounts or live mutations.
let gifts: typeof import("../lib/services/gifts");
let participation: typeof import("../lib/services/participation");
let organizer: typeof import("../lib/services/organizer");
const originalFetch = globalThis.fetch;
let rows = new Map<string, Record<string, unknown>>();
const organizerUser = { id: "club-organizer", labels: [] as string[] };
const stranger = { id: "someone-else", labels: [] as string[] };
const guest = { id: "creator-guest" };
const friend = { id: "creator-friend" };

before(async () => {
  Object.assign(process.env, { NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "gifts-test", APPWRITE_KEY: "synthetic-runtime-key", APPWRITE_CHECKIN_SECRET: "synthetic-checkin-secret-".repeat(3), NEXT_PUBLIC_APPWRITE_DATABASE_ID: "gifts-test", NEXT_PUBLIC_APPWRITE_GIFT_LINKS_COLLECTION_ID: "gift_links", NEXT_PUBLIC_APPWRITE_GIFT_GUESTS_COLLECTION_ID: "gift_guests", ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(name => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${name}`, name.toLowerCase()])) });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); assert.equal(url.origin, "https://appwrite.test");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const match = /collections\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(url.pathname); assert.ok(match, url.pathname);
    const [, collection, id] = match;
    const key = `${collection}/${id ?? body.documentId}`;
    if (method === "GET" && id) return rows.has(key) ? Response.json({ $updatedAt: "2026-11-01T00:00:00.000Z", ...rows.get(key) }) : Response.json({ code: 404, type: "document_not_found", message: "absent" }, { status: 404 });
    if (method === "GET") {
      const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
      const documents = [...rows.entries()].filter(([path, row]) => path.startsWith(`${collection}/`) && queries.filter(query => query.method === "equal").every(query => query.values.includes(row[query.attribute]))).map(([, row]) => row);
      return Response.json({ total: documents.length, documents });
    }
    if (method === "DELETE") { rows.delete(key); return new Response(null, { status: 204 }); }
    if (method === "POST" && rows.has(key)) return Response.json({ code: 409, type: "document_already_exists", message: "conflict" }, { status: 409 });
    // Appwrite stores null for a cleared optional attribute.
    const row = Object.fromEntries(Object.entries({ ...rows.get(key), ...body.data, ...(body.permissions ? { $permissions: body.permissions } : {}), $id: id ?? body.documentId }).filter(([, value]) => value !== null));
    rows.set(key, row);
    return Response.json(row, { status: method === "POST" ? 201 : 200 });
  };
  gifts = await import("../lib/services/gifts");
  participation = await import("../lib/services/participation");
  organizer = await import("../lib/services/organizer");
});
after(() => { globalThis.fetch = originalFetch; });

function reset({ capacity = 3, price = "₹299", status = "published" } = {}) {
  rows = new Map();
  rows.set("events/paid", {
    $id: "paid", slug: "sunrise-5k", title: "Sunrise 5K", status, demo: false, capacity, organizerUserId: organizerUser.id,
    activityId: "running", communitySlug: "bcc", venueSlug: "stadium", sector: "Sector 21A", date: "2099-01-10",
    startsAt: "2099-01-10T00:30:00.000Z", endsAt: "2099-01-10T01:30:00.000Z",
    payload: JSON.stringify({ price, communityName: "BCC Runners", venueName: "Noida Stadium", startTime: "06:00 AM", endTime: "07:00 AM", category: "running", description: "A run." }),
  });
  rows.set(`profiles/${guest.id}`, { $id: guest.id, displayName: "Riya" });
}
const ticket = (userId: string) => rows.get(`rsvps/${participation.rsvpDocumentId("paid", userId)}`);
const create = (input: Record<string, unknown> = {}, user = organizerUser) => gifts.createGiftLink(user, "paid", { spots: 1, ...input });
const rejects = (promise: Promise<unknown>, code: string) => assert.rejects(promise, (error: { code?: string }) => error.code === code);

test("only the session's organizer makes gift links, with a private random ID", async () => {
  reset();
  const link = await create({ label: "  Riya (@riya.runs) ", note: "Come run with us" });
  assert.match(link.id, /^g[A-Za-z0-9_-]{24}$/);
  assert.deepEqual({ label: link.label, note: link.note, spots: link.spots, claimed: link.claimed, status: link.status }, { label: "Riya (@riya.runs)", note: "Come run with us", spots: 1, claimed: 0, status: "active" });
  assert.notEqual((await create()).id, link.id);
  await rejects(create({}, stranger), "ORGANIZER_REQUIRED");
  await assert.rejects(create({ spots: 0 }));
  await assert.rejects(create({ spots: 21 }));
  reset({ status: "cancelled" });
  await rejects(create(), "EVENT_CANCELLED");
});

test("a gift claims a confirmed spot on a paid session without any payment", async () => {
  reset();
  const link = await create({ label: "Riya" });
  assert.equal((await gifts.getGiftView(link.id))?.state, "open");
  const claim = await gifts.claimGift(guest, link.id);
  assert.deepEqual(claim, { eventSlug: "sunrise-5k", seatNumber: 1 });
  const row = ticket(guest.id)!;
  assert.deepEqual({ status: row.status, paymentStatus: row.paymentStatus, paymentRef: row.paymentRef, amount: row.amount }, { status: "confirmed", paymentStatus: "gift", paymentRef: `gift:${link.id}`, amount: undefined });
  assert.equal((await participation.getUserRsvp("paid", guest.id))?.paymentStatus, "gift");
  assert.deepEqual(await gifts.claimGift(guest, link.id), claim, "claiming again is harmless");
  assert.equal((await gifts.getGiftView(link.id, guest.id))?.state, "yours");
  assert.equal((await gifts.getGiftView(link.id, friend.id))?.state, "used");
  await rejects(gifts.claimGift(friend, link.id), "GIFT_USED");
  assert.equal((await gifts.listGiftLinks(organizerUser, "paid"))[0].claimed, 1);
});

test("a gift isn't spent on someone who already has a spot, and turns a hold into the gift", async () => {
  reset();
  const link = await create({ spots: 2 });
  rows.set(`rsvps/${participation.rsvpDocumentId("paid", friend.id)}`, { $id: participation.rsvpDocumentId("paid", friend.id), eventId: "paid", userId: friend.id, status: "confirmed", seatNumber: 1, createdAt: new Date().toISOString(), amount: 29900, paymentStatus: "paid", paymentRef: "payu:x" });
  assert.equal((await gifts.getGiftView(link.id, friend.id))?.state, "going");
  await rejects(gifts.claimGift(friend, link.id), "ALREADY_GOING");
  rows.set(`rsvps/${participation.rsvpDocumentId("paid", guest.id)}`, { $id: participation.rsvpDocumentId("paid", guest.id), eventId: "paid", userId: guest.id, status: "pending", seatNumber: 2, createdAt: new Date().toISOString(), amount: 29900, paymentStatus: "pending" });
  const claim = await gifts.claimGift(guest, link.id);
  assert.equal(claim.seatNumber, 2, "the held seat becomes the gift");
  assert.deepEqual({ status: ticket(guest.id)!.status, paymentStatus: ticket(guest.id)!.paymentStatus, amount: ticket(guest.id)!.amount }, { status: "confirmed", paymentStatus: "gift", amount: undefined });
  assert.equal((await gifts.listGiftLinks(organizerUser, "paid"))[0].claimed, 1, "the friend's own ticket isn't counted");
});

test("switched-off links stop new claims but keep claimed spots; capacity still applies", async () => {
  reset({ capacity: 1 });
  const link = await create({ spots: 3 });
  await gifts.claimGift(guest, link.id);
  assert.equal((await gifts.getGiftView(link.id, friend.id))?.state, "full");
  await rejects(gifts.claimGift(friend, link.id), "EVENT_FULL");
  const revoked = await gifts.revokeGiftLink(organizerUser, "paid", link.id);
  assert.deepEqual({ status: revoked.status, claimed: revoked.claimed }, { status: "revoked", claimed: 1 });
  await rejects(gifts.revokeGiftLink(stranger, "paid", link.id), "ORGANIZER_REQUIRED");
  assert.equal((await gifts.getGiftView(link.id, friend.id))?.state, "revoked");
  assert.equal((await gifts.getGiftView(link.id, guest.id))?.state, "yours");
  await rejects(gifts.claimGift(friend, link.id), "GIFT_REVOKED");
  assert.equal(ticket(guest.id)?.status, "confirmed");
  assert.equal(await gifts.getGiftView("g".padEnd(25, "x")), null, "an unknown link shows nothing");
  assert.equal(await gifts.getGiftView("../../events/paid"), null);
});

test("the organizer's numbers count gifted spots, revenue and people paying now", async () => {
  reset({ capacity: 10 });
  const link = await create({ label: "Riya" });
  await gifts.claimGift(guest, link.id);
  const seat = (userId: string, seatNumber: number, fields: Record<string, unknown>) => rows.set(`rsvps/${participation.rsvpDocumentId("paid", userId)}`, { $id: participation.rsvpDocumentId("paid", userId), eventId: "paid", userId, seatNumber, createdAt: new Date().toISOString(), ...fields });
  seat("payer", 2, { status: "confirmed", amount: 29900, paymentStatus: "paid" });
  seat("payer-2", 3, { status: "confirmed", amount: 29900, paymentStatus: "paid" });
  seat("paying", 4, { status: "pending", amount: 29900, paymentStatus: "pending" });
  seat("lapsed", 5, { status: "pending", amount: 29900, paymentStatus: "pending", createdAt: new Date(Date.now() - 31 * 60_000).toISOString() });
  const [event] = await (await import("../lib/data")).getEventAnyStatus("paid").then(found => [found!]);
  const summary = await organizer.getOrganizerEventSummary(organizerUser, event);
  assert.deepEqual({ going: summary.confirmedRsvps, revenue: summary.revenue, payingNow: summary.payingNow, giftsClaimed: summary.giftsClaimed }, { going: 3, revenue: 59800, payingNow: 1, giftsClaimed: 1 });
  assert.deepEqual(summary.attendees.find(attendee => attendee.gift)?.gift, { linkId: link.id, label: "Riya" });
});

test("the guest list CSV neutralises formulas and carries no contact details", async () => {
  const { guestListCsv } = await import("../lib/guest-csv");
  const csv = guestListCsv([
    { displayName: "=HYPERLINK(\"http://evil\")", rsvpStatus: "confirmed", seatNumber: 1, checkInStatus: "checked_in", checkedInAt: "2026-11-16T01:05:00.000Z" },
    { displayName: "Riya, R.", rsvpStatus: "confirmed", seatNumber: 2, gift: { linkId: "g1", label: "@riya" }, checkInStatus: "not_checked_in" },
    { displayName: "Asha", rsvpStatus: "confirmed", seatNumber: 3, ticket: { amount: 29900, paid: true }, checkInStatus: "not_checked_in" },
  ]);
  assert.equal(csv, [
    "Name,Spot,Ticket,Checked in",
    "\"'=HYPERLINK(\"\"http://evil\"\")\",1,Free,6:35 am",
    "\"Riya, R.\",2,Gift (@riya),",
    "Asha,3,₹299 paid,",
    "",
  ].join("\r\n"));
});

test("a link that needs an account refuses guests; an open link gives a guest pass with no account", async () => {
  reset();
  const membersOnly = await create();
  assert.equal(membersOnly.allowGuests, false);
  assert.equal((await gifts.getGiftView(membersOnly.id))?.link.allowGuests, false);
  await rejects(gifts.claimGiftAsGuest(membersOnly.id, { name: "Asha", phone: "98765 43210" }), "GIFT_ACCOUNT_REQUIRED");
  const open = await create({ spots: 2, allowGuests: true });
  assert.equal((await gifts.getGiftView(open.id))?.link.allowGuests, true);
  await rejects(gifts.claimGiftAsGuest(open.id, { name: "Asha", phone: "12345" }), "PHONE_INVALID");
  const claim = await gifts.claimGiftAsGuest(open.id, { name: "  Asha   Rao ", phone: "+91 98765-43210" });
  assert.match(claim.passId, /^p[A-Za-z0-9_-]{24}$/);
  assert.equal(claim.seatNumber, 1);
  const seat = ticket(gifts.guestHolderId("paid", "9876543210"))!;
  assert.deepEqual({ status: seat.status, paymentStatus: seat.paymentStatus, paymentRef: seat.paymentRef, permissions: seat.$permissions }, { status: "confirmed", paymentStatus: "gift", paymentRef: `gift:${open.id}`, permissions: [] }, "no account can read a guest's seat");
  const row = rows.get(`gift_guests/${claim.passId}`)!;
  assert.deepEqual({ eventId: row.eventId, linkId: row.linkId, name: row.name, phone: row.phone, permissions: row.$permissions }, { eventId: "paid", linkId: open.id, name: "Asha Rao", phone: "9876543210", permissions: [] });
  await rejects(gifts.claimGiftAsGuest(open.id, { name: "Someone else", phone: "09876543210" }), "GUEST_ALREADY_GOING");
  await gifts.claimGiftAsGuest(open.id, { name: "Friend", phone: "9123456789" });
  await rejects(gifts.claimGiftAsGuest(open.id, { name: "Third", phone: "9000000000" }), "GIFT_USED");
  assert.equal((await gifts.listGiftLinks(organizerUser, "paid")).find(link => link.id === open.id)?.claimed, 2);
  const pass = await gifts.getGuestPass(claim.passId);
  assert.deepEqual({ state: pass?.state, name: pass?.pass.name, seat: pass?.pass.seatNumber, event: pass?.event.slug }, { state: "valid", name: "Asha Rao", seat: 1, event: "sunrise-5k" });
  assert.equal(await gifts.getGuestPass("p".padEnd(25, "x")), null, "an unknown pass shows nothing");
  assert.equal(await gifts.getGuestPass("../gift_links/x"), null);
});

test("a guest claim that finds no free seat leaves no pass behind", async () => {
  reset({ capacity: 1 });
  const link = await create({ spots: 2, allowGuests: true });
  await gifts.claimGift(guest, link.id);
  await rejects(gifts.claimGiftAsGuest(link.id, { name: "Late", phone: "9876543210" }), "EVENT_FULL");
  assert.deepEqual([...rows.keys()].filter(key => key.startsWith("gift_guests/")), []);
});

test("the desk checks a guest in from their pass, and the guest list names them with their number", async () => {
  reset({ capacity: 5 });
  // Check-in opens 30 minutes before the start.
  const start = Date.now() + 10 * 60_000;
  Object.assign(rows.get("events/paid")!, { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 60 * 60_000).toISOString() });
  const link = await create({ allowGuests: true, label: "Asha" });
  const { passId } = await gifts.claimGiftAsGuest(link.id, { name: "Asha", phone: "9876543210" });
  const event = (await (await import("../lib/data")).getEventAnyStatus("paid"))!;
  assert.deepEqual((await organizer.getOrganizerEventSummary(organizerUser, event)).attendees, [
    { displayName: "Asha", rsvpStatus: "confirmed", seatNumber: 1, gift: { linkId: link.id, label: "Asha" }, guest: { pass: passId, phone: "9876543210" }, checkInStatus: "not_checked_in" },
  ]);
  await rejects(gifts.checkInGuest(stranger, "paid", passId), "ORGANIZER_REQUIRED");
  const first = await gifts.checkInGuest(organizerUser, "paid", passId);
  assert.deepEqual({ name: first.displayName, guest: first.guest, again: first.alreadyCheckedIn }, { name: "Asha", guest: true, again: false });
  assert.equal((await gifts.checkInGuest(organizerUser, "paid", passId)).alreadyCheckedIn, true, "a second scan doesn't check in twice");
  const holder = gifts.guestHolderId("paid", "9876543210");
  const checkin = rows.get(`checkins/${participation.checkInDocumentId("paid", holder)}`)!;
  assert.deepEqual({ method: checkin.verificationMethod, permissions: checkin.$permissions }, { method: "guest_pass", permissions: [] });
  assert.equal(rows.has(`participations/${participation.participationDocumentId("paid", holder)}`), false, "a guest has no passport");
  assert.equal((await gifts.getGuestPass(passId))?.state, "checked-in");
  const summary = await organizer.getOrganizerEventSummary(organizerUser, event);
  assert.deepEqual({ checkedIn: summary.checkedIn, status: summary.attendees[0].checkInStatus }, { checkedIn: 1, status: "checked_in" });
  await rejects(gifts.checkInGuest(organizerUser, "paid", "p".padEnd(25, "x")), "RSVP_REQUIRED");
  const { guestTicketLabel } = await import("../lib/guest-csv");
  assert.equal(guestTicketLabel(summary.attendees[0]), "Gift (Asha), guest pass");
});

test("the desk tells a guest pass QR from a .fit ID check-in QR", async () => {
  const qr = await import("../lib/check-in-qr");
  const pass = `p${"A".repeat(24)}`;
  assert.deepEqual(qr.checkInCodeFromQr(` ${qr.guestQrValue(pass)} `), { guestPass: pass });
  assert.throws(() => qr.checkInCodeFromQr("NF-GUEST:../../events/paid"), /didn’t read cleanly/);
  const token = `${"a".repeat(20)}.${"b".repeat(43)}`;
  assert.deepEqual(qr.checkInCodeFromQr(qr.participantQrValue(token)), { token });
});
