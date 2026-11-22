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
    // Members scanned at the desk: their account is active.
    if (url.pathname.startsWith("/v1/users/")) return Response.json({ $id: url.pathname.slice(10), status: true });
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
  // The dashboard's events come from getOrganizerEvents, which names their organizers; public reads never do.
  const [event] = await (await import("../lib/data")).getEventAnyStatus("paid").then(found => [{ ...found!, organizerUserIds: [organizerUser.id] }]);
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
  await rejects(gifts.claimGiftAsGuest(membersOnly.id, { phone: "98XXXXXXX" }), "GIFT_ACCOUNT_REQUIRED");
  const open = await create({ spots: 2, allowGuests: true, label: "Asha Rao" });
  assert.equal((await gifts.getGiftView(open.id))?.link.allowGuests, true);
  await rejects(gifts.claimGiftAsGuest(open.id, { phone: "12345" }), "PHONE_INVALID");
  // Without a number from the organizer, the guest gives one.
  await rejects(gifts.claimGiftAsGuest(open.id, {}), "PHONE_INVALID");
  const claim = await gifts.claimGiftAsGuest(open.id, { phone: "+91 98765-43210", name: "ignored from an old page" });
  assert.match(claim.passId, /^p[A-Za-z0-9_-]{24}$/);
  assert.equal(claim.seatNumber, 1);
  const seat = ticket(gifts.guestHolderId("paid", "9876543210"))!;
  assert.deepEqual({ status: seat.status, paymentStatus: seat.paymentStatus, paymentRef: seat.paymentRef, permissions: seat.$permissions }, { status: "confirmed", paymentStatus: "gift", paymentRef: `gift:${open.id}`, permissions: [] }, "no account can read a guest's seat");
  const row = rows.get(`gift_guests/${claim.passId}`)!;
  assert.deepEqual({ eventId: row.eventId, linkId: row.linkId, name: row.name, phone: row.phone, permissions: row.$permissions }, { eventId: "paid", linkId: open.id, name: "Asha Rao", phone: "9876543210", permissions: [] });
  await rejects(gifts.claimGiftAsGuest(open.id, { phone: "09876543210" }), "GUEST_ALREADY_GOING");
  const friend = await gifts.claimGiftAsGuest(open.id, { phone: "9123456789" });
  assert.equal(rows.get(`gift_guests/${friend.passId}`)?.name, "Guest of Asha Rao", "the link's first claim is who it's for; later ones are their guests");
  await rejects(gifts.claimGiftAsGuest(open.id, { phone: "9000000000" }), "GIFT_USED");
  const listed = (await gifts.getGiftView(open.id))?.passes ?? [];
  assert.deepEqual(listed.map(pass => [pass.id, pass.name, pass.seatNumber, pass.state]), [[claim.passId, "Asha Rao", 1, "valid"], [friend.passId, "Guest of Asha Rao", 2, "valid"]], "the gift link opens its passes on any device");
  assert.equal((await gifts.getGiftView(membersOnly.id))?.passes.length, 0);
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
  await rejects(gifts.claimGiftAsGuest(link.id, { phone: "9876543210" }), "EVENT_FULL");
  assert.deepEqual([...rows.keys()].filter(key => key.startsWith("gift_guests/")), []);
});

test("the desk checks a guest in from their pass, and the guest list names them with their number", async () => {
  reset({ capacity: 5 });
  // Check-in opens 30 minutes before the start.
  const start = Date.now() + 10 * 60_000;
  Object.assign(rows.get("events/paid")!, { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 60 * 60_000).toISOString() });
  const link = await create({ allowGuests: true, label: "Asha" });
  const { passId } = await gifts.claimGiftAsGuest(link.id, { phone: "9876543210" });
  const event = { ...(await (await import("../lib/data")).getEventAnyStatus("paid"))!, organizerUserIds: [organizerUser.id] };
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
  assert.equal((await gifts.getGiftView(link.id))?.passes[0]?.state, "checked-in");
  const summary = await organizer.getOrganizerEventSummary(organizerUser, event);
  assert.deepEqual({ checkedIn: summary.checkedIn, status: summary.attendees[0].checkInStatus }, { checkedIn: 1, status: "checked_in" });
  await rejects(gifts.checkInGuest(organizerUser, "paid", "p".padEnd(25, "x")), "RSVP_REQUIRED");
  const { guestTicketLabel } = await import("../lib/guest-csv");
  assert.equal(guestTicketLabel(summary.attendees[0]), "Gift (Asha), guest pass");
});

