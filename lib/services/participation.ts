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
import { MAX_TICKET_RUPEES, parseEventPrice, ticketHoldEndsAt } from "@/lib/pricing";
import type { AuthUser } from "@/lib/auth";
import { getAdminServices } from "@/lib/appwrite/server";
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
/** paymentRef stays server-side: it never reaches an RSVP DTO. */
type TicketRow = Row<RSVP> & { paymentRef?: string };
type EventRecord = {
  slug: string;
  demo?: boolean;
  title: string;
  status: string;
  capacity?: number;
  startsAt: string;
  endsAt: string;
  organizerUserId?: string;
  activityId: string;
  payload?: string;
};

export const documentIdSchema = z.string().trim().min(1).max(36).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
export const eventInputSchema = z.object({ eventId: documentIdSchema }).strict();
/** `amount` is still accepted from pages loaded before online payment, and ignored: paid tickets are held and paid through /api/payments/payu. */
export const rsvpInputSchema = z.object({ eventId: documentIdSchema, amount: z.number().int().positive().max(MAX_TICKET_RUPEES * 100).optional() }).strict();
export const savedInputSchema = z.object({ itemType: z.enum(["event", "place", "community"]), itemId: documentIdSchema }).strict();
export const followInputSchema = z.object({ communityId: documentIdSchema }).strict();
export const checkInInputSchema = z.object({ eventId: documentIdSchema, token: z.string().trim().min(20).max(2048) }).strict();

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

/** Explicit field selection keeps DB metadata and future private attributes out of API DTOs. */
const rsvpDto = (r: AppwriteDocument<Row<RSVP>>): RSVP => ({
  id: r.$id, eventId: r.eventId, userId: r.userId, status: r.status, seatNumber: r.seatNumber, createdAt: r.createdAt,
  ...(r.amount ? { amount: r.amount, paymentStatus: r.paymentStatus === "paid" ? "paid" as const : "pending" as const } : r.paymentStatus === "gift" ? { paymentStatus: "gift" as const } : {}),
});
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

function eventPayload(event: EventRecord): { price?: unknown; demo?: unknown } {
  try {
    return JSON.parse(event.payload ?? "") ?? {};
  } catch {
    return {};
  }
}

const eventPricing = (event: EventRecord) => parseEventPrice(eventPayload(event).price);

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
    listAppwriteDocuments<Row<RSVP>>(collections.rsvps, [Query.equal("userId", userId)]),
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
  const row = await getAppwriteDocument<Row<RSVP>>(collections.rsvps, rsvpDocumentId(eventId, userId));
  return row ? rsvpDto(row) : null;
}

/** A free event's RSVP, confirmed at once. A paid event's ticket is never confirmed here: it starts
 * as a hold (holdTicket) and only a confirmed payment (confirmTicketPayment) confirms it. */
export async function createRsvp(userId: string, eventId: string): Promise<RSVP> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId);
  const { start } = eventWindow(event);
  if (Date.now() >= start) throw new HttpError(409, "EVENT_STARTED", "RSVP is closed for this event");
  const existing = await getUserRsvp(eventId, userId);
  if (existing?.status === "confirmed") return existing;
  const pricing = eventPricing(event);
  if (pricing.kind === "paid") throw new HttpError(409, "PAYMENT_REQUIRED", `Tickets for this event are ${pricing.label}, confirmed once paid online.`);
  return allocateSeat(event, eventId, userId, { status: "confirmed" }, start);
}

const holdEnded = (row: { createdAt?: string }, now = Date.now()) => !(ticketHoldEndsAt(String(row.createdAt)) > now);

/**
 * A paid event's ticket starts as a hold: its seat is reserved (status "pending") for
 * TICKET_HOLD_MINUTES while the member pays, and only confirmTicketPayment confirms it. Returns the
 * member's existing ticket or hold instead of taking a second seat; retrying renews a hold that ran
 * out while its seat is still unclaimed. A hold keeps the price it was taken at.
 */
export async function holdTicket(userId: string, eventId: string, expectedAmount: number): Promise<RSVP> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId);
  const { start } = eventWindow(event);
  if (Date.now() >= start) throw new HttpError(409, "EVENT_STARTED", "Ticket sales have closed for this event");
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
  const pricing = eventPricing(event);
  if (pricing.kind !== "paid" || expectedAmount !== pricing.amount) {
    throw new HttpError(409, "PRICE_CHANGED", pricing.kind === "paid" ? `This ticket is ${pricing.label}. Check the price and confirm again.` : "This event’s price has changed. Reload the page and try again.");
  }
  return allocateSeat(event, eventId, userId, { status: "pending", amount: pricing.amount, paymentStatus: "pending" }, start);
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
  const { start } = eventWindow(event);
  if (Date.now() >= start) throw new HttpError(409, "EVENT_STARTED", "This event has already started");
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
  return { rsvp: await allocateSeat(event, eventId, userId, fields, start), claimed: true };
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
  return rsvpDto({ ...ticket, status: "confirmed", paymentStatus: "paid" });
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

export function isAdminUser(user: Pick<AuthUser, "labels">): boolean {
  return user.labels?.includes("admin") === true;
}

