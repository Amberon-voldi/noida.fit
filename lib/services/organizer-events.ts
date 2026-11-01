import "server-only";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ID } from "node-appwrite";
import { eventSlugTaken, getEventRecord, saveScopedEvent } from "@/lib/admin/content";
import { indiaDateTime } from "@/lib/calendar";
import { getActivities, getCommunities, getOrganizerEvents, getPlaces } from "@/lib/data";
import { HttpError } from "@/lib/http";
import { isAdminUser } from "@/lib/services/participation";
import type { AuthUser } from "@/lib/auth";
import type { Community } from "@/types/community";
import type { Place } from "@/types/place";

type Actor = Pick<AuthUser, "id" | "labels">;

const text = (max: number, min = 0) => z.string().trim().min(min).max(max);
const clock = z.string().regex(/^(?:0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/, "Use a time like 06:30 AM");

/** The fields an organizer edits. Slug, club, images, featured and demo flags stay with the team. */
export const organizerEventInputSchema = z.object({
  title: text(200, 2),
  description: text(12000, 20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  startTime: clock,
  endTime: clock,
  venueSlug: text(120, 1),
  capacity: z.number().int().min(1).max(100000),
  price: text(30, 1),
  level: text(100).optional(),
  distance: text(100).optional(),
  pace: text(200).optional(),
  routeOverview: text(2000).optional(),
  whatToBring: z.array(text(200, 1)).max(30).optional(),
  status: z.enum(["draft", "published", "cancelled"]),
}).strict();
export const organizerEventCreateSchema = organizerEventInputSchema.extend({ communitySlug: text(120, 1) }).strict();
export type OrganizerEventInput = z.infer<typeof organizerEventInputSchema>;

const published = <T extends { status?: string }>(item: T) => (item.status ?? "published") === "published";

/** Clubs an organizer may schedule for: ones they already run an assigned event for. Admins: all. */
export async function organizerClubs(user: Actor): Promise<Community[]> {
  const [communities, events] = await Promise.all([getCommunities(), getOrganizerEvents(user.id, isAdminUser(user))]);
  if (isAdminUser(user)) return communities;
  const run = new Set(events.map(event => event.communitySlug));
  return communities.filter(community => run.has(community.slug));
}

export async function organizerVenues(): Promise<Place[]> {
  return (await getPlaces()).filter(published).sort((a, b) => a.name.localeCompare(b.name));
}

function schedule(date: string, startTime: string, endTime: string) {
  let start: Date, end: Date;
  try { start = indiaDateTime(date, startTime); end = indiaDateTime(date, endTime); } catch { throw new HttpError(400, "INVALID_EVENT", "Pick a valid date and times"); }
  if (end <= start) throw new HttpError(400, "INVALID_EVENT", "The end time must be after the start time");
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

function slugify(title: string, date: string): string {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "") || "session";
  return `${base}-${date}`;
}

function clean(input: OrganizerEventInput) {
  const optional = (value?: string) => value?.trim() ? value.trim() : undefined;
  return {
    title: input.title, description: input.description, date: input.date, startTime: input.startTime, endTime: input.endTime,
    capacity: input.capacity, price: input.price, status: input.status,
    level: optional(input.level), distance: optional(input.distance), pace: optional(input.pace), routeOverview: optional(input.routeOverview),
    whatToBring: input.whatToBring?.filter(Boolean),
  };
}

async function venue(slug: string): Promise<Place> {
  const place = (await organizerVenues()).find(item => item.slug === slug);
  if (!place) throw new HttpError(400, "INVALID_EVENT", "Pick a venue from the list");
  return place;
}

/** Zod issues become one readable message instead of a generic "invalid input". */
async function readable<T>(run: () => Promise<T>): Promise<T> {
  try { return await run(); } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      throw new HttpError(400, "INVALID_EVENT", `${issue?.path.join(".") || "Event"}: ${issue?.message ?? "invalid value"}`);
    }
    throw error;
  }
}

export function createOrganizerEvent(user: Actor, value: unknown): Promise<{ id: string; slug: string }> {
  return readable(() => create(user, value));
}

async function create(user: Actor, value: unknown): Promise<{ id: string; slug: string }> {
  const input = organizerEventCreateSchema.parse(value);
  const club = (await organizerClubs(user)).find(community => community.slug === input.communitySlug);
  if (!club) throw new HttpError(403, "ORGANIZER_REQUIRED", "You can only schedule sessions for clubs you organize");
  const [place, activities] = await Promise.all([venue(input.venueSlug), getActivities()]);
  const activityId = club.activityId ?? activities.find(activity => activity.slug === club.category)?.id;
  if (!activityId) throw new HttpError(409, "INVALID_EVENT", "This club has no activity set. Ask the NOIDA.FIT team to fix it.");
  let slug = slugify(input.title, input.date);
  if (await eventSlugTaken(slug)) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  const saved = await saveScopedEvent({
    id: ID.unique(), slug, demo: false, featured: false, attendeesCount: 0,
    category: club.category, activityId, communitySlug: club.slug, communityName: club.name,
    ...(club.crestUrl ? { communityCrestUrl: club.crestUrl } : {}),
    venueSlug: place.slug, venueName: place.name, sector: place.sector,
    ...clean(input), ...schedule(input.date, input.startTime, input.endTime),
    organizerUserId: user.id,
  });
  return { id: saved.id, slug: String(saved.record.slug) };
}

/** Loads an event the caller manages, for the edit form. */
export async function getManagedEventRecord(user: Actor, eventId: string) {
  const stored = await getEventRecord(eventId);
  if (!stored) throw new HttpError(404, "EVENT_NOT_FOUND", "Event was not found");
  if (!isAdminUser(user) && stored.record.organizerUserId !== user.id) throw new HttpError(403, "ORGANIZER_REQUIRED", "You do not manage this event");
  return stored;
}

export function updateOrganizerEvent(user: Actor, eventId: string, value: unknown, expectedUpdatedAt: unknown): Promise<{ id: string; slug: string }> {
  return readable(() => update(user, eventId, value, expectedUpdatedAt));
}

async function update(user: Actor, eventId: string, value: unknown, expectedUpdatedAt: unknown): Promise<{ id: string; slug: string }> {
  const input = organizerEventInputSchema.parse(value);
  if (typeof expectedUpdatedAt !== "string") throw new HttpError(409, "STALE_CONTENT", "Reload the event before saving");
  const stored = await getManagedEventRecord(user, eventId);
  const place = input.venueSlug === stored.record.venueSlug
    ? { slug: String(stored.record.venueSlug), name: String(stored.record.venueName), sector: String(stored.record.sector) }
    : await venue(input.venueSlug);
  // Start from the stored record so team-owned fields (slug, club, images, featured) survive untouched.
  const next: Record<string, unknown> = { ...stored.record, ...clean(input), venueSlug: place.slug, venueName: place.name, sector: place.sector, ...schedule(input.date, input.startTime, input.endTime) };
  for (const key of ["level", "distance", "pace", "routeOverview", "whatToBring"]) if (next[key] === undefined) delete next[key];
  // The version the editor loaded, not the one just read: a concurrent save must not be overwritten.
  const saved = await saveScopedEvent(next, { updatedAt: expectedUpdatedAt });
  return { id: saved.id, slug: String(saved.record.slug) };
}
