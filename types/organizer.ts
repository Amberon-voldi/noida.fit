import type { Community } from "./community";
import type { Event } from "./event";

export type CheckInWindowState = "not-open" | "open" | "closed" | "cancelled" | "unavailable" | "invalid";

export interface OrganizerAttendee {
  displayName: string;
  rsvpStatus: "confirmed";
  checkInStatus: "not_checked_in" | "checked_in";
  checkedInAt?: string;
}

export interface OrganizerEventSummary {
  event: Event;
  confirmedRsvps: number;
  checkedIn: number;
  capacityRemaining: number | null;
  checkInWindow: CheckInWindowState;
  attendees: OrganizerAttendee[];
}

export interface OrganizerClubSummary {
  community: Community;
  eventCount: number;
  upcomingEventCount: number;
  confirmedRsvps: number;
  checkedIn: number;
}