test("on a paid session, every paid or gifted spot checks in, and an unpaid one only once it's marked paid", async () => {
  reset({ capacity: 10 });
  const start = Date.now() + 10 * 60_000;
  Object.assign(rows.get("events/paid")!, { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 60 * 60_000).toISOString() });
  const memberQr = async (userId: string, publicId: string) => {
    rows.set(`fitness_ids/${userId}`, { $id: userId, userId, publicId, status: "active" });
    rows.set(`profiles/${userId}`, { $id: userId, displayName: userId });
    return (await participation.createParticipantCheckInToken(userId)).token;
  };
  // A guest without an account added to the list as paid, the way an organizer's paid guests are.
  const listedGuest = async (name: string, phone: string, paid: boolean) => {
    const passId = `p${name.padEnd(24, "x").slice(0, 24)}`;
    rows.set(`gift_guests/${passId}`, { $id: passId, eventId: "paid", linkId: "manual-paid", name, phone, createdAt: new Date().toISOString() });
    const spot = await participation.reserveTicket(gifts.guestHolderId("paid", phone), "paid", 29900, { name, phone });
    if (paid) await participation.setTicketPaid(organizerUser, "paid", spot.seatNumber, true);
    return { passId, seatNumber: spot.seatNumber };
  };

  // A member who paid (WhatsApp, marked paid).
  const paidToken = await memberQr("paid-member", "NF-00000000000000A1");
  const paidSpot = await participation.reserveTicket("paid-member", "paid", 29900, { name: "Paid member", phone: "9000000001" });
  await participation.setTicketPaid(organizerUser, "paid", paidSpot.seatNumber, true);
  assert.equal((await participation.checkInParticipant(organizerUser, "paid", paidToken)).alreadyCheckedIn, false);
  // A member who claimed a gift link: nothing to pay.
  const giftToken = await memberQr(guest.id, "NF-00000000000000A2");
  await gifts.claimGift(guest, (await create({ label: "Riya" })).id);
  assert.equal((await participation.checkInParticipant(organizerUser, "paid", giftToken)).alreadyCheckedIn, false);
  // A guest pass from a gift link that needs no account.
  const { passId: giftPass } = await gifts.claimGiftAsGuest((await create({ allowGuests: true, label: "Asha" })).id, { phone: "9876543210" });
  assert.equal((await gifts.checkInGuest(organizerUser, "paid", giftPass)).alreadyCheckedIn, false);
  // A paid guest without an account.
  const kabir = await listedGuest("Kabir", "9000000011", true);
  assert.deepEqual(await gifts.checkInGuest(organizerUser, "paid", kabir.passId).then(result => [result.displayName, result.alreadyCheckedIn]), ["Kabir", false]);

  // Payment due: refused with who and how much, whether member or guest, and nothing is recorded.
  const dueToken = await memberQr("due-member", "NF-00000000000000A3");
  const dueSpot = await participation.reserveTicket("due-member", "paid", 29900, { name: "Due member", phone: "9000000002" });
  await rejects(participation.checkInParticipant(organizerUser, "paid", dueToken), "PAYMENT_DUE");
  await assert.rejects(participation.checkInParticipant(organizerUser, "paid", dueToken), /due-member hasn’t paid ₹299/);
  const dueGuest = await listedGuest("Meera", "9000000012", false);
  await assert.rejects(gifts.checkInGuest(organizerUser, "paid", dueGuest.passId), (error: { code?: string; status?: number; message?: string }) => error.code === "PAYMENT_DUE" && error.status === 402 && /^Meera hasn’t paid ₹299/.test(error.message ?? ""));
  assert.equal(rows.has(`checkins/${participation.checkInDocumentId("paid", "due-member")}`), false);
  assert.equal(rows.has(`checkins/${participation.checkInDocumentId("paid", gifts.guestHolderId("paid", "9000000012"))}`), false);
  // They pay on the spot and are marked paid: the very next scan lets them in.
  await participation.setTicketPaid(organizerUser, "paid", dueSpot.seatNumber, true);
  await participation.setTicketPaid(organizerUser, "paid", dueGuest.seatNumber, true);
  assert.equal((await participation.checkInParticipant(organizerUser, "paid", dueToken)).alreadyCheckedIn, false);
  assert.equal((await gifts.checkInGuest(organizerUser, "paid", dueGuest.passId)).alreadyCheckedIn, false);

  const event = { ...(await (await import("../lib/data")).getEventAnyStatus("paid"))!, organizerUserIds: [organizerUser.id] };
  const summary = await organizer.getOrganizerEventSummary(organizerUser, event);
  assert.deepEqual({ going: summary.confirmedRsvps, checkedIn: summary.checkedIn }, { going: 6, checkedIn: 6 });
});

