import { ActivityCategory } from "./community";

export interface Event {
  id: string;
  title: string;
  slug: string;
  category: ActivityCategory;
  communitySlug: string;
  communityName: string;
  communityCrestUrl?: string;
  venueSlug: string;
  venueName: string;
  sector: string;
  date: string; // ISO "YYYY-MM-DD"
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
  coverImageUrl?: string;
}
