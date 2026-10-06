import "server-only";

import { ID, Permission, Role } from "node-appwrite";
import { Query, getAppwriteDocument, listAppwriteDocuments } from "@/lib/appwrite/database";
import { appwriteCollections } from "@/lib/appwrite/config";
import { getAdminServices, getAppwriteDatabaseConfig } from "@/lib/appwrite/server";
import { HttpError } from "@/lib/http";
import { assertAdmin, type AdminActor } from "@/lib/admin/auth";
import { runAdminMutation } from "@/lib/admin/audit";
import {
  contentIdSchema, contentKinds, contentSchemas, type ContentKind, type ContentRecord,
  validateRecord, validateSchedule,
} from "@/lib/content-schema";

type Row = Record<string, unknown> & { $id: string; $updatedAt: string; payload?: string };
export type ListedContent = { id: string; updatedAt: string; record: Record<string, unknown> };
type EventRecord = Extract<ContentRecord, { title: string }>;
type CommunityRecord = Extract<ContentRecord, { tagline: string }>;

const columns: Record<ContentKind, string[]> = {
  activities: ["slug", "name", "emoji", "status", "demo"],
  communities: ["slug", "activityId", "status", "demo"],
  places: ["slug", "sector", "featured", "status", "demo"],
  events: ["slug", "title", "activityId", "communitySlug", "venueSlug", "sector", "date", "startsAt", "endsAt", "capacity", "featured", "organizerUserId", "status", "demo"],
};

function requireKind(value: string): ContentKind {
  if (!contentKinds.includes(value as ContentKind)) throw new HttpError(404, "CONTENT_NOT_FOUND", "Content type was not found");
  return value as ContentKind;
}
function decode(kind: ContentKind, row: Row): Record<string, unknown> {
  let payload: unknown;
  try { payload = JSON.parse(row.payload ?? "{}"); } catch { payload = {}; }
  const base = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  // Appwrite metadata and unknown database columns never enter the editable record.
  const record = { ...base, ...Object.fromEntries(columns[kind].filter(key => row[key] !== undefined && row[key] !== null).map(key => [key, row[key]])), id: row.$id };
  if (kind === "events" && !row.organizerUserId) delete (record as Record<string, unknown>).organizerUserId;
  return record;
}
function toListed(kind: ContentKind, row: Row): ListedContent { return { id: row.$id, updatedAt: row.$updatedAt, record: decode(kind, row) }; }
function recordName(kind: ContentKind, record: Record<string, unknown>): string { return String(record[kind === "events" ? "title" : "name"] ?? record.slug ?? "Untitled"); }
async function getRow(kind: ContentKind, id: string): Promise<Row | null> { return getAppwriteDocument<Row>(appwriteCollections[kind], id); }
async function findBySlug(kind: ContentKind, slug: string): Promise<Row | null> {
  return (await listAppwriteDocuments<Row>(appwriteCollections[kind], [Query.equal("slug", slug), Query.limit(1)]))[0] ?? null;
}
function published(row: Row | null): boolean { return row?.status === "published"; }
function requireReason(reason: string): string {
  const value = reason.trim();
  if (value.length < 5 || value.length > 300) throw new HttpError(400, "REASON_REQUIRED", "Give a mutation reason (5–300 characters)");
  return value;
}
function requireVersion(current: Row, expectedUpdatedAt: string | undefined): void {
  if (!expectedUpdatedAt || current.$updatedAt !== expectedUpdatedAt) throw new HttpError(409, "STALE_CONTENT", "This record changed; reload it before saving");
}

async function write(kind: ContentKind, record: ContentRecord, create: boolean): Promise<ListedContent> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  const value = record as Record<string, unknown>;
  const fields = Object.fromEntries(columns[kind].filter(key => value[key] !== undefined).map(key => [key, value[key]]));
  // Explicit null also clears an old assignment in the real operational column.
  if (kind === "events") fields.organizerUserId = value.organizerUserId ?? null;
  const args = {
    databaseId, collectionId: appwriteCollections[kind], documentId: record.id,
    data: { ...fields, payload: JSON.stringify(record) },
    permissions: record.status === "published" ? [Permission.read(Role.any())] : [],
  };
  // Never upsert: a create collision must not overwrite an existing editorial record.
  const row = await (create ? databases.createDocument(args) : databases.updateDocument(args));
  return toListed(kind, row as unknown as Row);
}

