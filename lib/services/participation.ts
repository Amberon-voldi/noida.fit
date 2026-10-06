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
import type { AuthUser } from "@/lib/auth";
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
type EventRecord = {
  title: string;
  status: string;
  capacity?: number;
  startsAt: string;
  endsAt: string;
  organizerUserId?: string;
  activityId: string;
};

export const documentIdSchema = z.string().trim().min(1).max(36).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
export const eventInputSchema = z.object({ eventId: documentIdSchema }).strict();
export const savedInputSchema = z.object({ itemType: z.enum(["event", "place", "community"]), itemId: documentIdSchema }).strict();
export const followInputSchema = z.object({ communityId: documentIdSchema }).strict();
export const checkInInputSchema = z.object({ token: z.string().trim().min(20).max(2048) }).strict();

function idFor(...parts: string[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 36);
}
export const rsvpDocumentId = (eventId: string, userId: string) => idFor("rsvp", eventId, userId);
export const checkInDocumentId = (eventId: string, userId: string) => idFor("checkin", eventId, userId);
export const participationDocumentId = (eventId: string, userId: string) => idFor("participation", eventId, userId);
export const savedItemDocumentId = (itemType: SavedItemType, itemId: string, userId: string) => idFor("saved", itemType, itemId, userId);
export const membershipDocumentId = (communityId: string, userId: string) => idFor("membership", communityId, userId);

function isCode(error: unknown, code: number): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

/** Explicit field selection keeps DB metadata and future private attributes out of API DTOs. */
const rsvpDto = (r: AppwriteDocument<Row<RSVP>>): RSVP => ({ id: r.$id, eventId: r.eventId, userId: r.userId, status: r.status, seatNumber: r.seatNumber, createdAt: r.createdAt });
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
    listAppwriteDocuments<Row<RSVP>>(collections.rsvps, [Query.equal("userId", userId), Query.select(["userId", "eventId", "status", "seatNumber", "createdAt"])]),
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
    return await createAppwriteDocument(collection, data, id, userDocumentPermissions(userId));
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

/**
 * The atomic create + unique(eventId,seatNumber) index serializes allocation,
 * NOT the preceding read. Every proposed seat is in [1,capacity]. A second
 * unique(eventId,userId) index and deterministic user ID prohibit duplicate
 * reservations. Never upsert an RSVP: that could overwrite a seat owner.
 */
export async function createRsvp(userId: string, eventId: string): Promise<RSVP> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId);
  const { start } = eventWindow(event);
  if (Date.now() >= start) throw new HttpError(409, "EVENT_STARTED", "RSVP is closed for this event");
  const existing = await getUserRsvp(eventId, userId);
  if (existing?.status === "confirmed") return existing;
  const capacity = event.capacity;
  if (!Number.isSafeInteger(capacity) || !capacity || capacity < 1 || capacity > 100_000) {
    throw new HttpError(409, "CAPACITY_UNAVAILABLE", "The organizer needs to confirm event capacity");
  }
  const current = await listAppwriteDocuments<Row<RSVP>>(collections.rsvps, [Query.equal("eventId", eventId)]);
  const occupied = new Set(current.map((row) => row.seatNumber));
  for (let seatNumber = 1; seatNumber <= capacity; seatNumber += 1) {
    if (occupied.has(seatNumber)) continue;
    if (Date.now() >= start) throw new HttpError(409, "EVENT_STARTED", "RSVP is closed for this event");
    try {
      return rsvpDto(await createAppwriteDocument<Row<RSVP>>(collections.rsvps, {
        eventId, userId, status: "confirmed", seatNumber, createdAt: new Date().toISOString(),
      }, rsvpDocumentId(eventId, userId), userDocumentPermissions(userId)));
    } catch (error) {
      if (!isCode(error, 409)) throw error;
      const afterRace = await getUserRsvp(eventId, userId);
      if (afterRace?.status === "confirmed") return afterRace;
      // Another attendee owns this seat. Unique index enforcement keeps it safe.
    }
  }
  throw new HttpError(409, "EVENT_FULL", "This event is currently full");
}

