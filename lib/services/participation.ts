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
export const checkInInputSchema = z.object({ eventId: documentIdSchema, token: z.string().trim().min(20).max(2048) }).strict();

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
    throw new HttpError(409, "FITNESS_ID_UNAVAILABLE", "Your active Fitness ID could not be found. Sign in again to finish account setup.");
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
  const event = await getEvent(eventId, false);
  validateCheckInEvent(event);
  const recorded = await getAppwriteDocument<Row<CheckIn>>(collections.checkins, checkInDocumentId(eventId, userId));
  if (!recorded || recorded.eventId !== eventId || recorded.userId !== userId) throw new HttpError(404, "CHECKIN_NOT_FOUND", "No trusted attendance exists to repair");
  await ensureVerifiedParticipation(userId, event, checkinDto(recorded));
}

/** Operator-scanned attendance. Possessing a participant QR never authorizes its holder to write attendance. */
export async function checkInParticipant(organizer: Pick<AuthUser, "id" | "labels">, eventId: string, token: string) {
  documentIdSchema.parse(organizer.id);
  const event = await getEvent(eventId, false);
  if (!isAdminUser(organizer) && event.organizerUserId !== organizer.id) {
    throw new HttpError(403, "ORGANIZER_REQUIRED", "Only this event’s assigned operator or an administrator can check in participants");
  }
  const window = validateCheckInEvent(event);
  const payload = decodeSignedToken(token);
  const identities = await listAppwriteDocuments<FitnessIdRecord>(collections.fitnessIds, [Query.equal("publicId", payload.fitnessId), Query.limit(1)]);
  const identity = identities[0];
  if (!identity || identity.status !== "active" || identity.publicId !== payload.fitnessId) {
    throw new HttpError(403, "FITNESS_ID_UNAVAILABLE", "This participant’s Fitness ID is not active");
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
  if (rsvp?.status !== "confirmed") throw new HttpError(403, "RSVP_REQUIRED", "This participant needs a confirmed RSVP for the selected event");
  const checkin = checkinDto(await createOnce<Row<CheckIn>>(collections.checkins, id, {
    eventId: event.$id, userId, timestamp: new Date().toISOString(), verificationMethod: "organizer_qr",
  }, userId));
  await ensureVerifiedParticipation(userId, event, checkin);
  return { eventId: event.$id, displayName, checkedInAt: checkin.timestamp, alreadyCheckedIn: false };
}