test("a session taking late sign-ups stays bookable until its end, and the desk registers walk-ins", async () => {
  reset({ capacity: 4 });
  // Started ten minutes ago, ends in fifty.
  const start = Date.now() - 10 * 60_000;
  const record = rows.get("events/paid")!;
  Object.assign(record, { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 60 * 60_000).toISOString() });
  const lateSignup = (on: boolean) => { record.payload = JSON.stringify({ ...JSON.parse(String(record.payload)), lateSignup: on }); };
  const memberQr = async (userId: string, publicId: string) => {
    rows.set(`fitness_ids/${userId}`, { $id: userId, userId, publicId, status: "active" });
    rows.set(`profiles/${userId}`, { $id: userId, displayName: userId });
    return (await participation.createParticipantCheckInToken(userId)).token;
  };
  const contact = { name: "Late runner", phone: "9000000021" };

  // Off: sign-ups close at the start, and someone not on the list is just not on the list.
  lateSignup(false);
  await rejects(participation.reserveTicket("late-member", "paid", 29900, contact), "EVENT_STARTED");
  const walkIn = await memberQr("walk-in", "NF-00000000000000B1");
  await rejects(participation.checkInParticipant(organizerUser, "paid", walkIn, { register: true, collected: 29900 }), "RSVP_REQUIRED");
  assert.equal(ticket("walk-in"), undefined);

  // On: booking stays open after the start.
  lateSignup(true);
  assert.equal((await participation.reserveTicket("late-member", "paid", 29900, contact)).status, "confirmed");
  // A walk-in scanned at the desk: not registered, with the price to collect.
  await assert.rejects(participation.checkInParticipant(organizerUser, "paid", walkIn), (error: { code?: string; status?: number; details?: { price?: number }; message?: string }) =>
    error.code === "NOT_REGISTERED" && error.status === 403 && error.details?.price === 29900 && /walk-in hasn’t signed up for this session\. Collect ₹299/.test(error.message ?? ""));
  assert.equal(ticket("walk-in"), undefined, "nothing is booked until the desk registers them");
  // Registering a paid walk-in needs the full price in hand.
  await rejects(participation.checkInParticipant(organizerUser, "paid", walkIn, { register: true }), "PRICE_CHANGED");
  await rejects(participation.checkInParticipant(organizerUser, "paid", walkIn, { register: true, collected: 10000 }), "PRICE_CHANGED");
  assert.equal(ticket("walk-in"), undefined);
  const registered = await participation.checkInParticipant(organizerUser, "paid", walkIn, { register: true, collected: 29900 });
  assert.deepEqual({ registered: registered.registered, collected: registered.collected, again: registered.alreadyCheckedIn }, { registered: true, collected: 29900, again: false });
  assert.deepEqual({ status: ticket("walk-in")!.status, amount: ticket("walk-in")!.amount, paid: ticket("walk-in")!.paymentStatus, ref: ticket("walk-in")!.paymentRef }, { status: "confirmed", amount: 29900, paid: "paid", ref: `desk:${organizerUser.id}` });
  assert.ok(rows.has(`checkins/${participation.checkInDocumentId("paid", "walk-in")}`));
  assert.ok(rows.has(`participations/${participation.participationDocumentId("paid", "walk-in")}`), "attendance is on their .fit ID");
  assert.equal((await participation.checkInParticipant(organizerUser, "paid", walkIn)).alreadyCheckedIn, true, "a second scan doesn't register them twice");

  // Due: one tap collects it in hand and checks them in; the wrong amount changes nothing.
  const lateToken = await memberQr("late-member", "NF-00000000000000B2");
  await assert.rejects(participation.checkInParticipant(organizerUser, "paid", lateToken), (error: { code?: string; details?: { amountDue?: number } }) => error.code === "PAYMENT_DUE" && error.details?.amountDue === 29900);
  await rejects(participation.checkInParticipant(organizerUser, "paid", lateToken, { collected: 100 }), "AMOUNT_MISMATCH");
  assert.equal(ticket("late-member")!.paymentStatus, "pending");
  const collected = await participation.checkInParticipant(organizerUser, "paid", lateToken, { collected: 29900 });
  assert.deepEqual({ collected: collected.collected, paid: ticket("late-member")!.paymentStatus, ref: ticket("late-member")!.paymentRef }, { collected: 29900, paid: "paid", ref: "whatsapp:9000000021:Late runner" });
  // A guest pass with payment due, the same way.
  const passId = `p${"G".repeat(24)}`;
  rows.set(`gift_guests/${passId}`, { $id: passId, eventId: "paid", linkId: "manual-paid", name: "Walk guest", phone: "9000000022" });
  await participation.reserveTicket(gifts.guestHolderId("paid", "9000000022"), "paid", 29900, { name: "Walk guest", phone: "9000000022" });
  await rejects(gifts.checkInGuest(organizerUser, "paid", passId), "PAYMENT_DUE");
  assert.equal((await gifts.checkInGuest(organizerUser, "paid", passId, 29900)).collected, 29900);
  // A full session can't take another walk-in.
  const fourth = await memberQr("fourth", "NF-00000000000000B3");
  await participation.checkInParticipant(organizerUser, "paid", fourth, { register: true, collected: 29900 });
  const fifth = await memberQr("fifth", "NF-00000000000000B4");
  await rejects(participation.checkInParticipant(organizerUser, "paid", fifth, { register: true, collected: 29900 }), "EVENT_FULL");
  // After the end, sign-ups close even with late sign-ups on.
  Object.assign(record, { startsAt: new Date(Date.now() - 90 * 60_000).toISOString(), endsAt: new Date(Date.now() - 30 * 60_000).toISOString() });
  await rejects(participation.reserveTicket("too-late", "paid", 29900, contact), "EVENT_STARTED");
});

