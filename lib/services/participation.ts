import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { appwriteCollections as collections } from "@/lib/appwrite/config";
import {
  createAppwriteDocument, deleteAppwriteDocument, getAppwriteDocument, updateAppwriteDocument,
  listAppwriteDocuments, userDocumentPermissions, Query,
  type AppwriteDocument,
} from "@/lib/appwrite/database";
import { HttpError } from "@/lib/http";
import { formatInr, MAX_TICKET_RUPEES, parseEventPrice, ticketHoldEndsAt } from "@/lib/pricing";
import { bookingCloseTime } from "@/lib/booking-window";
import type { AuthUser } from "@/lib/auth";
import { getAdminServices } from "@/lib/appwrite/server";
import { clubOrganizerIds, organizerIdsOf } from "@/lib/services/organizers";
import type { RSVP, SavedItem, Membership, Participation, CheckIn } from "@/types/platform";

export type { RSVP, SavedItem, Membership, Participation, CheckIn } from "@/types/platform";
export type SavedItemType = SavedItem["itemType"];
export interface AccountParticipation {
  rsvps: RSVP[];
  savedItems: SavedItem[];
  memberships: Membership[];
  participations: Participation[];
  checkins: CheckIn[];
}

type Row<T> = Omit<T, "id">;
/** paymentRef stays server-side: only a reserved spot's WhatsApp contact reaches an RSVP DTO, read by its owner. */
type TicketRow = Omit<Row<RSVP>, "whatsapp"> & { paymentRef?: string };
type EventRecord = {
  slug: string;
  demo?: boolean;
  title: string;
  status: string;
  capacity?: number;
  startsAt: string;
  endsAt: string;
  organizerUserId?: string;
  communitySlug?: string;
  activityId: string;
  payload?: string;
};

export const documentIdSchema = z.string().trim().min(1).max(36).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
export const eventInputSchema = z.object({ eventId: documentIdSchema }).strict();
/** `amount` is still accepted from pages loaded before online payment, and ignored: paid tickets are held and paid through /api/payments/payu. */
export const rsvpInputSchema = z.object({ eventId: documentIdSchema, amount: z.number().int().positive().max(MAX_TICKET_RUPEES * 100).optional() }).strict();
export const savedInputSchema = z.object({ itemType: z.enum(["event", "place", "community"]), itemId: documentIdSchema }).strict();
export const followInputSchema = z.object({ communityId: documentIdSchema }).strict();
/** What the desk collected in hand (paise): the ticket's full price, to settle a spot still due or a walk-in's. */
export const collectedSchema = z.number().int().min(1).max(MAX_TICKET_RUPEES * 100);
/** `register`: the scanned member hasn't signed up and the session takes late sign-ups: give them a spot. */
export const checkInInputSchema = z.object({ eventId: documentIdSchema, token: z.string().trim().min(20).max(2048), register: z.literal(true).optional(), collected: collectedSchema.optional() }).strict();

/** What the desk did besides scanning: registered a walk-in, and/or took their payment in hand. */
export interface DeskAction { register?: boolean; collected?: number }

function idFor(...parts: string[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 36);
}
export const rsvpDocumentId = (eventId: string, userId: string) => idFor("rsvp", eventId, userId);
export const checkInDocumentId = (eventId: string, userId: string) => idFor("checkin", eventId, userId);
export const participationDocumentId = (eventId: string, userId: string) => idFor("participation", eventId, userId);
export const savedItemDocumentId = (itemType: SavedItemType, itemId: string, userId: string) => idFor("saved", itemType, itemId, userId);
export const membershipDocumentId = (communityId: string, userId: string) => idFor("membership", communityId, userId);

/** A guest who claimed a gift spot without an account holds their seat under a server-made ID with this
 * prefix (lib/services/gifts.ts). It is never an Appwrite account. */
export const GUEST_HOLDER_PREFIX = "guest.";
export const isGuestHolder = (userId: string) => userId.startsWith(GUEST_HOLDER_PREFIX);
/** Members can read their own rows; a guest has no account, so their rows are server-only. */
const ownerPermissions = (userId: string) => isGuestHolder(userId) ? [] : userDocumentPermissions(userId);

function isCode(error: unknown, code: number): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

/** A spot reserved to pay later (reserveTicket) carries this paymentRef: the WhatsApp number its payment
 * link goes to, then the name the member gave. The number is a fixed 10 digits, so the name may hold anything. */
const WHATSAPP_REF = /^whatsapp:([6-9]\d{9}):(.+)$/;
export const whatsappPaymentRef = (phone: string, name: string) => `whatsapp:${phone}:${name}`;
export function whatsappContactOf(paymentRef: string | undefined): { name: string; phone: string } | undefined {
  const match = paymentRef ? WHATSAPP_REF.exec(paymentRef) : null;
  return match ? { phone: match[1], name: match[2] } : undefined;
}

/** Explicit field selection keeps DB metadata and future private attributes out of API DTOs. */
const rsvpDto = (r: AppwriteDocument<TicketRow>): RSVP => {
  const whatsapp = r.amount ? whatsappContactOf(r.paymentRef) : undefined;
  return {
    id: r.$id, eventId: r.eventId, userId: r.userId, status: r.status, seatNumber: r.seatNumber, createdAt: r.createdAt,
    ...(r.amount ? { amount: r.amount, paymentStatus: r.paymentStatus === "paid" ? "paid" as const : "pending" as const, ...(whatsapp ? { whatsapp } : {}) } : r.paymentStatus === "gift" ? { paymentStatus: "gift" as const } : {}),
  };
};
const savedDto = (r: AppwriteDocument<Row<SavedItem>>): SavedItem => ({ id: r.$id, itemId: r.itemId, itemType: r.itemType, userId: r.userId, createdAt: r.createdAt });
const membershipDto = (r: AppwriteDocument<Row<Membership>>): Membership => ({ id: r.$id, communityId: r.communityId, status: r.status, userId: r.userId, createdAt: r.createdAt });
const checkinDto = (r: AppwriteDocument<Row<CheckIn>>): CheckIn => ({ id: r.$id, eventId: r.eventId, userId: r.userId, timestamp: r.timestamp, verificationMethod: r.verificationMethod });
const participationDto = (r: AppwriteDocument<Row<Participation>>): Participation => ({ id: r.$id, eventId: r.eventId, userId: r.userId, activityId: r.activityId, title: r.title, occurredAt: r.occurredAt, status: r.status, source: r.source });

