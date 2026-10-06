export type AdminContentKind = "activities" | "communities" | "events" | "places";

export interface AdminCountBreakdown {
  total: number;
  published: number;
  draft: number;
  cancelled: number;
  demo: number;
}

export interface AdminContentEntry {
  id: string;
  label: string;
  slug: string;
  status: string;
  demo: boolean;
}

export interface AdminEventEntry extends AdminContentEntry {
  date: string;
  title: string;
  organizerAssigned: boolean;
  confirmedRsvps: number;
  checkins: number;
}

export interface AdminAuditEntry {
  id: string;
  actor: "Administrator";
  action: string;
  target: string;
  reason: string;
  status: "started" | "completed" | "failed";
  occurredAt: string;
  finishedAt?: string;
}

export interface AdminDashboardData {
  generatedAt: string;
  configuration: {
    ready: boolean;
    endpointOrigin: string;
    projectId: string;
    databaseId: string;
    missing: string[];
    apiKeyPresent: boolean;
    checkInSecretPresent: boolean;
    siteUrlPresent: boolean;
  };
  users: { total: number | null; profiles: number; publicProfiles: number; privateProfiles: number; activitySharing: number; communitySharing: number };
  content: Record<AdminContentKind, AdminCountBreakdown>;
  entries: { activities: AdminContentEntry[]; communities: AdminContentEntry[]; places: AdminContentEntry[]; events: AdminEventEntry[] };
  participation: { confirmedRsvps: number; cancelledRsvps: number; waitlistedRsvps: number; checkins: number; verifiedParticipations: number; pendingParticipations: number; activeMemberships: number; savedItems: number };
  operational: { upcomingEvents: number; pastEvents: number; cancelledEvents: number; assignedEvents: number; unassignedPublishedEvents: number; verifiedCommunities: number; demoListings: number };
  audit: { configured: boolean; readable: boolean; entries: AdminAuditEntry[] };
  backendError?: "unavailable" | "not_configured";
}
