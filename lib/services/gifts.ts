import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { appwriteCollections as collections, configuredId } from "@/lib/appwrite/config";
import { createAppwriteDocument, deleteAppwriteDocument, getAppwriteDocument, listAppwriteDocuments, updateAppwriteDocument, Query, type AppwriteDocument } from "@/lib/appwrite/database";
import { getEventAnyStatus } from "@/lib/data";
import { HttpError } from "@/lib/http";
import { normalizeIndianMobile } from "@/lib/phone";
import { ticketHoldEndsAt } from "@/lib/pricing";
import { getManagedEventRecord } from "@/lib/services/organizer-events";
import { checkInDocumentId, checkInGuestHolder, claimGiftTicket, documentIdSchema, getTicketEvent, getUserRsvp, GUEST_HOLDER_PREFIX } from "@/lib/services/participation";
import type { AuthUser } from "@/lib/auth";
import type { Event } from "@/types/event";
import type { GiftLink } from "@/types/organizer";

type Actor = Pick<AuthUser, "id" | "labels">;

/** People one link can admit, and active links per event: plenty for a guest list, bounded against abuse. */
export const MAX_GIFT_SPOTS = 20;
export const MAX_GIFT_LINKS = 50;

/** `allowGuests`: the organizer lets people claim without an account. Absent on links made before the choice existed.
 * `phone`: the named guest's mobile number, which the organizer gave so they can claim with one tap. */
interface GiftRow { eventId: string; createdBy: string; label?: string; note?: string; spots: number; allowGuests?: boolean; phone?: string; status: string; createdAt: string; }
interface TicketRow { eventId: string; userId: string; status: string; seatNumber?: number; paymentStatus?: string; paymentRef?: string; createdAt?: string; }
/** A guest who claimed without an account. The row ID is their guest pass ID. */
interface GuestRow { eventId: string; linkId: string; name: string; phone: string; createdAt: string; }

/** Link IDs are the secret in the URL: 144 random bits, and the table is readable only by the server. */
export const giftIdSchema = z.string().regex(/^g[A-Za-z0-9_-]{24}$/);
/** Guest pass IDs are the secret in /pass/<id> and its QR, made the same way. */
export const guestPassIdSchema = z.string().regex(/^p[A-Za-z0-9_-]{24}$/);
export const giftInputSchema = z.object({
  label: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  spots: z.number().int().min(1).max(MAX_GIFT_SPOTS),
  allowGuests: z.boolean().optional(),
  /** The guest's mobile number, on links that need no account. Needs a label: it names their pass. */
  phone: z.string().trim().max(20).optional(),
}).strict();
/** What a guest gives instead of an account: a mobile number, unless the organizer gave theirs. Their pass is
 * named from the link (see claimGiftAsGuest); `name` comes only from pages loaded before that, and is ignored. */
export const guestClaimSchema = z.object({
  phone: z.string().trim().max(20).optional(),
  name: z.string().max(200).optional(),
}).strict();
/** The check-in desk scanning a guest pass, or checking a guest in from the guest list. */
export const guestCheckInInputSchema = z.object({ eventId: documentIdSchema, guestPass: z.string().trim().max(64) }).strict();

const NOT_CONFIGURED = () => new HttpError(503, "GIFTS_NOT_CONFIGURED", "Gift links aren’t switched on yet.");
const GIFT_NOT_FOUND = () => new HttpError(404, "GIFT_NOT_FOUND", "This gift link doesn’t exist. Check the link with whoever sent it.");

/** The private gift link and gift guest tables (`npm run appwrite:gift-links`). Optional, like the admin audit table. */
export function isGiftLinksConfigured(): boolean {
  return Boolean(configuredId(process.env.NEXT_PUBLIC_APPWRITE_GIFT_LINKS_COLLECTION_ID));
}
export function isGuestPassesConfigured(): boolean {
  return Boolean(configuredId(process.env.NEXT_PUBLIC_APPWRITE_GIFT_GUESTS_COLLECTION_ID));
}
/** Appwrite reports a table the setup hasn't created yet as collection_not_found. */
async function withTable<T>(variable: string, run: (table: string) => Promise<T>): Promise<T> {
  const table = configuredId(process.env[variable]);
  if (!table) throw NOT_CONFIGURED();
  try {
    return await run(table);
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error && error.type === "collection_not_found") throw NOT_CONFIGURED();
    throw error;
  }
}
const withGiftTable = <T>(run: (table: string) => Promise<T>) => withTable("NEXT_PUBLIC_APPWRITE_GIFT_LINKS_COLLECTION_ID", run);
const withGuestTable = <T>(run: (table: string) => Promise<T>) => withTable("NEXT_PUBLIC_APPWRITE_GIFT_GUESTS_COLLECTION_ID", run);

