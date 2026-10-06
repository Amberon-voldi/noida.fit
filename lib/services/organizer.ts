import "server-only";

import { appwriteCollections as collections } from "@/lib/appwrite/config";
import {
  getAppwriteDocument,
  listAppwriteDocuments,
  Query,
  type AppwriteDocument,
} from "@/lib/appwrite/database";
import { HttpError } from "@/lib/http";
import { eventWindow, isAdminUser } from "@/lib/services/participation";
import type { AuthUser } from "@/lib/auth";
import type { Event } from "@/types/event";
import type { OrganizerAttendee, OrganizerEventSummary, CheckInWindowState } from "@/types/organizer";

interface EventRow {
  title: string;
  status: string;
  capacity?: number;
  startsAt: string;
  endsAt: string;
  organizerUserId?: string;
}

interface RsvpRow {
  eventId: string;
  userId: string;
  status: string;
}

interface CheckInRow {
  eventId: string;
  userId: string;
  timestamp: string;
}

interface ProfileRow {
  displayName?: string;
}

async function managedEvent(user: Pick<AuthUser, "id" | "labels">, eventId: string): Promise<AppwriteDocument<EventRow>> {
  const event = await getAppwriteDocument<EventRow>(collections.events, eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event was not found");
  if (!isAdminUser(user) && event.organizerUserId !== user.id) {
    throw new HttpError(403, "ORGANIZER_REQUIRED", "You do not manage this event");
  }
  return event;
}

function checkInState(event: Pick<EventRow, "status" | "startsAt" | "endsAt">): CheckInWindowState {
  if (event.status !== "published") return event.status === "cancelled" ? "cancelled" : "unavailable";
  try {
    const { opensAt, closesAt } = eventWindow(event);
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

/**
 * Organizer-scoped attendance data. User IDs, email addresses and profile
 * visibility settings never leave this server-side DTO.
 */
export async function getOrganizerEventSummary(
  user: Pick<AuthUser, "id" | "labels">,
  event: Event,
): Promise<OrganizerEventSummary> {
  const storedEvent = await managedEvent(user, event.id);
  const [rsvps, checkins] = await Promise.all([
    listAppwriteDocuments<RsvpRow>(collections.rsvps, [
      Query.equal("eventId", event.id),
      Query.select(["eventId", "userId", "status"]),
    ]),
    listAppwriteDocuments<CheckInRow>(collections.checkins, [
      Query.equal("eventId", event.id),
      Query.select(["eventId", "userId", "timestamp"]),
    ]),
  ]);

  const confirmedRsvps = rsvps.filter(rsvp => rsvp.status === "confirmed");
  const checkinsByUser = new Map(checkins.map(checkin => [checkin.userId, checkin]));
  const attendees: OrganizerAttendee[] = await Promise.all(confirmedRsvps.map(async rsvp => {
    const profile = await getAppwriteDocument<ProfileRow>(collections.profiles, rsvp.userId);
    const checkin = checkinsByUser.get(rsvp.userId);
    return {
      displayName: safeDisplayName(profile?.displayName),
      rsvpStatus: "confirmed",
      checkInStatus: checkin ? "checked_in" : "not_checked_in",
      ...(checkin ? { checkedInAt: checkin.timestamp } : {}),
    };
  }));

  const checkedIn = confirmedRsvps.filter(rsvp => checkinsByUser.has(rsvp.userId)).length;
  return {
    event,
    confirmedRsvps: confirmedRsvps.length,
    checkedIn,
    capacityRemaining: typeof storedEvent.capacity === "number" ? Math.max(0, storedEvent.capacity - confirmedRsvps.length) : null,
    checkInWindow: checkInState(storedEvent),
    attendees: attendees.sort((a, b) => Number(b.checkInStatus === "checked_in") - Number(a.checkInStatus === "checked_in") || a.displayName.localeCompare(b.displayName)),
  };
}

export async function getOrganizerEventSummaries(
  user: Pick<AuthUser, "id" | "labels">,
  events: Event[],
): Promise<OrganizerEventSummary[]> {
  return Promise.all(events.map(event => getOrganizerEventSummary(user, event)));
}

export function eventIsUpcomingForOrganizer(event: Event): boolean {
  const end = Date.parse(event.endsAt ?? "");
  return Number.isFinite(end) && end > Date.now() && event.status !== "cancelled";
}