async function validateReferences(kind: ContentKind, record: ContentRecord, previous?: Row): Promise<void> {
  validateSchedule(record);
  if (kind === "events") {
    const event = record as EventRecord;
    // Capacity checks apply to drafts/cancelled edits too. Highest allocated seat matters
    // as well as the count because the seat uniqueness arbiter uses 1..capacity.
    const rsvps = await listAppwriteDocuments<Record<string, unknown>>(appwriteCollections.rsvps, [Query.equal("eventId", event.id)]);
    const confirmed = rsvps.filter(row => row.status === "confirmed");
    const highestSeat = Math.max(0, ...confirmed.map(row => typeof row.seatNumber === "number" ? row.seatNumber : 0));
    if (event.capacity < Math.max(confirmed.length, highestSeat)) throw new HttpError(409, "CAPACITY_TOO_SMALL", "Capacity cannot exclude confirmed RSVPs or allocated seats");
    if (event.status === "published") {
      const [activity, community, place] = await Promise.all([
        getRow("activities", event.activityId), findBySlug("communities", event.communitySlug), findBySlug("places", event.venueSlug),
      ]);
      if (![activity, community, place].every(published)) throw new HttpError(400, "INVALID_REFERENCE", "Published events need published activity, community and place references");
    }
    const oldOrganizer = previous ? decode(kind, previous).organizerUserId : undefined;
    if (event.organizerUserId && event.organizerUserId !== oldOrganizer) {
      // Fail closed if the user is absent or the runtime cannot verify the assignment.
      const { users } = getAdminServices();
      const organizer = await users.get({ userId: event.organizerUserId });
      if (!organizer.status) throw new HttpError(400, "INVALID_ORGANIZER", "Assign an active Appwrite user as organizer");
    }
  }
  if (kind === "communities" && record.status === "published") {
    const community = record as CommunityRecord;
    const [activity, place] = await Promise.all([
      getRow("activities", community.activityId), community.primaryVenueSlug ? findBySlug("places", community.primaryVenueSlug) : Promise.resolve(null),
    ]);
    if (!published(activity) || (community.primaryVenueSlug && !published(place))) throw new HttpError(400, "INVALID_REFERENCE", "Published communities need valid published activity and primary venue references");
  }
}

/** Check all editorial references, including drafts and cancelled events. No cascading writes. */
async function editorialReference(kind: ContentKind, id: string, record: Record<string, unknown>, slugOnly = false): Promise<boolean> {
  if (kind === "events") return false;
  const events = await listAppwriteDocuments<Row>(appwriteCollections.events);
  const slug = record.slug;
  if (events.some(row => {
    const event = decode("events", row);
    return kind === "activities" ? !slugOnly && event.activityId === id : kind === "communities" ? event.communitySlug === slug : event.venueSlug === slug;
  })) return true;
  if (kind === "activities" || kind === "places") {
    const communities = await listAppwriteDocuments<Row>(appwriteCollections.communities);
    if (communities.some(row => { const community = decode("communities", row); return kind === "activities" ? !slugOnly && community.activityId === id : community.primaryVenueSlug === slug; })) return true;
  }
  if (kind === "activities") {
    const places = await listAppwriteDocuments<Row>(appwriteCollections.places);
    if (places.some(row => { const place = decode("places", row); return Array.isArray(place.activities) && place.activities.includes(slug); })) return true;
  }
  return false;
}

async function hasPrivateReference(kind: ContentKind, id: string): Promise<boolean> {
  const checks: [string, string, string][] = [];
  if (kind === "events") checks.push([appwriteCollections.rsvps, "eventId", id], [appwriteCollections.checkins, "eventId", id], [appwriteCollections.participations, "eventId", id]);
  if (kind === "activities") checks.push([appwriteCollections.participations, "activityId", id]);
  if (kind === "communities") checks.push([appwriteCollections.memberships, "communityId", id]);
  // Saved items use singular names; constrain both ID and type to avoid unrelated matches.
  const itemType = kind === "events" ? "event" : kind === "communities" ? "community" : kind === "places" ? "place" : "activity";
  const lists = await Promise.all([
    ...checks.map(([collection, attribute, value]) => listAppwriteDocuments(collection, [Query.equal(attribute, value), Query.limit(1)])),
    listAppwriteDocuments(appwriteCollections.savedItems, [Query.equal("itemId", id), Query.equal("itemType", itemType), Query.limit(1)]),
  ]);
  return lists.some(rows => rows.length > 0);
}