/** A table's rows for these events, in batches of Appwrite's 100-value `equal` limit. Empty when the table isn't set up. */
async function rowsForEvents<T extends object>(withRows: typeof withGiftTable, eventIds: string[]): Promise<AppwriteDocument<T>[]> {
  const rows: AppwriteDocument<T>[] = [];
  try {
    for (let index = 0; index < eventIds.length; index += 100) {
      rows.push(...await withRows(table => listAppwriteDocuments<T>(table, [Query.equal("eventId", eventIds.slice(index, index + 100))])));
    }
  } catch (error) {
    // The guest list still loads, without gift details.
    if (error instanceof HttpError && error.code === "GIFTS_NOT_CONFIGURED") return [];
    throw error;
  }
  return rows;
}

/**
 * The ID a guest's seat and check-in are held under: one spot per mobile number per session, enforced by
 * the RSVP table's unique (eventId, userId) index. Guest rows carry no permissions, so it never leaves the server.
 */
export const guestHolderId = (eventId: string, phone: string) => `${GUEST_HOLDER_PREFIX}${createHash("sha256").update(`${eventId}:${phone}`).digest("hex").slice(0, 30)}`;

/** A gift ticket's RSVP carries this as its paymentRef. */
export const giftRef = (linkId: string) => `gift:${linkId}`;
const linkIdOf = (row: Pick<TicketRow, "paymentStatus" | "paymentRef">) => row.paymentStatus === "gift" && row.paymentRef?.startsWith("gift:") ? row.paymentRef.slice(5) : undefined;

function claimsByLink(tickets: TicketRow[]): Map<string, number> {
  const claims = new Map<string, number>();
  for (const ticket of tickets) {
    const linkId = ticket.status === "confirmed" ? linkIdOf(ticket) : undefined;
    if (linkId) claims.set(linkId, (claims.get(linkId) ?? 0) + 1);
  }
  return claims;
}

const linkDto = (row: AppwriteDocument<GiftRow>, claimed: number): GiftLink => ({
  id: row.$id, eventId: row.eventId, ...(row.label ? { label: row.label } : {}), ...(row.note ? { note: row.note } : {}),
  spots: row.spots, claimed, allowGuests: row.allowGuests === true, ...(row.phone ? { phone: row.phone } : {}),
  status: row.status === "revoked" ? "revoked" : "active", createdAt: row.createdAt,
});

/** The guest the organizer named and gave a number for, while their spot is unclaimed: they claim with one tap. */
function presetGuest(row: GiftRow, tickets: TicketRow[]): { name: string; phone: string } | undefined {
  if (!row.allowGuests || !row.phone || !row.label) return undefined;
  const holder = guestHolderId(row.eventId, row.phone);
  return tickets.some(ticket => ticket.userId === holder && ticket.status === "confirmed") ? undefined : { name: row.label, phone: row.phone };
}

/**
 * The name on a guest's pass, since guests aren't asked for one. Whoever the link is for gets its label: on a
 * one-person link that's anyone, otherwise the number the organizer gave or, without one, the link's first
 * claim. Anyone else on the link is their guest. Cut to the guest table's 80 characters.
 */
function guestPassName(row: GiftRow, phone: string, claimedBefore: number): string {
  if (!row.label) return "Guest";
  const named = row.spots === 1 || (row.phone ? phone === row.phone : claimedBefore === 0);
  return (named ? row.label : `Guest of ${row.label}`).slice(0, 80);
}

const eventTickets = (eventId: string) => listAppwriteDocuments<TicketRow>(collections.rsvps, [Query.equal("eventId", eventId)]);

