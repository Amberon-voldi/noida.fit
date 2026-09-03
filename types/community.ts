export type ActivityCategory =
  | "running"
  | "cycling"
  | "strength"
  | "sports"
  | "wellness"
  | "outdoor";

export interface Captain {
  name: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
}

export interface WeeklyScheduleItem {
  day: string;
  time: string;
  sessionType: string;
  venueName: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  category: ActivityCategory;
  tagline: string;
  description: string;
  baseLocation: string;
  primaryVenueSlug?: string;
  membersCount: number;
  verified: boolean;
  featured: boolean;
  meetingDays: string[];
  captains: Captain[];
  schedule?: WeeklyScheduleItem[];
  bannerUrl?: string;
  crestUrl?: string;
  socialLinks: {
    whatsapp?: string;
    instagram?: string;
    strava?: string;
    website?: string;
  };
}