export async function canManageEvent(user: Pick<AuthUser, "id" | "labels">, eventId: string): Promise<boolean> {
  const event = await getEvent(eventId);
  return isAdminUser(user) || event.organizerUserId === user.id;
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
  const now = Date.now();
  const exp = now + CHECKIN_TOKEN_TTL;
  // No account ID, contact details, profile settings or private history in the QR payload.
  const payload = Buffer.from(JSON.stringify({ v: 1, purpose: "participant-checkin", fitnessId: identity.publicId, iat: now, exp })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt: new Date(exp).toISOString() };
}

function decodeSignedToken(token: string) {
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

async function ensureVerifiedParticipation(userId: string, event: AppwriteDocument<EventRecord>, checkin: CheckIn): Promise<void> {
  const id = participationDocumentId(event.$id, userId);
  const data = {
    userId, eventId: event.$id, activityId: event.activityId, title: event.title.slice(0, 200),
    occurredAt: checkin.timestamp, source: "organizer_checkin", status: "verified",
  } satisfies Row<Participation>;
  try {
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
  if (!isAdminUser(operator) && event.organizerUserId !== operator.id) {
    throw new HttpError(403, "ORGANIZER_REQUIRED", "Only this event’s assigned operator or an administrator can check in participants");
  }
  return event;
}

/** Operator-scanned attendance. Possessing a participant QR never authorizes its holder to write attendance. */
export async function checkInParticipant(organizer: Pick<AuthUser, "id" | "labels">, eventId: string, token: string) {
  const event = await getOperatedEvent(organizer, eventId);
  const window = validateCheckInEvent(event);
  const payload = decodeSignedToken(token);
  const identities = await listAppwriteDocuments<FitnessIdRecord>(collections.fitnessIds, [Query.equal("publicId", payload.fitnessId), Query.limit(1)]);
  const identity = identities[0];
  if (!identity || identity.status !== "active" || identity.publicId !== payload.fitnessId) {
    throw new HttpError(403, "FITNESS_ID_UNAVAILABLE", "This participant’s .fit ID is not active");
  }
  const userId = documentIdSchema.parse(identity.userId);
  const member = await getAdminServices().users.get({ userId });
  if (!member.status) throw new HttpError(403, "MEMBER_UNAVAILABLE", "This participant’s account is not active");
  const profile = await getAppwriteDocument<{ displayName?: string }>(collections.profiles, userId);
  const displayName = profile?.displayName?.trim().slice(0, 120) || "NOIDA.FIT member";
  const id = checkInDocumentId(event.$id, userId);
  const existing = await getAppwriteDocument<Row<CheckIn>>(collections.checkins, id);
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
  const rsvp = await getUserRsvp(event.$id, userId);
  // The participant showed this card to the desk, so naming them here reveals nothing new.
  if (rsvp?.status === "pending") throw new HttpError(403, "PAYMENT_PENDING", `${displayName} hasn’t finished paying for a ticket, so they aren’t confirmed yet`);
  if (rsvp?.status !== "confirmed") throw new HttpError(403, "RSVP_REQUIRED", `${displayName} is not on the RSVP list for this event`);
  const checkin = checkinDto(await createOnce<Row<CheckIn>>(collections.checkins, id, {
    eventId: event.$id, userId, timestamp: new Date().toISOString(), verificationMethod: "organizer_qr",
  }, userId));
  await ensureVerifiedParticipation(userId, event, checkin);
  // Only tickets issued before online payment can be confirmed unpaid; the desk is told what to collect.
  const amountDue = rsvp.amount && rsvp.paymentStatus !== "paid" ? rsvp.amount : undefined;
  return { eventId: event.$id, displayName, checkedInAt: checkin.timestamp, alreadyCheckedIn: false, ...(amountDue ? { amountDue } : {}) };
}

/**
 * Checks in a guest who claimed a gift spot without an account, from their guest pass (lib/services/gifts.ts).
 * The same rules as a member: this event's operator or an admin, inside the check-in window, with a confirmed
 * spot. A guest has no .fit ID, so no passport record follows. `holderId` is null for a pass that isn't for
 * this event.
 */
export async function checkInGuestHolder(operator: Pick<AuthUser, "id" | "labels">, eventId: string, holderId: string | null) {
  const event = await getOperatedEvent(operator, eventId);
  const window = validateCheckInEvent(event);
  if (!holderId || !isGuestHolder(holderId)) throw new HttpError(403, "RSVP_REQUIRED", "This guest pass isn’t for this session");
  const id = checkInDocumentId(event.$id, holderId);
  const existing = await getAppwriteDocument<Row<CheckIn>>(collections.checkins, id);
  if (existing) return { eventId: event.$id, checkedInAt: existing.timestamp, alreadyCheckedIn: true };
  if (event.status !== "published") throw new HttpError(409, "EVENT_UNAVAILABLE", "This event is not available for new check-ins");
  const now = Date.now();
  if (now < window.opensAt || now >= window.closesAt) throw new HttpError(409, "CHECKIN_CLOSED", "Check-in is outside the event window");
  if ((await getUserRsvp(event.$id, holderId))?.status !== "confirmed") throw new HttpError(403, "RSVP_REQUIRED", "This guest’s spot is no longer on the list for this session");
  const checkin = await createOnce<Row<CheckIn>>(collections.checkins, id, {
    eventId: event.$id, userId: holderId, timestamp: new Date().toISOString(), verificationMethod: "guest_pass",
  }, holderId);
  return { eventId: event.$id, checkedInAt: checkin.timestamp, alreadyCheckedIn: false };
}
