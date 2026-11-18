/** "pending": a paid event's seat held while its payment completes; it never counts as going. */
export type RSVPStatus = "confirmed" | "pending" | "cancelled" | "waitlist";
export type ParticipationStatus = "verified" | "connected" | "self_reported" | "pending";
/** "gift": a free spot the organizer gave away with a gift link; it carries no amount. */
export type PaymentStatus = "pending" | "paid" | "gift";

export interface RSVP {
  id: string;
  eventId: string;
  userId: string;
  status: RSVPStatus;
  seatNumber: number;
  createdAt: string;
  /** Paid events only: the ticket price in paise, fixed when the ticket was taken. */
  amount?: number;
  paymentStatus?: PaymentStatus;
  /** A spot reserved to pay later: the payment link goes to this WhatsApp number, for this name. */
  whatsapp?: { name: string; phone: string };
}

export interface CheckIn {
  id: string;
  eventId: string;
  userId: string;
  timestamp: string;
  verificationMethod: string;
}

export interface Membership {
  id: string;
  userId: string;
  communityId: string;
  status: string;
  createdAt: string;
}

export interface SavedItem {
  id: string;
  userId: string;
  itemId: string;
  itemType: "event" | "place" | "community";
  createdAt: string;
}

export interface Participation {
  id: string;
  userId: string;
  eventId?: string;
  activityId: string;
  title: string;
  occurredAt: string;
  source: string;
  status: ParticipationStatus;
}