test("a free session registers a walk-in with nothing to collect", async () => {
  reset({ capacity: 3, price: "FREE" });
  const start = Date.now() - 5 * 60_000;
  Object.assign(rows.get("events/paid")!, { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 60 * 60_000).toISOString() });
  rows.get("events/paid")!.payload = JSON.stringify({ ...JSON.parse(String(rows.get("events/paid")!.payload)), lateSignup: true });
  rows.set("fitness_ids/free-walk-in", { $id: "free-walk-in", userId: "free-walk-in", publicId: "NF-00000000000000C1", status: "active" });
  const token = (await participation.createParticipantCheckInToken("free-walk-in")).token;
  await assert.rejects(participation.checkInParticipant(organizerUser, "paid", token), (error: { code?: string; details?: { price?: number } }) => error.code === "NOT_REGISTERED" && error.details?.price === 0);
  const result = await participation.checkInParticipant(organizerUser, "paid", token, { register: true });
  assert.equal(result.registered, true);
  assert.deepEqual({ status: ticket("free-walk-in")!.status, amount: ticket("free-walk-in")!.amount }, { status: "confirmed", amount: undefined });
  assert.equal((await participation.createRsvp("free-late-rsvp", "paid")).status, "confirmed", "an RSVP after the start");
});

test("the organizer's closing time shuts tickets, RSVPs and gift claims, never later than the end", async () => {
  reset({ capacity: 10 });
  const record = rows.get("events/paid")!;
  const start = Date.now() + 60 * 60_000;
  Object.assign(record, { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 60 * 60_000).toISOString() });
  const closeAt = (iso: string | undefined) => { const payload = JSON.parse(String(record.payload)); delete payload.bookingClosesAt; record.payload = JSON.stringify({ ...payload, ...(iso ? { bookingClosesAt: iso } : {}) }); };
  const memberLink = await create({ spots: 5, label: "Riya" });
  const guestLink = await create({ spots: 5, allowGuests: true, label: "Asha" });
  const contact = { name: "Early bird", phone: "9000000031" };

  // Closes in ten minutes: still open.
  closeAt(new Date(Date.now() + 10 * 60_000).toISOString());
  assert.equal((await participation.reserveTicket("early", "paid", 29900, contact)).status, "confirmed");
  assert.equal((await gifts.getGiftView(guestLink.id))?.state, "open");
  // Closed a minute ago, an hour before the start: nobody books or claims, and the gift page says so.
  closeAt(new Date(Date.now() - 60_000).toISOString());
  await rejects(participation.reserveTicket("late", "paid", 29900, contact), "EVENT_STARTED");
  await rejects(participation.holdTicket("late", "paid", 29900), "EVENT_STARTED");
  await rejects(gifts.claimGift(friend, memberLink.id), "EVENT_STARTED");
  await rejects(gifts.claimGiftAsGuest(guestLink.id, { phone: "9000000032" }), "EVENT_STARTED");
  assert.equal((await gifts.getGiftView(guestLink.id))?.state, "closed");
  assert.equal(ticket("late"), undefined);
  assert.equal(ticket(friend.id), undefined);
  // Unset again: open until the start.
  closeAt(undefined);
  assert.equal((await gifts.getGiftView(guestLink.id))?.state, "open");

  const { bookingCloseTime } = await import("../lib/booking-window");
  assert.equal(bookingCloseTime(1000, 2000, { bookingClosesAt: new Date(5000).toISOString() }), 2000, "never later than the end");
  assert.equal(bookingCloseTime(1000, 2000, { lateSignup: true }), 2000);
  assert.equal(bookingCloseTime(1000, 2000), 1000);
});