async function getEvent(eventId: string, published = true) {
  documentIdSchema.parse(eventId);
  const event = await getAppwriteDocument<EventRecord>(collections.events, eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event was not found");
  if (published && event.status !== "published") throw new HttpError(409, "EVENT_UNAVAILABLE", "This event is not available");
  return event;
}

function eventPayload(event: EventRecord): { price?: unknown; demo?: unknown; lateSignup?: unknown; bookingClosesAt?: unknown } {
  try {
    return JSON.parse(event.payload ?? "") ?? {};
  } catch {
    return {};
  }
}

const eventPricing = (event: EventRecord) => parseEventPrice(eventPayload(event).price);

/** The organizer lets people sign up after the start, and register walk-ins at the check-in desk. */
const allowsLateSignup = (event: EventRecord) => eventPayload(event).lateSignup === true;

/** When sign-ups and gift claims close: the organizer's closing time, else the start (the end with late sign-ups). */
function signupClosesAt(event: EventRecord): number {
  const { start, end } = eventWindow(event);
  const closes = eventPayload(event).bookingClosesAt;
  return bookingCloseTime(start, end, { lateSignup: allowsLateSignup(event), bookingClosesAt: typeof closes === "string" ? closes : undefined });
}

/** What a payment needs to name an event and link back to it. Demo listings never take real money. */
export async function getTicketEvent(eventId: string): Promise<{ title: string; slug: string; demo: boolean }> {
  const event = await getEvent(eventId, false);
  return { title: event.title, slug: event.slug, demo: Boolean(event.demo ?? eventPayload(event).demo) };
}

async function requireItem(itemType: SavedItemType, itemId: string): Promise<void> {
  savedInputSchema.parse({ itemType, itemId });
  const collection = { event: collections.events, place: collections.places, community: collections.communities }[itemType];
  const item = await getAppwriteDocument<{ status: string }>(collection, itemId);
  if (!item) throw new HttpError(404, "ITEM_NOT_FOUND", "That item was not found");
  if (item.status !== "published") throw new HttpError(409, "ITEM_UNAVAILABLE", "That item is not available");
}

export function eventWindow(event: { startsAt: string; endsAt: string }) {
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new HttpError(409, "EVENT_DATES_INVALID", "The organizer needs to confirm this event’s schedule");
  }
  return { start, end, opensAt: start - 30 * 60_000, closesAt: end + 60 * 60_000 };
}

export type ParticipationControls = Pick<AccountParticipation, "rsvps" | "savedItems" | "memberships">;

/** Internal server DAL: callers must authenticate userId or explicitly enforce profile visibility.
 * Buttons need current intent, not the member's entire attendance history. No persistent cache. */
export async function getParticipationControls(userId: string): Promise<ParticipationControls> {
  documentIdSchema.parse(userId);
  const [rsvps, savedItems, memberships] = await Promise.all([
    // No select: Appwrite rejects a select naming the ticket attributes before `appwrite:setup` has added them.
    listAppwriteDocuments<TicketRow>(collections.rsvps, [Query.equal("userId", userId)]),
    listAppwriteDocuments<Row<SavedItem>>(collections.savedItems, [Query.equal("userId", userId), Query.select(["userId", "itemId", "itemType", "createdAt"])]),
    listAppwriteDocuments<Row<Membership>>(collections.memberships, [Query.equal("userId", userId), Query.select(["userId", "communityId", "status", "createdAt"])]),
  ]);
  return { rsvps: rsvps.map(rsvpDto), savedItems: savedItems.map(savedDto), memberships: memberships.map(membershipDto) };
}

/** Full account/history contract; all five collections still load concurrently. */
export async function getAccountParticipation(userId: string): Promise<AccountParticipation> {
  documentIdSchema.parse(userId);
  const [controls, participations, checkins] = await Promise.all([
    getParticipationControls(userId),
    listAppwriteDocuments<Row<Participation>>(collections.participations, [Query.equal("userId", userId), Query.select(["userId", "eventId", "activityId", "title", "occurredAt", "status", "source"])]),
    listAppwriteDocuments<Row<CheckIn>>(collections.checkins, [Query.equal("userId", userId), Query.select(["userId", "eventId", "timestamp", "verificationMethod"])]),
  ]);
  return { ...controls, participations: participations.map(participationDto), checkins: checkins.map(checkinDto) };
}

async function createOnce<T extends object>(collection: string, id: string, data: T, userId: string): Promise<AppwriteDocument<T>> {
  try {
    return await createAppwriteDocument(collection, data, id, ownerPermissions(userId));
  } catch (error) {
    if (!isCode(error, 409)) throw error;
    const existing = await getAppwriteDocument<T>(collection, id);
    if (existing) return existing;
    throw new HttpError(409, "RETRY_REQUIRED", "This item changed. Please try again.");
  }
}

async function deleteIfPresent(collection: string, id: string): Promise<void> {
  try {
    await deleteAppwriteDocument(collection, id);
  } catch (error) {
    if (!isCode(error, 404)) throw error;
  }
}

export async function saveItem(userId: string, itemType: SavedItemType, itemId: string): Promise<SavedItem> {
  documentIdSchema.parse(userId);
  await requireItem(itemType, itemId);
  return savedDto(await createOnce<Row<SavedItem>>(collections.savedItems, savedItemDocumentId(itemType, itemId, userId), {
    userId, itemId, itemType, createdAt: new Date().toISOString(),
  }, userId));
}

