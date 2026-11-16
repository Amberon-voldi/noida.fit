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
  /** Claimed through a gift link without an account: their guest pass ID (to check them in by hand) and the mobile number they gave. */
  guest?: { pass: string; phone: string };
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
  /** People can claim with a name and mobile number instead of an account, and get a guest pass. */
  allowGuests: boolean;
  /** The named guest's mobile number, added by the organizer so they claim with one tap. Organizer only. */
  phone?: string;
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
