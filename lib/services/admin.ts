import "server-only";

import { Query, type AppwriteDocument, listAppwriteDocuments } from "@/lib/appwrite/database";
import { appwriteCollections, requireAppwriteServerConfig } from "@/lib/appwrite/config";
import { getAdminServices } from "@/lib/appwrite/server";
import { listAdminAudit } from "@/lib/admin/audit";
import { assertAdmin, type AdminActor } from "@/lib/admin/auth";
import type { AdminContentEntry, AdminContentKind, AdminCountBreakdown, AdminDashboardData, AdminEventEntry } from "@/types/admin";

interface ContentRow {
  slug?: string;
  status?: string;
  demo?: boolean;
  name?: string;
  title?: string;
  date?: string;
  startsAt?: string;
  endsAt?: string;
  organizerUserId?: string;
  payload?: string;
}
interface ProfileRow { visibility?: string; showActivity?: boolean; showCommunities?: boolean; }
interface RSVPRow { eventId?: string; status?: string; }
interface CheckInRow { eventId?: string; }
interface ParticipationRow { status?: string; }
interface MembershipRow { status?: string; }

function safeOrigin(value: string | undefined): string {
  try { return new URL(value ?? "").origin; } catch { return "(missing or invalid)"; }
}

function parsePayload(row: ContentRow): Record<string, unknown> {
  if (!row.payload) return {};
  try {
    const parsed: unknown = JSON.parse(row.payload);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

function text(row: ContentRow, key: "name" | "title", fallback: string): string {
  const value = row[key] ?? parsePayload(row)[key];
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : fallback;
}

function status(row: ContentRow): string {
  return typeof row.status === "string" ? row.status : "unknown";
}

function breakdown(rows: ContentRow[]): AdminCountBreakdown {
  return {
    total: rows.length,
    published: rows.filter(row => status(row) === "published").length,
    draft: rows.filter(row => ["draft", "unpublished", "archived"].includes(status(row))).length,
    cancelled: rows.filter(row => status(row) === "cancelled").length,
    demo: rows.filter(row => row.demo === true || parsePayload(row).demo === true).length,
  };
}

function entry(row: AppwriteDocument<ContentRow>, kind: AdminContentKind): AdminContentEntry {
  const fallback = kind === "events" ? "Untitled event" : kind === "activities" ? "Untitled activity" : kind === "communities" ? "Untitled community" : "Untitled place";
  return { id: row.$id, label: kind === "events" ? text(row, "title", fallback) : text(row, "name", fallback), slug: typeof row.slug === "string" ? row.slug : "", status: status(row), demo: row.demo === true || parsePayload(row).demo === true };
}

function eventEntry(row: AppwriteDocument<ContentRow>, confirmed: Map<string, number>, checkins: Map<string, number>): AdminEventEntry {
  const base = entry(row, "events");
  return { ...base, title: base.label, date: typeof row.date === "string" ? row.date : String(parsePayload(row).date ?? ""), organizerAssigned: typeof row.organizerUserId === "string" && row.organizerUserId.length > 0, confirmedRsvps: confirmed.get(row.$id) ?? 0, checkins: checkins.get(row.$id) ?? 0 };
}

function configSnapshot(): AdminDashboardData["configuration"] {
  const required = [
    ["NEXT_PUBLIC_APPWRITE_ENDPOINT", process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT],
    ["NEXT_PUBLIC_APPWRITE_PROJECT_ID", process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID],
    ["NEXT_PUBLIC_APPWRITE_DATABASE_ID", process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID],
    ["APPWRITE_KEY", process.env.APPWRITE_KEY],
    ...Object.entries(appwriteCollections).map(([key, value]) => [`collection:${key}`, value]),
  ] as const;
  return {
    ready: required.every(([, value]) => Boolean(value)),
    endpointOrigin: safeOrigin(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT),
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "(unset)",
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "(unset)",
    missing: required.filter(([, value]) => !value).map(([key]) => key),
    apiKeyPresent: Boolean(process.env.APPWRITE_KEY?.trim()),
    checkInSecretPresent: Boolean(process.env.APPWRITE_CHECKIN_SECRET?.trim()),
    siteUrlPresent: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
  };
}

function emptyDashboard(configuration: AdminDashboardData["configuration"], error: AdminDashboardData["backendError"]): AdminDashboardData {
  const emptyBreakdown = (): AdminCountBreakdown => ({ total: 0, published: 0, draft: 0, cancelled: 0, demo: 0 });
  return {
    generatedAt: new Date().toISOString(), configuration,
    users: { total: 0, profiles: 0, publicProfiles: 0, privateProfiles: 0, activitySharing: 0, communitySharing: 0 },
    content: { activities: emptyBreakdown(), communities: emptyBreakdown(), events: emptyBreakdown(), places: emptyBreakdown() },
    entries: { activities: [], communities: [], places: [], events: [] },
    participation: { confirmedRsvps: 0, cancelledRsvps: 0, waitlistedRsvps: 0, checkins: 0, verifiedParticipations: 0, pendingParticipations: 0, activeMemberships: 0, savedItems: 0 },
    operational: { upcomingEvents: 0, pastEvents: 0, cancelledEvents: 0, assignedEvents: 0, unassignedPublishedEvents: 0, verifiedCommunities: 0, demoListings: 0 },
    audit: { configured: false, readable: false, entries: [] },
    backendError: error,
  };
}

/** Admin-only aggregate view. It deliberately returns counts and safe labels, never auth users or raw payloads. */
export async function getAdminDashboardData(user: AdminActor): Promise<AdminDashboardData> {
  assertAdmin(user);
  const configuration = configSnapshot();
  if (!configuration.ready) return emptyDashboard(configuration, "not_configured");
  try {
    requireAppwriteServerConfig();
    const { users } = getAdminServices();
    let audit: AdminDashboardData["audit"] = { configured: false, readable: false, entries: [] };
    try { audit = await listAdminAudit(user); } catch { audit = { configured: true, readable: false, entries: [] }; }
    const [userPage, profiles, activities, communities, events, places, rsvps, checkins, participations, memberships, savedItems] = await Promise.all([
      users.list({ queries: [Query.limit(1)] }).catch(() => null),
      listAppwriteDocuments<ProfileRow>(appwriteCollections.profiles, [Query.select(["visibility", "showActivity", "showCommunities"])]),
      listAppwriteDocuments<ContentRow>(appwriteCollections.activities),
      listAppwriteDocuments<ContentRow>(appwriteCollections.communities),
      listAppwriteDocuments<ContentRow>(appwriteCollections.events),
      listAppwriteDocuments<ContentRow>(appwriteCollections.places),
      listAppwriteDocuments<RSVPRow>(appwriteCollections.rsvps, [Query.select(["eventId", "status"])]),
      listAppwriteDocuments<CheckInRow>(appwriteCollections.checkins, [Query.select(["eventId"])]),
      listAppwriteDocuments<ParticipationRow>(appwriteCollections.participations, [Query.select(["status"])]),
      listAppwriteDocuments<MembershipRow>(appwriteCollections.memberships, [Query.select(["status"])]),
      listAppwriteDocuments<Record<string, unknown>>(appwriteCollections.savedItems, [Query.select(["itemType"])]),
    ]);
    const confirmed = new Map<string, number>();
    const cancelled = rsvps.filter(row => row.status === "cancelled").length;
    const waitlisted = rsvps.filter(row => row.status === "waitlist").length;
    for (const row of rsvps) if (row.status === "confirmed" && row.eventId) confirmed.set(row.eventId, (confirmed.get(row.eventId) ?? 0) + 1);
    const checked = new Map<string, number>();
    for (const row of checkins) if (row.eventId) checked.set(row.eventId, (checked.get(row.eventId) ?? 0) + 1);
    const now = Date.now();
    const eventEntries = events.map(row => eventEntry(row, confirmed, checked));
    const endsAt = (row: ContentRow) => Date.parse(row.endsAt ?? String(parsePayload(row).endsAt ?? ""));
    const upcomingEvents = events.filter(row => status(row) === "published" && endsAt(row) > now).length;
    const pastEvents = events.filter(row => status(row) === "published" && endsAt(row) <= now).length;
    const verifiedCommunities = communities.filter(row => parsePayload(row).verified === true && row.demo !== true).length;
    const allBreakdowns = { activities: breakdown(activities), communities: breakdown(communities), events: breakdown(events), places: breakdown(places) };
    const demoListings = Object.values(allBreakdowns).reduce((total, item) => total + item.demo, 0);
    return {
      generatedAt: new Date().toISOString(), configuration,
      users: { total: userPage?.total ?? null, profiles: profiles.length, publicProfiles: profiles.filter(row => row.visibility === "public").length, privateProfiles: profiles.filter(row => row.visibility !== "public").length, activitySharing: profiles.filter(row => row.showActivity === true).length, communitySharing: profiles.filter(row => row.showCommunities === true).length },
      content: allBreakdowns,
      entries: { activities: activities.slice(-8).map(row => entry(row, "activities")), communities: communities.slice(-8).map(row => entry(row, "communities")), places: places.slice(-8).map(row => entry(row, "places")), events: eventEntries.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12) },
      participation: { confirmedRsvps: confirmed.size ? [...confirmed.values()].reduce((total, count) => total + count, 0) : 0, cancelledRsvps: cancelled, waitlistedRsvps: waitlisted, checkins: checkins.length, verifiedParticipations: participations.filter(row => row.status === "verified").length, pendingParticipations: participations.filter(row => ["pending", "self_reported", "connected"].includes(row.status ?? "")).length, activeMemberships: memberships.filter(row => row.status === "active").length, savedItems: savedItems.length },
      operational: { upcomingEvents, pastEvents, cancelledEvents: events.filter(row => status(row) === "cancelled").length, assignedEvents: events.filter(row => typeof row.organizerUserId === "string" && row.organizerUserId.length > 0).length, unassignedPublishedEvents: events.filter(row => status(row) === "published" && !row.organizerUserId).length, verifiedCommunities, demoListings },
      audit,
    };
  } catch {
    return emptyDashboard(configuration, "unavailable");
  }
}