export async function unsaveItem(userId: string, itemType: SavedItemType, itemId: string): Promise<void> {
  documentIdSchema.parse(userId);
  savedInputSchema.parse({ itemType, itemId });
  // Removing a private bookmark must remain possible after its target is unpublished/deleted.
  await deleteIfPresent(collections.savedItems, savedItemDocumentId(itemType, itemId, userId));
}

export async function followCommunity(userId: string, communityId: string): Promise<Membership> {
  documentIdSchema.parse(userId);
  await requireItem("community", communityId);
  return membershipDto(await createOnce<Row<Membership>>(collections.memberships, membershipDocumentId(communityId, userId), {
    userId, communityId, status: "active", createdAt: new Date().toISOString(),
  }, userId));
}

export async function unfollowCommunity(userId: string, communityId: string): Promise<void> {
  documentIdSchema.parse(userId);
  documentIdSchema.parse(communityId);
  await deleteIfPresent(collections.memberships, membershipDocumentId(communityId, userId));
}

export async function getUserRsvp(eventId: string, userId: string): Promise<RSVP | null> {
  documentIdSchema.parse(eventId);
  documentIdSchema.parse(userId);
  const row = await getAppwriteDocument<TicketRow>(collections.rsvps, rsvpDocumentId(eventId, userId));
  return row ? rsvpDto(row) : null;
}

/** A free event's RSVP, confirmed at once. A paid event's ticket is never confirmed here: it starts
 * as a hold (holdTicket) and only a confirmed payment (confirmTicketPayment) confirms it. */
export async function createRsvp(userId: string, eventId: string): Promise<RSVP> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId);
  const closes = signupClosesAt(event);
  if (Date.now() >= closes) throw new HttpError(409, "EVENT_STARTED", "RSVP is closed for this event");
  const existing = await getUserRsvp(eventId, userId);
  if (existing?.status === "confirmed") return existing;
  const pricing = eventPricing(event);
  if (pricing.kind === "paid") throw new HttpError(409, "PAYMENT_REQUIRED", `Tickets for this event are ${pricing.label}, confirmed once paid online.`);
  return allocateSeat(event, eventId, userId, { status: "confirmed" }, closes);
}

const holdEnded = (row: { createdAt?: string }, now = Date.now()) => !(ticketHoldEndsAt(String(row.createdAt)) > now);

/** A new ticket is taken only at the price the member confirmed: the event's current one. Returns it (paise). */
function confirmedTicketPrice(event: EventRecord, expectedAmount: number): number {
  const pricing = eventPricing(event);
  if (pricing.kind !== "paid" || expectedAmount !== pricing.amount) {
    throw new HttpError(409, "PRICE_CHANGED", pricing.kind === "paid" ? `This ticket is ${pricing.label}. Check the price and confirm again.` : "This event’s price has changed. Reload the page and try again.");
  }
  return pricing.amount;
}

/**
 * A paid event's ticket starts as a hold: its seat is reserved (status "pending") for
 * TICKET_HOLD_MINUTES while the member pays, and only confirmTicketPayment confirms it. Returns the
 * member's existing ticket or hold instead of taking a second seat; retrying renews a hold that ran
 * out while its seat is still unclaimed. A hold keeps the price it was taken at.
 */
export async function holdTicket(userId: string, eventId: string, expectedAmount: number): Promise<RSVP> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId);
  const closes = signupClosesAt(event);
  if (Date.now() >= closes) throw new HttpError(409, "EVENT_STARTED", "Ticket sales have closed for this event");
  const id = rsvpDocumentId(eventId, userId);
  const existing = await getAppwriteDocument<TicketRow>(collections.rsvps, id);
  if (existing?.status === "confirmed") return rsvpDto(existing);
  if (existing?.status === "pending") {
    if (!holdEnded(existing)) return rsvpDto(existing);
    const createdAt = new Date().toISOString();
    try {
      await updateAppwriteDocument(collections.rsvps, id, { createdAt });
      return rsvpDto({ ...existing, createdAt });
    } catch (error) {
      if (!isCode(error, 404)) throw error;
      // Released to someone else a moment ago: take a new seat below.
    }
  }
  const amount = confirmedTicketPrice(event, expectedAmount);
  return allocateSeat(event, eventId, userId, { status: "pending", amount, paymentStatus: "pending" }, closes);
}

/**
 * A paid event's spot booked to pay later, while online payment is off (PAID_TICKET_BOOKING): confirmed
 * at once with its price due, and the organizer sends the payment link to the member's WhatsApp number,
 * kept in paymentRef. Returns the member's existing spot instead of taking a second seat. An unpaid hold
 * from an earlier checkout becomes the reserved spot, at the price it was held at.
 */
export async function reserveTicket(userId: string, eventId: string, expectedAmount: number, contact: { name: string; phone: string }): Promise<RSVP> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId);
  const closes = signupClosesAt(event);
  if (Date.now() >= closes) throw new HttpError(409, "EVENT_STARTED", "Ticket sales have closed for this event");
  const id = rsvpDocumentId(eventId, userId);
  const existing = await getAppwriteDocument<TicketRow>(collections.rsvps, id);
  if (existing?.status === "confirmed") return rsvpDto(existing);
  const fields = { status: "confirmed" as const, paymentStatus: "pending" as const, paymentRef: whatsappPaymentRef(contact.phone, contact.name) };
  if (existing?.status === "pending" && existing.amount) {
    try {
      await updateAppwriteDocument(collections.rsvps, id, fields);
      return rsvpDto({ ...existing, ...fields });
    } catch (error) {
      if (!isCode(error, 404)) throw error;
      // Released to someone else a moment ago: take a new seat below.
    }
  }
  const amount = confirmedTicketPrice(event, expectedAmount);
  return allocateSeat(event, eventId, userId, { ...fields, amount }, closes);
}

/** A ticket PayU confirmed carries this reference prefix (lib/services/ticket-payments.ts); only PayU changes it. */
export const isPaidOnline = (paymentRef: string | undefined) => Boolean(paymentRef?.startsWith("payu:"));

