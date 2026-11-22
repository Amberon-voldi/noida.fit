import { ActivityCategory } from "./community";

export interface Event {
  id: string;
  title: string;
  slug: string;
  category: ActivityCategory;
  activityId?: string;
  communitySlug: string;
  communityName: string;
  communityCrestUrl?: string;
  venueSlug: string;
  venueName: string;
  sector: string;
  date: string; // ISO "YYYY-MM-DD"
  startsAt?: string;
  endsAt?: string;
  startTime: string; // "05:45 AM"
  endTime: string;
  price: string; // "FREE" or "₹200"
  distance?: string;
  pace?: string;
  level?: string;
  description: string;
  routeOverview?: string;
  whatToBring?: string[];
  featured: boolean;
  attendeesCount: number;
  capacity?: number;
  coverImageUrl?: string;
  imageUrl?: string;
  /** Organizer views only (lib/data.ts getOrganizerEvents): the accounts assigned to run this event. */
  organizerUserIds?: string[];
  status?: "published" | "cancelled" | "draft";
  /** Sign-ups stay open until the end, and the check-in desk can register walk-ins. */
  lateSignup?: boolean;
  demo?: boolean;
  tags?: string[];
}