/** The event's gift links, newest first, with how many spots each has given out. Organizer or admin only. */
export async function listGiftLinks(user: Actor, eventId: string): Promise<GiftLink[]> {
  await getManagedEventRecord(user, eventId);
  if (!isGiftLinksConfigured()) return [];
  const [links, tickets] = await Promise.all([
    withGiftTable(table => listAppwriteDocuments<GiftRow>(table, [Query.equal("eventId", eventId)])),
    eventTickets(eventId),
  ]);
  const claims = claimsByLink(tickets);
  return links.map(row => linkDto(row, claims.get(row.$id) ?? 0)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Who each gift link was for, by link ID, for the guest list. Empty when gift links are off. */
export async function giftLinkLabels(eventIds: string[]): Promise<Map<string, string | undefined>> {
  if (!isGiftLinksConfigured() || !eventIds.length) return new Map();
  const rows = await rowsForEvents<GiftRow>(withGiftTable, eventIds);
  return new Map(rows.map(row => [row.$id, row.label || undefined]));
}

/** Guests who claimed without an account, by the ID their seat is held under: their pass and what they gave. */
export async function giftGuests(eventIds: string[]): Promise<Map<string, { pass: string; name: string; phone: string }>> {
  if (!isGuestPassesConfigured() || !eventIds.length) return new Map();
  const rows = await rowsForEvents<GuestRow>(withGuestTable, eventIds);
  return new Map(rows.map(row => [guestHolderId(row.eventId, row.phone), { pass: row.$id, name: row.name, phone: row.phone }]));
}

export async function createGiftLink(user: Actor, eventId: string, input: unknown): Promise<GiftLink> {
  const { label, note, spots, allowGuests = false, phone: typed } = giftInputSchema.parse(input);
  // A number is only for links that need no account: members claim on their own account.
  const phone = allowGuests && typed ? normalizeIndianMobile(typed) : undefined;
  if (phone === null) throw new HttpError(400, "PHONE_INVALID", "Enter the guest’s 10-digit Indian mobile number, or leave it empty.");
  if (phone && !label) throw new HttpError(400, "LABEL_REQUIRED", "Add who the link is for: their name goes on the guest pass.");
  if (allowGuests && !isGuestPassesConfigured()) throw new HttpError(503, "GUEST_PASSES_NOT_CONFIGURED", "Guest passes aren’t switched on yet. Make the link for NOIDA.FIT members instead.");
  const { record } = await getManagedEventRecord(user, eventId);
  if (record.status === "cancelled") throw new HttpError(409, "EVENT_CANCELLED", "This session is cancelled, so it can’t take guests");
  return withGiftTable(async table => {
    const active = (await listAppwriteDocuments<GiftRow>(table, [Query.equal("eventId", eventId)])).filter(row => row.status !== "revoked");
    if (active.length >= MAX_GIFT_LINKS) throw new HttpError(409, "GIFT_LIMIT", `A session can have up to ${MAX_GIFT_LINKS} active gift links. Switch off ones you no longer need.`);
    const row = await createAppwriteDocument<GiftRow>(table, {
      eventId, createdBy: user.id, ...(label ? { label } : {}), ...(note ? { note } : {}), spots, allowGuests, ...(phone ? { phone } : {}), status: "active", createdAt: new Date().toISOString(),
    }, `g${randomBytes(18).toString("base64url")}`);
    return linkDto(row, 0);
  });
}

/** Stops new claims. Spots already claimed stay valid: the guest may be planning around them. */
export async function revokeGiftLink(user: Actor, eventId: string, linkId: string): Promise<GiftLink> {
  if (!giftIdSchema.safeParse(linkId).success) throw new HttpError(404, "GIFT_NOT_FOUND", "That gift link was not found");
  await getManagedEventRecord(user, eventId);
  return withGiftTable(async table => {
    const row = await getAppwriteDocument<GiftRow>(table, linkId);
    if (!row || row.eventId !== eventId) throw new HttpError(404, "GIFT_NOT_FOUND", "That gift link was not found");
    if (row.status !== "revoked") await updateAppwriteDocument(table, linkId, { status: "revoked" });
    return linkDto({ ...row, status: "revoked" }, claimsByLink(await eventTickets(eventId)).get(linkId) ?? 0);
  });
}

/** What the gift page offers its viewer: */
export type GiftState =
  | "open"     // claimable
  | "yours"    // this viewer claimed it
  | "going"    // this viewer already has a spot of their own
  | "used"     // every spot on the link is taken
  | "full"     // the event has no free seat
  | "closed"   // the event started, ended or was cancelled
  | "revoked"; // the organizer switched the link off

export interface GiftView {
  /** `preset`: on links that need no account, the guest who can claim with one tap. Only the last four digits
   * of their number leave the server: gift links get forwarded. */
  link: Pick<GiftLink, "id" | "label" | "note" | "spots" | "claimed" | "allowGuests"> & { preset?: { name: string; phoneEnding: string } };
  event: Event;
  state: GiftState;
  /** Guest passes claimed through this link and still on the guest list. The link is the invitation, so it
   * opens them on any device: guests without an account have nothing else to sign in with. */
  passes: GuestPassSummary[];
}

/** A guest pass as the gift page lists it. Never the guest's number. */
export interface GuestPassSummary { id: string; name: string; seatNumber?: number; state: GuestPassState; checkedInAt?: string }

/** A pass's state from its session, whether its spot is still confirmed, and whether the desk has checked it in. */
function guestPassState(event: Event, confirmed: boolean, checkedIn: boolean): GuestPassState {
  // Check-in closes an hour after the end (lib/services/participation.ts eventWindow).
  const closes = Date.parse(event.endsAt ?? "") + 60 * 60_000;
  return checkedIn ? "checked-in" : !confirmed ? "void" : event.status === "cancelled" ? "cancelled" : closes <= Date.now() ? "ended" : "valid";
}

/**
 * The passes a gift link opens: spots claimed through it, and the spot of the guest whose number the organizer
 * gave, wherever they claimed it. A link made for someone who already has a spot opens their pass, so a new link
 * with their number also re-sends a lost one.
 */
async function linkPasses(row: AppwriteDocument<GiftRow>, event: Event, tickets: TicketRow[]): Promise<GuestPassSummary[]> {
  const ref = giftRef(row.$id);
  const presetHolder = row.phone ? guestHolderId(row.eventId, row.phone) : undefined;
  const seats = new Map(tickets.filter(ticket => ticket.status === "confirmed" && (ticket.paymentRef === ref || ticket.userId === presetHolder)).map(ticket => [ticket.userId, ticket.seatNumber]));
  if (!seats.size) return [];
  const [guests, checkins] = await Promise.all([
    rowsForEvents<GuestRow>(withGuestTable, [row.eventId]),
    listAppwriteDocuments<{ userId: string; timestamp: string }>(collections.checkins, [Query.equal("eventId", row.eventId)]),
  ]);
  const checkedIn = new Map(checkins.map(checkin => [checkin.userId, checkin.timestamp]));
  return guests.filter(guest => guest.linkId === row.$id || (row.phone !== undefined && guest.phone === row.phone)).flatMap(guest => {
    const holder = guestHolderId(guest.eventId, guest.phone);
    if (!seats.has(holder)) return [];
    const seatNumber = seats.get(holder), checkedInAt = checkedIn.get(holder);
    return [{ id: guest.$id, name: guest.name, ...(Number.isSafeInteger(seatNumber) ? { seatNumber } : {}), state: guestPassState(event, true, Boolean(checkedInAt)), ...(checkedInAt ? { checkedInAt } : {}) }];
  }).sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));
}