/**
 * An event's organizer records a ticket's payment by hand: paid (e.g. through the WhatsApp link) or still
 * due. The ticket is found by its spot, so no account ID reaches the organizer. Only paymentStatus changes:
 * the WhatsApp contact stays for the organizer, and a ticket paid on PayU is left to PayU.
 */
export async function setTicketPaid(operator: Pick<AuthUser, "id" | "labels">, eventId: string, seatNumber: number, paid: boolean): Promise<{ seatNumber: number; paid: boolean }> {
  const event = await getEvent(eventId, false);
  if (!(await managesEvent(operator, { organizerIds: organizerIdsOf(event), communitySlug: event.communitySlug }))) {
    throw new HttpError(403, "ORGANIZER_REQUIRED", "Only this session’s organizers or an administrator can update its payments");
  }
  const [row] = await listAppwriteDocuments<TicketRow>(collections.rsvps, [Query.equal("eventId", event.$id), Query.equal("seatNumber", seatNumber), Query.limit(1)]);
  if (!row || row.status !== "confirmed" || !row.amount) throw new HttpError(404, "TICKET_NOT_FOUND", "No ticket holds that spot");
  if (isPaidOnline(row.paymentRef)) throw new HttpError(409, "PAID_ONLINE", "This ticket was paid online through PayU, so its payment can’t be changed here");
  if ((row.paymentStatus === "paid") !== paid) await updateAppwriteDocument(collections.rsvps, row.$id, { paymentStatus: paid ? "paid" : "pending" });
  return { seatNumber, paid };
}

/** Still waiting on its WhatsApp payment link: a confirmed spot booked to pay later, not yet paid. */
const awaitingWhatsappPayment = (row: TicketRow) => row.status === "confirmed" && Boolean(row.amount) && row.paymentStatus !== "paid" ? whatsappContactOf(row.paymentRef) : undefined;

/**
 * A member changed their mobile number in settings: the payment links for their spots booked to pay on
 * WhatsApp, still unpaid, for sessions that haven't started, now go to it. The name they booked with stays.
 * Paid tickets and everyone else's are never touched. Returns how many spots changed.
 */
export async function updateWhatsappNumber(userId: string, phone: string): Promise<number> {
  documentIdSchema.parse(userId);
  const rows = await listAppwriteDocuments<TicketRow>(collections.rsvps, [Query.equal("userId", userId)]);
  let updated = 0;
  for (const row of rows) {
    const contact = row.userId === userId ? awaitingWhatsappPayment(row) : undefined;
    if (!contact || contact.phone === phone) continue;
    const event = await getAppwriteDocument<EventRecord>(collections.events, row.eventId);
    try {
      if (!event || Date.now() >= eventWindow(event).start) continue;
    } catch {
      continue;
    }
    // Re-read just before writing: a payment that confirmed a moment ago keeps its own reference.
    const latest = await getAppwriteDocument<TicketRow>(collections.rsvps, row.$id);
    if (!latest || latest.paymentRef !== row.paymentRef || !awaitingWhatsappPayment(latest)) continue;
    await updateAppwriteDocument(collections.rsvps, row.$id, { paymentRef: whatsappPaymentRef(phone, contact.name) });
    updated += 1;
  }
  return updated;
}

/**
 * A spot the organizer gave away with a gift link (lib/services/gifts.ts): confirmed at once and never
 * charged, on free and paid events alike. It takes a seat like any RSVP, so capacity still applies.
 * A member part-way through paying has their hold turned into the gift ticket; if that payment completes
 * too, settling it finds no hold and flags it for refund. `claimed` is false when the member already
 * had a spot of their own: the gift is left for someone else.
 */
export async function claimGiftTicket(userId: string, eventId: string, giftRef: string): Promise<{ rsvp: RSVP; claimed: boolean }> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId);
  const closes = signupClosesAt(event);
  if (Date.now() >= closes) throw new HttpError(409, "EVENT_STARTED", "Sign-ups for this session have closed");
  const id = rsvpDocumentId(eventId, userId);
  const existing = await getAppwriteDocument<TicketRow>(collections.rsvps, id);
  if (existing?.status === "confirmed") return { rsvp: rsvpDto(existing), claimed: existing.paymentRef === giftRef };
  const fields = { status: "confirmed" as const, paymentStatus: "gift" as const, paymentRef: giftRef };
  if (existing?.status === "pending") {
    try {
      await updateAppwriteDocument(collections.rsvps, id, { ...fields, amount: null });
      return { rsvp: rsvpDto({ ...existing, ...fields, amount: undefined }), claimed: true };
    } catch (error) {
      if (!isCode(error, 404)) throw error;
      // Released to someone else a moment ago: take a new seat below.
    }
  }
  return { rsvp: await allocateSeat(event, eventId, userId, fields, closes), claimed: true };
}

/**
 * Takes the lowest free seat for an RSVP, ticket or hold; seat holders are never displaced. Only when
 * no seat is free is one reclaimed from someone else's hold that ran out unpaid.
 *
 * The atomic create + unique(eventId,seatNumber) index serializes allocation, NOT the preceding read.
 * Every proposed seat is in [1,capacity]. A second unique(eventId,userId) index and deterministic user
 * ID prohibit duplicate reservations. Never upsert an RSVP: that could overwrite a seat owner.
 */
