export interface Badge {
  id: string;
  name: string;
  description: string;
  earnedAt: string;
  icon: string;
}

export interface FitnessProfile {
  id: string;
  name: string;
  email: string;
  password: string; // hashed in production; plain for V1 seed demo
  slug: string;
  handle?: string; // e.g. @kabir-singh
  cardNumber?: string; // e.g. NF-2025-0841
  tier?: string; // e.g. "VERIFIED MEMBER" | "FOUNDING MEMBER"
  turfSector?: string; // e.g. "Sector 21A & Expressway"
  joinedAt: string;
  bio?: string;
  avatarUrl?: string;
  communityMemberships: string[]; // community slugs
  badges: Badge[];
  stats: {
    eventsAttended: number;
    communitiesJoined: number;
    streakWeeks: number;
  };
}
