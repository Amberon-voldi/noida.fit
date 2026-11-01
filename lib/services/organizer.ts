import "server-only";

import { appwriteCollections as collections } from "@/lib/appwrite/config";
import {
  listAppwriteDocuments,
  Query,
  type AppwriteDocument,
} from "@/lib/appwrite/database";
import { HttpError } from "@/lib/http";
import { eventWindow, isAdminUser } from "@/lib/services/participation";
import type { AuthUser } from "@/lib/auth";
import type { Event } from "@/types/event";
import type { OrganizerAttendee, OrganizerEventSummary, CheckInWindowState } from "@/types/organizer";

interface RsvpRow {
  eventId: string;
  userId: string;
  status: string;
  seatNumber?: number;
}

interface CheckInRow {
  eventId: string;
  userId: string;
  timestamp: string;
}

interface ProfileRow {
  displayName?: string;
}

function checkInState(event: Pick<Event, "status" | "startsAt" | "endsAt">): CheckInWindowState {
  if (event.status !== "published") return event.status === "cancelled" ? "cancelled" : "unavailable";
  try {
    const { opensAt, closesAt } = eventWindow({ startsAt: event.startsAt ?? "", endsAt: event.endsAt ?? "" });
    const now = Date.now();
    if (now < opensAt) return "not-open";
    if (now >= closesAt) return "closed";
    return "open";
  } catch {
    return "invalid";
  }
}

function safeDisplayName(value: unknown): string {
  if (typeof value !== "string") return "NOIDA.FIT member";
  const name = value.trim().slice(0, 120);
  return name || "NOIDA.FIT member";
}

/** Appwrite caps `equal` at 100 values; each chunk is one (paginated) list call. */
async function listForIds<T extends object>(collection: string, field: string, ids: string[], select: string[]): Promise<AppwriteDocument<T>[]> {
  const rows: AppwriteDocument<T>[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    rows.push(...await listAppwriteDocuments<T>(collection, [Query.equal(field, ids.slice(index, index + 100)), Query.select(select)]));
  }
  return rows;
}

/**
 * Organizer-scoped attendance data. User IDs, email addresses and profile
 * visibility settings never leave this server-side DTO.
 *
 * A Worker invocation may make only a limited number of subrequests, so the
 * whole workspace loads with a fixed handful of batched queries, never one
 * (or three) per event or attendee.
 */
export async function getOrganizerEventSummaries(
  user: Pick<AuthUser, "id" | "labels">,
  events: Event[],
): Promise<OrganizerEventSummary[]> {
  const admin = isAdminUser(user);
  if (events.some(event => !admin && event.organizerUserId !== user.id)) {
    throw new HttpError(403, "ORGANIZER_REQUIRED", "You do not manage this event");
  }
  if (!events.length) return [];
  const eventIds = events.map(event => event.id);
  const [rsvps, checkins] = await Promise.all([
    listForIds<RsvpRow>(collections.rsvps, "eventId", eventIds, ["eventId", "userId", "status", "seatNumber"]),
    listForIds<CheckInRow>(collections.checkins, "eventId", eventIds, ["eventId", "userId", "timestamp"]),
  ]);
  const confirmed = rsvps.filter(rsvp => rsvp.status === "confirmed");
  const profiles = await listForIds<ProfileRow>(collections.profiles, "$id", [...new Set(confirmed.map(rsvp => rsvp.userId))], ["displayName"]);
  const names = new Map(profiles.map(profile => [profile.$id, profile.displayName]));
  const checkinByKey = new Map(checkins.map(checkin => [`${checkin.eventId}:${checkin.userId}`, checkin]));

  return events.map(event => {
    const attendees: OrganizerAttendee[] = confirmed.filter(rsvp => rsvp.eventId === event.id).map(rsvp => {
      const checkin = checkinByKey.get(`${event.id}:${rsvp.userId}`);
      return {
        displayName: safeDisplayName(names.get(rsvp.userId)),
        rsvpStatus: "confirmed",
        ...(Number.isSafeInteger(rsvp.seatNumber) ? { seatNumber: rsvp.seatNumber } : {}),
        checkInStatus: checkin ? "checked_in" : "not_checked_in",
        ...(checkin ? { checkedInAt: checkin.timestamp } : {}),
      };
    });
    const checkedIn = attendees.filter(attendee => attendee.checkInStatus === "checked_in").length;
    return {
      event,
      confirmedRsvps: attendees.length,
      checkedIn,
      capacityRemaining: typeof event.capacity === "number" ? Math.max(0, event.capacity - attendees.length) : null,
      checkInWindow: checkInState(event),
      attendees: attendees.sort((a, b) => Number(b.checkInStatus === "checked_in") - Number(a.checkInStatus === "checked_in") || a.displayName.localeCompare(b.displayName)),
    };
  });
}

export async function getOrganizerEventSummary(
  user: Pick<AuthUser, "id" | "labels">,
  event: Event,
): Promise<OrganizerEventSummary> {
  return (await getOrganizerEventSummaries(user, [event]))[0];
}

export function eventIsUpcomingForOrganizer(event: Event): boolean {
  const end = Date.parse(event.endsAt ?? "");
  return Number.isFinite(end) && end > Date.now() && event.status !== "cancelled";
}
