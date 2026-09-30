/** Browser-safe Fitness ID. No auth user id, email, credentials, or private history. */
export interface FitnessProfile {
  /** Random public Fitness ID, never the Appwrite account id. */
  id: string;
  name: string;
  slug: string;
  handle: string;
  cardNumber: string;
  joinedAt: string;
  bio?: string;
  avatarUrl?: string;
  city: string;
  visibility: "public" | "private";
  showActivity: boolean;
  showCommunities: boolean;
  communityMemberships: string[];
  stats: {
    verifiedActivities?: number | null;
    eventsAttended: number | null;
    communitiesJoined: number | null;
    streakWeeks: number | null;
  };
}

export interface ProfileSettings {
  username: string;
  displayName: string;
  bio: string;
  city: string;
  visibility: "public" | "private";
  showActivity: boolean;
  showCommunities: boolean;
  notifications: boolean;
}