test("after sign-ups close, the desk can still register a walk-in on a session taking late sign-ups", async () => {
  reset({ capacity: 5 });
  const record = rows.get("events/paid")!;
  const start = Date.now() - 5 * 60_000;
  Object.assign(record, { startsAt: new Date(start).toISOString(), endsAt: new Date(start + 60 * 60_000).toISOString() });
  record.payload = JSON.stringify({ ...JSON.parse(String(record.payload)), lateSignup: true, bookingClosesAt: new Date(Date.now() - 60_000).toISOString() });
  await rejects(participation.reserveTicket("online", "paid", 29900, { name: "Online", phone: "9000000033" }), "EVENT_STARTED");
  rows.set("fitness_ids/door", { $id: "door", userId: "door", publicId: "NF-00000000000000D1", status: "active" });
  const token = (await participation.createParticipantCheckInToken("door")).token;
  assert.equal((await participation.checkInParticipant(organizerUser, "paid", token, { register: true, collected: 29900 })).registered, true);
});

test("the desk tells a guest pass QR from a .fit ID check-in QR", async () => {
  const qr = await import("../lib/check-in-qr");
  const pass = `p${"A".repeat(24)}`;
  assert.deepEqual(qr.checkInCodeFromQr(` ${qr.guestQrValue(pass)} `), { guestPass: pass });
  assert.throws(() => qr.checkInCodeFromQr("NF-GUEST:../../events/paid"), /didn’t read cleanly/);
  const token = `${"a".repeat(20)}.${"b".repeat(43)}`;
  assert.deepEqual(qr.checkInCodeFromQr(qr.participantQrValue(token)), { token });
});