async function allocateSeat(event: EventRecord, eventId: string, userId: string, fields: Partial<TicketRow> & Pick<TicketRow, "status">, closesAt = Infinity): Promise<RSVP> {
  const capacity = event.capacity;
  if (!Number.isSafeInteger(capacity) || !capacity || capacity < 1 || capacity > 100_000) {
    throw new HttpError(409, "CAPACITY_UNAVAILABLE", "The organizer needs to confirm event capacity");
  }
  const current = await listAppwriteDocuments<TicketRow>(collections.rsvps, [Query.equal("eventId", eventId)]);
  const holders = new Map(current.map((row) => [row.seatNumber, row]));
  const now = Date.now();
  const free: number[] = [];
  const lapsed: AppwriteDocument<TicketRow>[] = [];
  for (let seatNumber = 1; seatNumber <= capacity; seatNumber += 1) {
    const holder = holders.get(seatNumber);
    if (!holder) free.push(seatNumber);
    else if (holder.status === "pending" && holder.userId !== userId && holdEnded(holder, now)) lapsed.push(holder);
  }
  const claim = async (seatNumber: number): Promise<RSVP | null> => {
    if (Date.now() >= closesAt) throw new HttpError(409, "EVENT_STARTED", "RSVP is closed for this event");
    try {
      return rsvpDto(await createAppwriteDocument<TicketRow>(collections.rsvps, {
        eventId, userId, seatNumber, createdAt: new Date().toISOString(), ...fields,
      }, rsvpDocumentId(eventId, userId), ownerPermissions(userId)));
    } catch (error) {
      // `npm run appwrite:setup` adds the ticket attributes; until then Appwrite rejects them.
      if (fields.amount && isCode(error, 400)) throw new HttpError(503, "TICKETS_NOT_CONFIGURED", "Tickets for paid events are not switched on yet. Please try again later.");
      if (!isCode(error, 409)) throw error;
      // The member got a seat in a concurrent request, or another attendee owns this one (the unique index keeps it safe).
      return getUserRsvp(eventId, userId);
    }
  };
  for (const seatNumber of free) {
    const rsvp = await claim(seatNumber);
    if (rsvp) return rsvp;
  }
  for (const hold of lapsed) {
    if (!(await releaseLapsedHold(hold.$id))) continue;
    const rsvp = await claim(hold.seatNumber);
    if (rsvp) return rsvp;
  }
  throw new HttpError(409, "EVENT_FULL", "This event is currently full");
}

/** Frees the seat of a hold that ran out unpaid. Re-read first: a payment may have just confirmed it.
 * Appwrite has no conditional delete, so a payment confirmed in the instant between the re-read and the
 * delete loses its row; the next settle of that payment (PayU's webhook usually follows the redirect)
 * reissues the ticket or flags the payment for refund. That needs a payment finishing more than
 * TICKET_HOLD_MINUTES late at the moment someone else takes the last seat. */
async function releaseLapsedHold(id: string): Promise<boolean> {
  const row = await getAppwriteDocument<TicketRow>(collections.rsvps, id);
  if (!row) return true;
  if (row.status !== "pending" || !holdEnded(row)) return false;
  await deleteIfPresent(collections.rsvps, id);
  return true;
}

export async function cancelRsvp(userId: string, eventId: string): Promise<void> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId, false);
  // Cancellation is allowed for cancelled events but never erases verified attendance.
  const checkedIn = await getAppwriteDocument<Row<CheckIn>>(collections.checkins, checkInDocumentId(eventId, userId));
  if (checkedIn) throw new HttpError(409, "ALREADY_CHECKED_IN", "You have already checked in to this event");
  // Deleting a paid ticket would erase the payment record; refunds go through the organizer.
  if ((await getUserRsvp(eventId, userId))?.paymentStatus === "paid") {
    throw new HttpError(409, "TICKET_PAID", "This ticket is paid for. Contact the organizer about a refund.");
  }
  if (event.status !== "cancelled" && Date.now() >= eventWindow(event).start) {
    throw new HttpError(409, "EVENT_STARTED", "This event has already started");
  }
  await deleteIfPresent(collections.rsvps, rsvpDocumentId(eventId, userId));
}

/**
 * The only way a paid event's ticket is confirmed: marks the hold (or an older pay-at-venue ticket)
 * paid and confirmed. Call only with a payment the gateway itself confirmed server to server
 * (lib/services/ticket-payments.ts). Idempotent for the same paymentRef; the amount must match the
 * held ticket. A 404/409 here means the money arrived but no ticket can take it: refund it.
 */
export async function confirmTicketPayment(eventId: string, userId: string, amount: number, paymentRef: string): Promise<RSVP> {
  const id = rsvpDocumentId(documentIdSchema.parse(eventId), documentIdSchema.parse(userId));
  const ref = paymentRef.slice(0, 128);
  let ticket = await getAppwriteDocument<TicketRow>(collections.rsvps, id);
  if (!ticket) {
    // The hold ran out and its seat was released, or the member cancelled while paying. The money
    // arrived, so issue the ticket if a seat is free.
    await allocateSeat(await getEvent(eventId), eventId, userId, { status: "confirmed", amount, paymentStatus: "paid", paymentRef: ref });
    ticket = await getAppwriteDocument<TicketRow>(collections.rsvps, id);
  }
  if (!ticket?.amount || (ticket.status !== "confirmed" && ticket.status !== "pending")) throw new HttpError(404, "TICKET_NOT_FOUND", "No ticket is awaiting payment");
  if (ticket.amount !== amount) throw new HttpError(409, "AMOUNT_MISMATCH", "The payment does not match the ticket price");
  if (ticket.paymentStatus === "paid") {
    if (ticket.paymentRef === ref) return rsvpDto(ticket);
    throw new HttpError(409, "DUPLICATE_PAYMENT", "This ticket was already paid for");
  }
  await updateAppwriteDocument(collections.rsvps, id, { status: "confirmed", paymentStatus: "paid", paymentRef: ref });
  return rsvpDto({ ...ticket, status: "confirmed", paymentStatus: "paid", paymentRef: ref });
}

function secret(): string {
  const value = process.env.APPWRITE_CHECKIN_SECRET;
  if (!value || value.length < 32 || value === process.env.APPWRITE_KEY) {
    throw new HttpError(503, "CHECKIN_NOT_CONFIGURED", "Check-in is not configured");
  }
  return value;
}

const fitnessIdSchema = z.string().regex(/^NF-[A-F0-9]{16}$/);
const tokenSchema = z.object({ v: z.literal(1), purpose: z.literal("participant-checkin"), fitnessId: fitnessIdSchema, iat: z.number().int().nonnegative(), exp: z.number().int().positive() }).strict();
interface FitnessIdRecord { userId: string; publicId: string; status: string; }
export const CHECKIN_TOKEN_TTL = 15 * 60_000;