export async function cancelRsvp(userId: string, eventId: string): Promise<void> {
  documentIdSchema.parse(userId);
  const event = await getEvent(eventId, false);
  // Cancellation is allowed for cancelled events but never erases verified attendance.
  const checkedIn = await getAppwriteDocument<Row<CheckIn>>(collections.checkins, checkInDocumentId(eventId, userId));
  if (checkedIn) throw new HttpError(409, "ALREADY_CHECKED_IN", "You have already checked in to this event");
  if (event.status !== "cancelled" && Date.now() >= eventWindow(event).start) {
    throw new HttpError(409, "EVENT_STARTED", "This event has already started");
  }
  await deleteIfPresent(collections.rsvps, rsvpDocumentId(eventId, userId));
}

function secret(): string {
  const value = process.env.APPWRITE_CHECKIN_SECRET;
  if (!value || value.length < 32 || value === process.env.APPWRITE_KEY) {
    throw new HttpError(503, "CHECKIN_NOT_CONFIGURED", "Check-in is not configured");
  }
  return value;
}

const tokenSchema = z.object({ v: z.literal(1), purpose: z.literal("event-checkin"), eventId: documentIdSchema, iat: z.number().int().nonnegative(), exp: z.number().int().positive() }).strict();
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

export async function createEventCheckInToken(eventId: string, organizer: Pick<AuthUser, "id" | "labels">): Promise<{ token: string; expiresAt: string }> {
  const event = await getEvent(eventId);
  if (!isAdminUser(organizer) && event.organizerUserId !== organizer.id) {
    throw new HttpError(403, "ORGANIZER_REQUIRED", "Only this event’s organizer or an admin can create a check-in code");
  }
  const { opensAt, closesAt } = validateCheckInEvent(event);
  const now = Date.now();
  if (now < opensAt || now >= closesAt) {
    throw new HttpError(409, "CHECKIN_CLOSED", "QR codes are available from 30 minutes before the event until one hour after it ends");
  }
  const exp = Math.min(now + CHECKIN_TOKEN_TTL, closesAt);
  const payload = Buffer.from(JSON.stringify({ v: 1, purpose: "event-checkin", eventId, iat: now, exp })).toString("base64url");
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

export function verifyEventCheckInToken(token: string, expectedEventId?: string) {
  const parsed = decodeSignedToken(token);
  if (parsed.exp <= Date.now()) throw new HttpError(410, "CHECKIN_TOKEN_EXPIRED", "This check-in code has expired. Ask the organizer for a new one.");
  if (expectedEventId && parsed.eventId !== expectedEventId) throw new HttpError(400, "CHECKIN_TOKEN_MISMATCH", "This check-in code is for another event");
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
    throw new HttpError(503, "PARTICIPATION_REPAIR_REQUIRED", "Check-in recorded. Tap verify again to finish updating your activity.");
  }
}

export async function checkInAttendee(userId: string, token: string): Promise<{ checkin: CheckIn; repaired: boolean }> {
  documentIdSchema.parse(userId);
  const payload = decodeSignedToken(token);
  // A previously recorded check-in can still repair its derived passport row if
  // editorial status changed between the two writes. No new attendance is
  // allowed for an unpublished or cancelled event.
  const event = await getEvent(payload.eventId, false);
  const window = validateCheckInEvent(event);
  const id = checkInDocumentId(event.$id, userId);
  const existing = await getAppwriteDocument<Row<CheckIn>>(collections.checkins, id);
  if (existing) {
    // A signed but expired code may repair an already committed trusted check-in;
    // it cannot create attendance after expiry or change the original timestamp.
    const checkin = checkinDto(existing);
    await ensureVerifiedParticipation(userId, event, checkin);
    return { checkin, repaired: true };
  }
  verifyEventCheckInToken(token, event.$id);
  if (event.status !== "published") throw new HttpError(409, "EVENT_UNAVAILABLE", "This event is not available for new check-ins");
  const now = Date.now();
  if (now < window.opensAt || now >= window.closesAt) throw new HttpError(409, "CHECKIN_CLOSED", "Check-in is outside the event window");
  const rsvp = await getUserRsvp(event.$id, userId);
  if (rsvp?.status !== "confirmed") throw new HttpError(403, "RSVP_REQUIRED", "A confirmed RSVP is required to check in");
  const checkin = checkinDto(await createOnce<Row<CheckIn>>(collections.checkins, id, {
    eventId: event.$id, userId, timestamp: new Date().toISOString(), verificationMethod: "organizer_qr",
  }, userId));
  await ensureVerifiedParticipation(userId, event, checkin);
  return { checkin, repaired: false };
}
