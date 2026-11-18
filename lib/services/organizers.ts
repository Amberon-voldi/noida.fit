import "server-only";

import { appwriteCollections as collections } from "@/lib/appwrite/config";
import { listAppwriteDocuments, Query } from "@/lib/appwrite/database";

/**
 * Who runs what. The team assigns organizers in the admin panel: several per club (they run every session
 * of that club, and can schedule new ones) and several per event (they run that session). Assignments live
 * in a record's `organizerUserIds`; events made before there could be several carry one `organizerUserId`
 * (also the database column, kept as the first organizer). Account IDs are private: they never reach
 * public pages.
 */

type StoredRecord = { organizerUserId?: unknown; organizerUserIds?: unknown; payload?: unknown };

function storedPayload(record: StoredRecord): Record<string, unknown> {
  if (typeof record.payload !== "string") return {};
  try {
    const value: unknown = JSON.parse(record.payload);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/**
 * A record's organizer account IDs, in order and without repeats: a decoded record, or a stored row (its
 * columns and payload). An older event's single organizer counts only from the record itself, i.e. a row's
 * organizerUserId column, which has always decided it: a copy left in the payload never grants access.
 */
export function organizerIdsOf(value: object): string[] {
  const record = value as StoredRecord;
  const lists = [record.organizerUserIds, storedPayload(record).organizerUserIds].flatMap(list => Array.isArray(list) ? list : []);
  const ids = [...lists, record.organizerUserId];
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

/** Every club's organizers, by club slug. Drafts included: a club's organizers are set before it goes live. */
export async function allClubOrganizers(): Promise<Map<string, string[]>> {
  const rows = await listAppwriteDocuments<{ slug?: string; payload?: string }>(collections.communities);
  return new Map(rows.filter(row => typeof row.slug === "string").map(row => [row.slug as string, organizerIdsOf(row)]));
}

/** The organizers of the club with this slug; none when there is no such club. */
export async function clubOrganizerIds(communitySlug: string | undefined): Promise<string[]> {
  if (!communitySlug) return [];
  const [row] = await listAppwriteDocuments<{ payload?: string }>(collections.communities, [Query.equal("slug", communitySlug), Query.limit(1)]);
  return row ? organizerIdsOf(row) : [];
}

/** Whether an account runs an event: as one of its organizers, or as an organizer of its club. Admins are checked by callers. */
export function runsEvent(userId: string, eventOrganizers: string[], clubOrganizers: string[] = []): boolean {
  return eventOrganizers.includes(userId) || clubOrganizers.includes(userId);
}