/*
 * The participant QR's code: the .fit ID and its expiry, signed with an HMAC cut to 128 bits, written in
 * base32 so the QR packs it in alphanumeric mode. 47 characters make a 29×29 QR (version 3, like a guest
 * pass) that desk cameras read at arm's length. The first format, signed JSON of about 200 characters, made
 * a 57×57 QR the desk had to zoom into; it is still accepted, so a QR opened before the switch still scans.
 */
const COMPACT_TOKEN = /^[A-Z2-7]{47}$/;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const COMPACT_VERSION = 2;

function toBase32(bytes: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return bits ? out + BASE32[(value << (5 - bits)) & 31] : out;
}

function fromBase32(text: string): Buffer {
  const bytes: number[] = [];
  let bits = 0, value = 0;
  for (const char of text) {
    value = (value << 5) | BASE32.indexOf(char); bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

/** Version byte, the .fit ID's 8 bytes and the expiry in seconds: what the compact code signs. */
const compactSignature = (body: Buffer) => createHmac("sha256", secret()).update("participant-checkin:v2:").update(body).digest().subarray(0, 16);

function compactToken(fitnessId: string, expSeconds: number): string {
  const body = Buffer.alloc(13);
  body[0] = COMPACT_VERSION;
  Buffer.from(fitnessId.slice(3), "hex").copy(body, 1);
  body.writeUInt32BE(expSeconds, 9);
  return toBase32(Buffer.concat([body, compactSignature(body)]));
}

function decodeCompactToken(token: string): { fitnessId: string; exp: number } {
  const bytes = fromBase32(token);
  // One spelling per code: the unused trailing bits must be zero.
  if (bytes.length !== 29 || toBase32(bytes) !== token || bytes[0] !== COMPACT_VERSION) throw new HttpError(400, "CHECKIN_TOKEN_INVALID", "Check-in code is invalid");
  const body = bytes.subarray(0, 13);
  if (!timingSafeEqual(bytes.subarray(13), compactSignature(body))) throw new HttpError(400, "CHECKIN_TOKEN_INVALID", "Check-in code is invalid");
  const exp = body.readUInt32BE(9) * 1000;
  // Never a longer life than the server issues.
  if (exp > Date.now() + CHECKIN_TOKEN_TTL + 60_000) throw new HttpError(400, "CHECKIN_TOKEN_INVALID", "Check-in code is invalid");
  return { fitnessId: `NF-${body.subarray(1, 9).toString("hex").toUpperCase()}`, exp };
}

export function isAdminUser(user: Pick<AuthUser, "labels">): boolean {
  return user.labels?.includes("admin") === true;
}

/** Whether an account runs an event: an admin, one of the event's organizers, or an organizer of its club. */
export async function managesEvent(user: Pick<AuthUser, "id" | "labels">, event: { organizerIds: string[]; communitySlug?: string }): Promise<boolean> {
  if (isAdminUser(user) || event.organizerIds.includes(user.id)) return true;
  return (await clubOrganizerIds(event.communitySlug)).includes(user.id);
}

export async function canManageEvent(user: Pick<AuthUser, "id" | "labels">, eventId: string): Promise<boolean> {
  const event = await getEvent(eventId);
  return managesEvent(user, { organizerIds: organizerIdsOf(event), communitySlug: event.communitySlug });
}

function validateCheckInEvent(event: EventRecord): { opensAt: number; closesAt: number } {
  if (typeof event.title !== "string" || !event.title.trim() || typeof event.activityId !== "string" || !event.activityId.trim()) {
    throw new HttpError(409, "EVENT_DATA_INVALID", "This event is missing details required to record attendance");
  }
  return eventWindow(event);
}

/** Issued only for the authenticated owner; privacy/public-profile settings do not govern attendance. */
export async function createParticipantCheckInToken(userId: string): Promise<{ token: string; expiresAt: string }> {
  documentIdSchema.parse(userId);
  const identity = await getAppwriteDocument<FitnessIdRecord>(collections.fitnessIds, userId);
  if (!identity || identity.userId !== userId || identity.status !== "active" || !fitnessIdSchema.safeParse(identity.publicId).success) {
    throw new HttpError(409, "FITNESS_ID_UNAVAILABLE", "Your active .fit ID could not be found. Sign in again to finish account setup.");
  }
  // No account ID, contact details, profile settings or private history in the QR: the .fit ID and expiry only.
  const expSeconds = Math.floor((Date.now() + CHECKIN_TOKEN_TTL) / 1000);
  return { token: compactToken(identity.publicId, expSeconds), expiresAt: new Date(expSeconds * 1000).toISOString() };
}

function decodeSignedToken(token: string): { fitnessId: string; exp: number } {
  if (COMPACT_TOKEN.test(token)) return decodeCompactToken(token);
  if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new HttpError(400, "CHECKIN_TOKEN_INVALID", "Check-in code is invalid");
  }
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new HttpError(400, "CHECKIN_TOKEN_INVALID", "Check-in code is invalid");
  }
  try {
    const parsed = tokenSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (parsed.exp <= parsed.iat || parsed.exp - parsed.iat > CHECKIN_TOKEN_TTL || parsed.iat > Date.now()) throw new Error("Invalid interval");
    return parsed;
  } catch {
    throw new HttpError(400, "CHECKIN_TOKEN_INVALID", "Check-in code is invalid");
  }
}

export function verifyParticipantCheckInToken(token: string) {
  const parsed = decodeSignedToken(token);
  if (parsed.exp <= Date.now()) throw new HttpError(410, "CHECKIN_TOKEN_EXPIRED", "This participant QR has expired. Ask the participant to refresh their check-in QR.");
  return parsed;
}

/**
 * `fresh`: attendance was recorded just now, so the passport record almost never exists yet: it is created
 * straight away, one database trip instead of two. A record that does exist (a lost race) falls through to
 * the repair below.
 */