test("a number from the organizer makes the guest's claim one tap, and only its last digits reach the page", async () => {
  reset({ capacity: 10 });
  await rejects(create({ allowGuests: true, label: "Riya", phone: "12345" }), "PHONE_INVALID");
  await rejects(create({ allowGuests: true, phone: "9876543210" }), "LABEL_REQUIRED");
  assert.equal((await create({ label: "Riya", phone: "9876543210" })).phone, undefined, "members claim on their account: no number kept");
  const link = await create({ spots: 3, allowGuests: true, label: "Riya (@riya.runs)", phone: "+91 98XXXXXXX" });
  assert.equal(link.phone, "9876543210", "the organizer sees the number they gave");
  const view = await gifts.getGiftView(link.id);
  assert.deepEqual(view?.link.preset, { name: "Riya (@riya.runs)", phoneEnding: "3210" });
  assert.ok(!JSON.stringify(view).includes("9876543210"), "the full number never reaches the gift page");
  const friend = await gifts.claimGiftAsGuest(link.id, { phone: "9123456789" });
  assert.equal(rows.get(`gift_guests/${friend.passId}`)?.name, "Guest of Riya (@riya.runs)", "a friend claiming first is still their guest");
  const riya = await gifts.claimGiftAsGuest(link.id, {});
  assert.deepEqual({ name: rows.get(`gift_guests/${riya.passId}`)?.name, phone: rows.get(`gift_guests/${riya.passId}`)?.phone }, { name: "Riya (@riya.runs)", phone: "9876543210" });
  assert.equal((await gifts.getGiftView(link.id))?.link.preset, undefined, "once claimed, there's no one-tap claim");
  await rejects(gifts.claimGiftAsGuest(link.id, {}), "PHONE_INVALID");
  const solo = await create({ allowGuests: true, label: "Kabir" });
  const kabir = await gifts.claimGiftAsGuest(solo.id, { phone: "9000000001" });
  assert.equal(rows.get(`gift_guests/${kabir.passId}`)?.name, "Kabir", "a one-person link names whoever claims it");
  assert.deepEqual((await gifts.getGiftView(solo.id))?.passes.map(pass => pass.id), [kabir.passId], "a one-person link opens its guest's pass");
  const shared = await gifts.getGiftView(link.id);
  assert.deepEqual(shared?.passes.map(pass => pass.id).sort(), [friend.passId, riya.passId].sort(), "only this link's passes");
  assert.ok(!/9123456789|9876543210/.test(JSON.stringify(shared)), "no guest's number reaches the gift page");
  const anonymous = await create({ allowGuests: true });
  const nobody = await gifts.claimGiftAsGuest(anonymous.id, { phone: "9000000002" });
  assert.equal(rows.get(`gift_guests/${nobody.passId}`)?.name, "Guest");
});

test("without the gift guest table, no-account links fall back to signing in", async () => {
  reset();
  const link = await create({ allowGuests: true, label: "Riya", phone: "9876543210" });
  const variable = "NEXT_PUBLIC_APPWRITE_GIFT_GUESTS_COLLECTION_ID";
  const saved = process.env[variable];
  delete process.env[variable];
  try {
    const view = await gifts.getGiftView(link.id);
    assert.deepEqual({ allowGuests: view?.link.allowGuests, preset: view?.link.preset, state: view?.state }, { allowGuests: false, preset: undefined, state: "open" }, "the page asks people to sign in");
    await rejects(gifts.claimGiftAsGuest(link.id, {}), "GIFT_ACCOUNT_REQUIRED");
    await rejects(create({ allowGuests: true }), "GUEST_PASSES_NOT_CONFIGURED");
    assert.equal((await create()).allowGuests, false, "links for members still work");
    assert.equal(await gifts.getGuestPass(`p${"A".repeat(24)}`), null);
    assert.deepEqual([...rows.keys()].filter(key => key.startsWith("gift_guests/") || key.startsWith("rsvps/")), [], "no seat or pass was taken");
  } finally {
    process.env[variable] = saved;
  }
});

test("a link made with a number that already has a spot opens that guest's pass", async () => {
  reset({ capacity: 10 });
  const first = await create({ allowGuests: true, label: "Riya" });
  const pass = await gifts.claimGiftAsGuest(first.id, { phone: "9876543210" });
  const again = await create({ allowGuests: true, label: "Riya", phone: "9876543210" });
  const view = await gifts.getGiftView(again.id);
  assert.equal(view?.link.preset, undefined, "no one-tap claim: they already have a spot");
  assert.deepEqual(view?.passes.map(item => [item.id, item.name, item.state]), [[pass.passId, "Riya", "valid"]], "the new link opens their existing pass");
  await rejects(gifts.claimGiftAsGuest(again.id, { phone: "98XXXXXXX" }), "GUEST_ALREADY_GOING");
  const other = await create({ allowGuests: true, label: "Kabir", phone: "9000000001" });
  assert.deepEqual((await gifts.getGiftView(other.id))?.passes, [], "nothing to open until that guest claims");
});
