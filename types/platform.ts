export type RSVPStatus = "confirmed" | "cancelled" | "waitlist";
export type ParticipationStatus = "verified" | "connected" | "self_reported" | "pending";

export interface RSVP {
  id: string;
  eventId: string;
  userId: string;
  status: RSVPStatus;
  seatNumber: number;
  createdAt: string;
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