async function ensureVerifiedParticipation(userId: string, event: AppwriteDocument<EventRecord>, checkin: CheckIn, fresh = false): Promise<void> {
  const id = participationDocumentId(event.$id, userId);
  const data = {
    userId, eventId: event.$id, activityId: event.activityId, title: event.title.slice(0, 200),
    occurredAt: checkin.timestamp, source: "organizer_checkin", status: "verified",
  } satisfies Row<Participation>;
  try {
    if (fresh) {
      try {
        await createAppwriteDocument<Row<Participation>>(collections.participations, data, id, userDocumentPermissions(userId));
        return;
      } catch (error) {
        if (!isCode(error, 409)) throw error;
      }
    }
    const existing = await getAppwriteDocument<Row<Participation>>(collections.participations, id);
    if (existing) {
      if (existing.status !== "verified" || existing.source !== "organizer_checkin" || existing.occurredAt !== checkin.timestamp) {
        await updateAppwriteDocument<Row<Participation>>(collections.participations, id, data);
      }
      return;
    }
    await createAppwriteDocument<Row<Participation>>(collections.participations, data, id, userDocumentPermissions(userId));
  } catch {
    // Do not roll back the trusted attendance record; retries repair the second write.
    throw new HttpError(503, "PARTICIPATION_REPAIR_REQUIRED", "Attendance was recorded, but the passport update was interrupted. Scan the same participant again to finish the update; do not create another attendance record.");
  }
}

/** Administrator recovery only: derives history from an existing trusted check-in, never creates attendance. */
export async function repairRecordedCheckIn(actor: Pick<AuthUser, "id" | "labels">, eventId: string, userId: string): Promise<void> {
  if (!isAdminUser(actor)) throw new HttpError(403, "ADMIN_REQUIRED", "Administrator access is required");
  documentIdSchema.parse(userId);
  if (isGuestHolder(userId)) throw new HttpError(409, "GUEST_NO_PASSPORT", "Guests without an account have no passport to repair");
  const event = await getEvent(eventId, false);
  validateCheckInEvent(event);
  const recorded = await getAppwriteDocument<Row<CheckIn>>(collections.checkins, checkInDocumentId(eventId, userId));
  if (!recorded || recorded.eventId !== eventId || recorded.userId !== userId) throw new HttpError(404, "CHECKIN_NOT_FOUND", "No trusted attendance exists to repair");
  await ensureVerifiedParticipation(userId, event, checkinDto(recorded));
}

async function getOperatedEvent(operator: Pick<AuthUser, "id" | "labels">, eventId: string) {
  documentIdSchema.parse(operator.id);
  const event = await getEvent(eventId, false);
  if (!(await managesEvent(operator, { organizerIds: organizerIdsOf(event), communitySlug: event.communitySlug }))) {
    throw new HttpError(403, "ORGANIZER_REQUIRED", "Only this event’s assigned operator or an administrator can check in participants");
  }
  return event;
}

/**
 * A spot whose price is still due (booked to pay on WhatsApp, not yet marked paid) isn't let in: the desk says
 * so, collects, and marks it paid on the guest list. Every scan reads the ticket afresh, so the next scan after
 * that checks them in. Gift spots and free RSVPs have nothing to pay.
 */
function requirePaid(rsvp: Pick<RSVP, "amount" | "paymentStatus">, who: string): void {
  if (rsvp.amount && rsvp.paymentStatus !== "paid") {
    throw new HttpError(402, "PAYMENT_DUE", `${who} hasn’t paid ${formatInr(rsvp.amount)} for this session yet. Collect it, then tap Collected to check them in.`, undefined, { amountDue: rsvp.amount });
  }
}

/** A ticket the desk was paid for in hand. Like the guest list's Mark paid, only its payment status changes. */
async function collectAtDesk(ticket: RSVP, collected: number): Promise<RSVP> {
  if (collected !== ticket.amount) {
    throw new HttpError(409, "AMOUNT_MISMATCH", `Their ticket is ${formatInr(ticket.amount ?? 0)}. Collect that, then check them in.`);
  }
  await updateAppwriteDocument(collections.rsvps, ticket.id, { paymentStatus: "paid" });
  return { ...ticket, paymentStatus: "paid" };
}

/** A walk-in the desk registers, on a session that takes late sign-ups: a confirmed spot, paid in hand when it has a price. */
async function registerAtDesk(operator: Pick<AuthUser, "id">, event: AppwriteDocument<EventRecord>, userId: string, collected: number | undefined, closesAt: number): Promise<RSVP> {
  const pricing = eventPricing(event);
  const fields = pricing.kind === "paid"
    ? { status: "confirmed" as const, amount: pricing.amount, paymentStatus: "paid" as const, paymentRef: `desk:${operator.id}` }
    : { status: "confirmed" as const };
  if (pricing.kind === "paid" && collected !== pricing.amount) {
    throw new HttpError(409, "PRICE_CHANGED", `This session is ${pricing.label}. Collect that, then register them.`);
  }
  const rsvp = await allocateSeat(event, event.$id, userId, fields, closesAt);
  if (rsvp?.status !== "confirmed") throw new HttpError(409, "RETRY_REQUIRED", "Their spot changed a moment ago. Scan them again.");
  return rsvp;
}