/** The public gift page's data. Null for an unknown link or an event that isn't public. */
export async function getGiftView(linkId: string, viewerId?: string): Promise<GiftView | null> {
  if (!giftIdSchema.safeParse(linkId).success || !isGiftLinksConfigured()) return null;
  let row: AppwriteDocument<GiftRow> | null;
  try {
    row = await withGiftTable(table => getAppwriteDocument<GiftRow>(table, linkId));
  } catch (error) {
    if (error instanceof HttpError && error.code === "GIFTS_NOT_CONFIGURED") return null;
    throw error;
  }
  if (!row) return null;
  const [event, tickets] = await Promise.all([getEventAnyStatus(row.eventId), eventTickets(row.eventId)]);
  if (!event || (event.status ?? "published") === "draft") return null;
  const ref = giftRef(linkId);
  const now = Date.now();
  const claimed = tickets.filter(ticket => ticket.status === "confirmed" && ticket.paymentRef === ref).length;
  const mine = viewerId ? tickets.find(ticket => ticket.userId === viewerId && ticket.status === "confirmed") : undefined;
  // Seats someone else holds: confirmed spots and holds still within their time. The viewer's own hold becomes the gift.
  const taken = tickets.filter(ticket => ticket.userId !== viewerId && (ticket.status === "confirmed" || (ticket.status === "pending" && ticketHoldEndsAt(String(ticket.createdAt)) > now))).length;
  const state: GiftState = mine?.paymentRef === ref ? "yours"
    : row.status === "revoked" ? "revoked"
    : event.status === "cancelled" || !(Date.parse(event.startsAt ?? "") > now) ? "closed"
    : mine ? "going"
    : claimed >= row.spots ? "used"
    : typeof event.capacity === "number" && taken >= event.capacity ? "full"
    : "open";
  // Without the guest table, a link that needs no account falls back to signing in.
  const guests = row.allowGuests === true && isGuestPassesConfigured();
  const preset = guests ? presetGuest(row, tickets) : undefined;
  const passes = guests && (claimed > 0 || row.phone) ? await linkPasses(row, event, tickets) : [];
  return {
    link: {
      id: row.$id, ...(row.label ? { label: row.label } : {}), ...(row.note ? { note: row.note } : {}), spots: row.spots, claimed, allowGuests: guests,
      ...(preset ? { preset: { name: preset.name, phoneEnding: preset.phone.slice(-4) } } : {}),
    },
    event, state, passes,
  };
}

