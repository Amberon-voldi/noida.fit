import type { Community } from "./community";
import type { Event } from "./event";

export type CheckInWindowState = "not-open" | "open" | "closed" | "cancelled" | "unavailable" | "invalid";

export interface OrganizerAttendee {
  displayName: string;
  rsvpStatus: "confirmed";
  seatNumber?: number;
  /** Paid events only. `amount` is in paise. */
  ticket?: { amount: number; paid: boolean };
  /** A spot claimed through one of the organizer's gift links; `label` is who the link was for. */
  gift?: { linkId: string; label?: string };
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
  /** Paise collected for paid tickets (PayU-confirmed, or marked paid at the desk). */
  revenue: number;
  /** Seats held right now by people part-way through paying. Not attendees until they pay. */
  payingNow: number;
  /** Spots claimed through gift links. */
  giftsClaimed: number;
}

/** One of the organizer's gift links for an event: anyone with it can claim a free spot. */
export interface GiftLink {
  id: string;
  eventId: string;
  /** Who it's for, e.g. "Riya (@riya.runs)". Shown on the gift page and its preview. */
  label?: string;
  /** A message shown on the gift page. */
  note?: string;
  /** How many people the link can admit. */
  spots: number;
  claimed: number;
  status: "active" | "revoked";
  createdAt: string;
}

export interface OrganizerClubSummary {
  community: Community;
  eventCount: number;
  upcomingEventCount: number;
  confirmedRsvps: number;
  checkedIn: number;
}