/** Operator-scanned attendance. Possessing a participant QR never authorizes its holder to write attendance. */
export async function checkInParticipant(organizer: Pick<AuthUser, "id" | "labels">, eventId: string, token: string, desk: DeskAction = {}) {
  const event = await getOperatedEvent(organizer, eventId);
  const window = validateCheckInEvent(event);
  const payload = decodeSignedToken(token);
  const identities = await listAppwriteDocuments<FitnessIdRecord>(collections.fitnessIds, [Query.equal("publicId", payload.fitnessId), Query.limit(1)]);
  const identity = identities[0];
  if (!identity || identity.status !== "active" || identity.publicId !== payload.fitnessId) {
    throw new HttpError(403, "FITNESS_ID_UNAVAILABLE", "This participant’s .fit ID is not active");
  }
  const userId = documentIdSchema.parse(identity.userId);
  const id = checkInDocumentId(event.$id, userId);
  // Independent reads, all at once: each is a full database round trip, and they were most of a scan's wait.
  const [member, profile, existing, rsvp] = await Promise.all([
    getAdminServices().users.get({ userId }),
    getAppwriteDocument<{ displayName?: string }>(collections.profiles, userId),
    getAppwriteDocument<Row<CheckIn>>(collections.checkins, id),
    getUserRsvp(event.$id, userId),
  ]);
  if (!member.status) throw new HttpError(403, "MEMBER_UNAVAILABLE", "This participant’s account is not active");
  const displayName = profile?.displayName?.trim().slice(0, 120) || "NOIDA.FIT member";
  if (existing) {
    if (existing.userId !== userId || existing.eventId !== event.$id) throw new HttpError(409, "CHECKIN_DATA_INVALID", "The stored attendance needs administrator review");
    // A validly signed, expired identity QR can repair prior trusted attendance,
    // even after cancellation. It can never mint new attendance or alter its time.
    const checkin = checkinDto(existing);
    await ensureVerifiedParticipation(userId, event, checkin);
    return { eventId: event.$id, displayName, checkedInAt: checkin.timestamp, alreadyCheckedIn: true };
  }
  verifyParticipantCheckInToken(token);
  if (event.status !== "published") throw new HttpError(409, "EVENT_UNAVAILABLE", "This event is not available for new check-ins");
  const now = Date.now();
  if (now < window.opensAt || now >= window.closesAt) throw new HttpError(409, "CHECKIN_CLOSED", "Check-in is outside the event window");
  // The participant showed this card to the desk, so naming them here reveals nothing new.
  if (rsvp?.status === "pending") throw new HttpError(403, "PAYMENT_PENDING", `${displayName} hasn’t finished paying for a ticket, so they aren’t confirmed yet`);
  let ticket = rsvp?.status === "confirmed" ? rsvp : null;
  if (!ticket) {
    if (!allowsLateSignup(event)) throw new HttpError(403, "RSVP_REQUIRED", `${displayName} is not on the RSVP list for this event`);
    // A walk-in, on a session that takes late sign-ups: the desk can register them on the spot.
    if (!desk.register) {
      const pricing = eventPricing(event);
      throw new HttpError(403, "NOT_REGISTERED", `${displayName} hasn’t signed up for this session.${pricing.kind === "paid" ? ` Collect ${pricing.label}, then register them here.` : " Register them here to check them in."}`, undefined, { price: pricing.kind === "paid" ? pricing.amount : 0 });
    }
    ticket = await registerAtDesk(organizer, event, userId, desk.collected, window.closesAt);
  } else if (desk.collected !== undefined && ticket.amount && ticket.paymentStatus !== "paid") {
    ticket = await collectAtDesk(ticket, desk.collected);
  }
  requirePaid(ticket, displayName);
  const checkin = checkinDto(await createOnce<Row<CheckIn>>(collections.checkins, id, {
    eventId: event.$id, userId, timestamp: new Date().toISOString(), verificationMethod: "organizer_qr",
  }, userId));
  await ensureVerifiedParticipation(userId, event, checkin, true);
  return { eventId: event.$id, displayName, checkedInAt: checkin.timestamp, alreadyCheckedIn: false, ...(desk.register ? { registered: true } : {}), ...(desk.collected !== undefined ? { collected: desk.collected } : {}) };
}

/**
 * Checks in a guest who claimed a gift spot without an account, from their guest pass (lib/services/gifts.ts).
 * The same rules as a member: this event's operator or an admin, inside the check-in window, with a confirmed
 * spot, paid if it has a price. A guest has no .fit ID, so no passport record follows. `pass` resolves to the
 * seat holder and the name on the pass, or null for a pass that isn't for this event. It is read while the
 * operator is authorized, to save the desk a round trip; an authorization failure still wins, and nothing about
 * the pass is used until it passes.
 */
export async function checkInGuestHolder(operator: Pick<AuthUser, "id" | "labels">, eventId: string, pass: Promise<{ holderId: string; name: string } | null>, collected?: number) {
  const [operated, read] = await Promise.allSettled([getOperatedEvent(operator, eventId), pass]);
  if (operated.status === "rejected") throw operated.reason;
  if (read.status === "rejected") throw read.reason;
  const event = operated.value;
  const window = validateCheckInEvent(event);
  const holderId = read.value?.holderId, name = read.value?.name || "This guest";
  if (!holderId || !isGuestHolder(holderId)) throw new HttpError(403, "RSVP_REQUIRED", "This guest pass isn’t for this session");
  const id = checkInDocumentId(event.$id, holderId);
  const [existing, rsvp] = await Promise.all([getAppwriteDocument<Row<CheckIn>>(collections.checkins, id), getUserRsvp(event.$id, holderId)]);
  if (existing) return { eventId: event.$id, checkedInAt: existing.timestamp, alreadyCheckedIn: true };
  if (event.status !== "published") throw new HttpError(409, "EVENT_UNAVAILABLE", "This event is not available for new check-ins");
  const now = Date.now();
  if (now < window.opensAt || now >= window.closesAt) throw new HttpError(409, "CHECKIN_CLOSED", "Check-in is outside the event window");
  if (rsvp?.status !== "confirmed") throw new HttpError(403, "RSVP_REQUIRED", "This guest’s spot is no longer on the list for this session");
  const ticket = collected !== undefined && rsvp.amount && rsvp.paymentStatus !== "paid" ? await collectAtDesk(rsvp, collected) : rsvp;
  requirePaid(ticket, name);
  const checkin = await createOnce<Row<CheckIn>>(collections.checkins, id, {
    eventId: event.$id, userId: holderId, timestamp: new Date().toISOString(), verificationMethod: "guest_pass",
  }, holderId);
  return { eventId: event.$id, checkedInAt: checkin.timestamp, alreadyCheckedIn: false, ...(collected !== undefined ? { collected } : {}) };
}