/**
 * Claims a free spot through a gift link: a confirmed ticket with no payment, on free and paid events
 * alike. Repeating a claim is harmless. The spot count is checked before the seat is taken, not
 * atomically with it, so two people claiming a link's last spot in the same instant can both get in;
 * the event's capacity still holds.
 */
export async function claimGift(user: Pick<AuthUser, "id">, linkId: string): Promise<{ eventSlug: string; seatNumber: number }> {
  if (!giftIdSchema.safeParse(linkId).success) throw GIFT_NOT_FOUND();
  const row = await withGiftTable(table => getAppwriteDocument<GiftRow>(table, linkId));
  if (!row) throw GIFT_NOT_FOUND();
  const ref = giftRef(linkId);
  const tickets = await eventTickets(row.eventId);
  const mine = tickets.find(ticket => ticket.userId === user.id && ticket.status === "confirmed");
  if (mine?.paymentRef !== ref) {
    if (row.status === "revoked") throw new HttpError(410, "GIFT_REVOKED", "The organizer has switched off this gift link.");
    if (mine) throw new HttpError(409, "ALREADY_GOING", "You already have a spot at this event, so the gift is still free for someone else.");
    const claimed = tickets.filter(ticket => ticket.status === "confirmed" && ticket.paymentRef === ref).length;
    if (claimed >= row.spots) throw new HttpError(409, "GIFT_USED", row.spots === 1 ? "This gift has already been claimed." : "Every spot on this gift has been claimed.");
  }
  const { rsvp, claimed } = await claimGiftTicket(user.id, row.eventId, ref);
  if (!claimed) throw new HttpError(409, "ALREADY_GOING", "You already have a spot at this event, so the gift is still free for someone else.");
  return { eventSlug: (await getTicketEvent(row.eventId)).slug, seatNumber: rsvp.seatNumber };
}

/**
 * Claims a gift link's free spot without an account, on links the organizer opened to guests, and returns a
 * guest pass (/pass/<id>) whose QR the check-in desk scans. The guest gives only an Indian mobile number, and
 * with none typed the claim is the one-tap claim of the guest the organizer gave a number for. The pass is
 * named from the link (guestPassName). One spot per mobile number per session; a repeat claim is refused
 * rather than handing that number's pass to whoever typed it. Like claimGift, the link's spot count isn't
 * checked atomically.
 */
