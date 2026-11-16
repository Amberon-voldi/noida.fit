import "server-only";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { appwriteCollections as collections } from "@/lib/appwrite/config";
import { createAppwriteDocument, getAppwriteDocument, listAppwriteDocuments, updateAppwriteDocument, Query, type AppwriteDocument } from "@/lib/appwrite/database";
import { getEventAnyStatus } from "@/lib/data";
import { HttpError } from "@/lib/http";
import { ticketHoldEndsAt } from "@/lib/pricing";
import { getManagedEventRecord } from "@/lib/services/organizer-events";
import { claimGiftTicket, getTicketEvent } from "@/lib/services/participation";
import type { AuthUser } from "@/lib/auth";
import type { Event } from "@/types/event";
import type { GiftLink } from "@/types/organizer";

type Actor = Pick<AuthUser, "id" | "labels">;

/** People one link can admit, and active links per event: plenty for a guest list, bounded against abuse. */
export const MAX_GIFT_SPOTS = 20;
export const MAX_GIFT_LINKS = 50;

interface GiftRow { eventId: string; createdBy: string; label?: string; note?: string; spots: number; status: string; createdAt: string; }
interface TicketRow { eventId: string; userId: string; status: string; paymentStatus?: string; paymentRef?: string; createdAt?: string; }

/** Link IDs are the secret in the URL: 144 random bits, and the table is readable only by the server. */
export const giftIdSchema = z.string().regex(/^g[A-Za-z0-9_-]{24}$/);
export const giftInputSchema = z.object({
  label: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  spots: z.number().int().min(1).max(MAX_GIFT_SPOTS),
}).strict();

const NOT_CONFIGURED = () => new HttpError(503, "GIFTS_NOT_CONFIGURED", "Gift links aren’t switched on yet.");

/** The private gift link table (`npm run appwrite:gift-links`). Optional, like the admin audit table. */
export function isGiftLinksConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_APPWRITE_GIFT_LINKS_COLLECTION_ID?.trim());
}
function giftTable(): string {
  const id = process.env.NEXT_PUBLIC_APPWRITE_GIFT_LINKS_COLLECTION_ID?.trim();
  if (!id) throw NOT_CONFIGURED();
  return id;
}
/** Appwrite reports a table the setup hasn't created yet as collection_not_found. */
async function withGiftTable<T>(run: (table: string) => Promise<T>): Promise<T> {
  const table = giftTable();
  try {
    return await run(table);
  } catch (error) {
    if (typeof error === "object" && error !== null && "type" in error && error.type === "collection_not_found") throw NOT_CONFIGURED();
    throw error;
  }
}

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
  spots: row.spots, claimed, status: row.status === "revoked" ? "revoked" : "active", createdAt: row.createdAt,
});

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
  try {
    const rows: AppwriteDocument<GiftRow>[] = [];
    for (let index = 0; index < eventIds.length; index += 100) {
      rows.push(...await withGiftTable(table => listAppwriteDocuments<GiftRow>(table, [Query.equal("eventId", eventIds.slice(index, index + 100))])));
    }
    return new Map(rows.map(row => [row.$id, row.label || undefined]));
  } catch (error) {
    // The guest list still loads without names for gift links.
    if (error instanceof HttpError && error.code === "GIFTS_NOT_CONFIGURED") return new Map();
    throw error;
  }
}

export async function createGiftLink(user: Actor, eventId: string, input: unknown): Promise<GiftLink> {
  const { label, note, spots } = giftInputSchema.parse(input);
  const { record } = await getManagedEventRecord(user, eventId);
  if (record.status === "cancelled") throw new HttpError(409, "EVENT_CANCELLED", "This session is cancelled, so it can’t take guests");
  return withGiftTable(async table => {
    const active = (await listAppwriteDocuments<GiftRow>(table, [Query.equal("eventId", eventId)])).filter(row => row.status !== "revoked");
    if (active.length >= MAX_GIFT_LINKS) throw new HttpError(409, "GIFT_LIMIT", `A session can have up to ${MAX_GIFT_LINKS} active gift links. Switch off ones you no longer need.`);
    const row = await createAppwriteDocument<GiftRow>(table, {
      eventId, createdBy: user.id, ...(label ? { label } : {}), ...(note ? { note } : {}), spots, status: "active", createdAt: new Date().toISOString(),
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
  link: Pick<GiftLink, "id" | "label" | "note" | "spots" | "claimed">;
  event: Event;
  state: GiftState;
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
  return { link: { id: row.$id, ...(row.label ? { label: row.label } : {}), ...(row.note ? { note: row.note } : {}), spots: row.spots, claimed }, event, state };
}

/**
 * Claims a free spot through a gift link: a confirmed ticket with no payment, on free and paid events
 * alike. Repeating a claim is harmless. The spot count is checked before the seat is taken, not
 * atomically with it, so two people claiming a link's last spot in the same instant can both get in;
 * the event's capacity still holds.
 */
export async function claimGift(user: Pick<AuthUser, "id">, linkId: string): Promise<{ eventSlug: string; seatNumber: number }> {
  if (!giftIdSchema.safeParse(linkId).success) throw new HttpError(404, "GIFT_NOT_FOUND", "This gift link doesn’t exist. Check the link with whoever sent it.");
  const row = await withGiftTable(table => getAppwriteDocument<GiftRow>(table, linkId));
  if (!row) throw new HttpError(404, "GIFT_NOT_FOUND", "This gift link doesn’t exist. Check the link with whoever sent it.");
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