export async function listAdminContent(user: AdminActor, kindValue: string, filters: { search?: string; status?: string } = {}): Promise<ListedContent[]> {
  assertAdmin(user);
  const kind = requireKind(kindValue);
  const rows = await listAppwriteDocuments<Row>(appwriteCollections[kind]);
  const search = filters.search?.trim().toLowerCase();
  return rows.map(row => toListed(kind, row)).filter(item =>
    (!filters.status || filters.status === "all" || item.record.status === filters.status) && (!search || JSON.stringify(item.record).toLowerCase().includes(search)),
  ).sort((a, b) => recordName(kind, a.record).localeCompare(recordName(kind, b.record)));
}

export async function createAdminContent(user: AdminActor, kindValue: string, input: unknown, reason: string): Promise<ListedContent> {
  assertAdmin(user);
  const kind = requireKind(kindValue);
  const parsed = validateRecord(kind, input, true);
  const record = contentSchemas[kind].parse({ ...parsed, id: ID.unique() }) as ContentRecord;
  return runAdminMutation(user, "content.create", `${kind}/${record.id}`, requireReason(reason), async () => {
    await validateReferences(kind, record);
    return write(kind, record, true);
  });
}

export async function updateAdminContent(user: AdminActor, kindValue: string, idValue: string, input: unknown, expectedUpdatedAt: string | undefined, reason: string): Promise<ListedContent> {
  assertAdmin(user);
  const kind = requireKind(kindValue);
  const id = contentIdSchema.parse(idValue);
  const record = validateRecord(kind, input);
  if (record.id !== id) throw new HttpError(400, "IMMUTABLE_ID", "Record IDs cannot change");
  return runAdminMutation(user, "content.update", `${kind}/${id}`, requireReason(reason), async () => {
    const current = await getRow(kind, id);
    if (!current) throw new HttpError(404, "CONTENT_NOT_FOUND", "Content record was not found");
    requireVersion(current, expectedUpdatedAt);
    const previous = decode(kind, current);
    if (record.slug !== previous.slug && await editorialReference(kind, id, previous, true)) throw new HttpError(409, "SLUG_REFERENCED", "This slug has linked content. Keep it to preserve existing references");
    await validateReferences(kind, record, current);
    // Narrow the read/validate/write gap, but Appwrite document updates are not
    // compare-and-swap: a simultaneous write after this check can still race.
    const latest = await getRow(kind, id);
    if (!latest) throw new HttpError(404, "CONTENT_NOT_FOUND", "Content record was not found");
    requireVersion(latest, expectedUpdatedAt);
    return write(kind, record, false);
  });
}

export async function deleteAdminContent(user: AdminActor, kindValue: string, idValue: string, confirmation: string, reason: string, expectedUpdatedAt: string | undefined): Promise<void> {
  assertAdmin(user);
  const kind = requireKind(kindValue);
  const id = contentIdSchema.parse(idValue);
  if (confirmation !== id) throw new HttpError(400, "DELETE_CONFIRMATION_REQUIRED", "Type the exact record ID to confirm deletion");
  await runAdminMutation(user, "content.delete", `${kind}/${id}`, requireReason(reason), async () => {
    const current = await getRow(kind, id);
    if (!current) throw new HttpError(404, "CONTENT_NOT_FOUND", "Content record was not found");
    requireVersion(current, expectedUpdatedAt);
    if (await editorialReference(kind, id, decode(kind, current)) || await hasPrivateReference(kind, id)) throw new HttpError(409, "CONTENT_REFERENCED", "Content has linked records or private participation. Unpublish instead to preserve history");
    const latest = await getRow(kind, id);
    if (!latest) throw new HttpError(404, "CONTENT_NOT_FOUND", "Content record was not found");
    requireVersion(latest, expectedUpdatedAt);
    const { databases } = getAdminServices();
    const { databaseId } = getAppwriteDatabaseConfig();
    await databases.deleteDocument({ databaseId, collectionId: appwriteCollections[kind], documentId: id });
  });
}