export async function claimGiftAsGuest(linkId: string, input: unknown): Promise<{ passId: string; seatNumber: number }> {
  const typed = guestClaimSchema.parse(input);
  if (!giftIdSchema.safeParse(linkId).success) throw GIFT_NOT_FOUND();
  const row = await withGiftTable(table => getAppwriteDocument<GiftRow>(table, linkId));
  if (!row) throw GIFT_NOT_FOUND();
  // Guest passes switched off on this site: the same answer as a link that needs an account.
  if (!row.allowGuests || !isGuestPassesConfigured()) throw new HttpError(403, "GIFT_ACCOUNT_REQUIRED", "This gift is for NOIDA.FIT members. Sign in or create a free account to claim it.");
  if (row.status === "revoked") throw new HttpError(410, "GIFT_REVOKED", "The organizer has switched off this gift link.");
  const tickets = await eventTickets(row.eventId);
  const phone = typed.phone ? normalizeIndianMobile(typed.phone) : presetGuest(row, tickets)?.phone;
  if (!phone) throw new HttpError(400, "PHONE_INVALID", "Enter a 10-digit Indian mobile number.");
  const ref = giftRef(linkId);
  const holder = guestHolderId(row.eventId, phone);
  const alreadyGoing = () => new HttpError(409, "GUEST_ALREADY_GOING", "This mobile number already has a spot at this session. If you claimed it with this link, your pass is on this page; otherwise ask the organizer.");
  if (tickets.some(ticket => ticket.userId === holder && ticket.status === "confirmed")) throw alreadyGoing();
  const claimed = tickets.filter(ticket => ticket.status === "confirmed" && ticket.paymentRef === ref).length;
  if (claimed >= row.spots) throw new HttpError(409, "GIFT_USED", row.spots === 1 ? "This gift has already been claimed." : "Every spot on this gift has been claimed.");
  const passId = `p${randomBytes(18).toString("base64url")}`;
  // The pass first: a seat with no pass would be a guest nobody can name or check in.
  await withGuestTable(table => createAppwriteDocument<GuestRow>(table, { eventId: row.eventId, linkId, name: guestPassName(row, phone, claimed), phone, createdAt: new Date().toISOString() }, passId));
  try {
    const { rsvp, claimed: fresh } = await claimGiftTicket(holder, row.eventId, ref);
    if (!fresh) throw alreadyGoing();
    return { passId, seatNumber: rsvp.seatNumber };
  } catch (error) {
    await withGuestTable(table => deleteAppwriteDocument(table, passId)).catch(() => {});
    throw error;
  }
}

/** What a guest pass shows: */
export type GuestPassState =
  | "valid"       // show the QR at the door
  | "checked-in"  // the desk has checked them in
  | "ended"       // the check-in window has closed
  | "cancelled"   // the organizer cancelled the session
  | "void";       // the spot is no longer on the guest list

export interface GuestPassView {
  pass: { id: string; name: string; seatNumber?: number; checkedInAt?: string };
  event: Event;
  state: GuestPassState;
}

/** The guest pass page's data. Null for an unknown pass or a session that isn't public. */
export async function getGuestPass(passId: string): Promise<GuestPassView | null> {
  if (!guestPassIdSchema.safeParse(passId).success || !isGuestPassesConfigured()) return null;
  let row: AppwriteDocument<GuestRow> | null;
  try {
    row = await withGuestTable(table => getAppwriteDocument<GuestRow>(table, passId));
  } catch (error) {
    if (error instanceof HttpError && error.code === "GIFTS_NOT_CONFIGURED") return null;
    throw error;
  }
  if (!row) return null;
  const holder = guestHolderId(row.eventId, row.phone);
  const [event, rsvp, checkin] = await Promise.all([
    getEventAnyStatus(row.eventId),
    getUserRsvp(row.eventId, holder),
    getAppwriteDocument<{ timestamp: string }>(collections.checkins, checkInDocumentId(row.eventId, holder)),
  ]);
  if (!event || (event.status ?? "published") === "draft") return null;
  const state = guestPassState(event, rsvp?.status === "confirmed", Boolean(checkin));
  return {
    pass: { id: row.$id, name: row.name, ...(rsvp?.status === "confirmed" ? { seatNumber: rsvp.seatNumber } : {}), ...(checkin ? { checkedInAt: checkin.timestamp } : {}) },
    event, state,
  };
}

/** The check-in desk scanning a guest pass QR, or checking a guest in from the guest list. Operator or admin only. */
export async function checkInGuest(operator: Actor, eventId: string, passId: string) {
  const row = guestPassIdSchema.safeParse(passId).success && isGuestPassesConfigured()
    ? await withGuestTable(table => getAppwriteDocument<GuestRow>(table, passId))
    : null;
  const result = await checkInGuestHolder(operator, eventId, row?.eventId === eventId ? guestHolderId(row.eventId, row.phone) : null);
  return { ...result, displayName: row?.name || "Guest", guest: true };
}
