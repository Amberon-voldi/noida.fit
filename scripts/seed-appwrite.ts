import { loadScriptEnv } from "./lib/env";
import { getScriptCollections, getScriptConfig, getScriptDatabases, type ScriptCollections } from "./lib/appwrite";
import { Permission, Role, Query, type Models } from "node-appwrite";
import { activities, communities, events, places } from "@/data/seed";

loadScriptEnv();

let appwriteCollections!: ScriptCollections;
let databases!: ReturnType<typeof getScriptDatabases>;
let databaseId!: string;

type SeedRecord = Record<string, unknown> & { id: string; status?: string; demo?: boolean };

function payload(record: SeedRecord): string {
  return JSON.stringify(record);
}

function contentPermissions(): string[] {
  return [Permission.read(Role.any())];
}

async function upsertContent(collectionId: string, record: SeedRecord, fields: Record<string, unknown>): Promise<void> {
  const existing = await databases.getDocument({ databaseId, collectionId, documentId: record.id }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === 404) return null;
    throw error;
  });
  // Never overwrite editorial/production records, even if they reuse a seed ID.
  if (existing && existing.demo !== true) throw new Error("Refusing to overwrite non-demo content");
  await databases.upsertDocument({
    databaseId,
    collectionId,
    documentId: record.id,
    data: { ...fields, status: record.status ?? "published", demo: record.demo ?? true, payload: payload(record) },
    permissions: contentPermissions(),
  });
}

async function seedActivities(): Promise<void> {
  for (const activity of activities) {
    await upsertContent(appwriteCollections.activities, activity as unknown as SeedRecord, {
      slug: activity.slug,
      name: activity.name,
      emoji: activity.emoji,
    });
  }
}

async function seedCommunities(): Promise<void> {
  for (const community of communities) {
    await upsertContent(appwriteCollections.communities, community as unknown as SeedRecord, {
      slug: community.slug,
      activityId: community.activityId,
    });
  }
}

async function seedPlaces(): Promise<void> {
  for (const place of places) {
    await upsertContent(appwriteCollections.places, place as unknown as SeedRecord, {
      slug: place.slug,
      sector: place.sector,
      featured: place.featured ?? false,
    });
  }
}

async function seedEvents(): Promise<void> {
  for (const event of events) {
    await upsertContent(appwriteCollections.events, event as unknown as SeedRecord, {
      slug: event.slug,
      title: event.title,
      activityId: event.activityId,
      communitySlug: event.communitySlug,
      venueSlug: event.venueSlug,
      sector: event.sector,
      date: event.date,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      featured: event.featured,
      capacity: event.capacity,
      ...(event.organizerUserId ? { organizerUserId: event.organizerUserId } : {}),
    });
  }
}

async function verifyCounts(): Promise<void> {
  const checks = [
    ["activities", appwriteCollections.activities, activities.length],
    ["communities", appwriteCollections.communities, communities.length],
    ["places", appwriteCollections.places, places.length],
    ["events", appwriteCollections.events, events.length],
  ] as const;
  for (const [name, collectionId, minimum] of checks) {
    const documents: Models.Document[] = [];
    let offset = 0;
    while (true) {
      const page = await databases.listDocuments({ databaseId, collectionId, queries: [Query.equal("status", "published"), Query.limit(100), Query.offset(offset)] });
      documents.push(...page.documents);
      if (page.documents.length < 100) break;
      offset += page.documents.length;
    }
    if (documents.length < minimum) throw new Error(`seed count verification failed:${name}`);
    const demoDocuments = documents.filter((document) => (document as { demo?: unknown }).demo === true);
    if (demoDocuments.length < minimum) throw new Error(`demo marker verification failed:${name}`);
    if (documents.some((document) => !document.$permissions?.includes(Permission.read(Role.any())))) {
      throw new Error(`public ACL verification failed:${name}`);
    }
    console.log(`verified ${name} published=${documents.length} demo=${demoDocuments.length} publicRead=true`);
  }
}

async function main(): Promise<void> {
  appwriteCollections = getScriptCollections();
  databaseId = getScriptConfig().databaseId;
  databases = getScriptDatabases();
  await seedActivities();
  await seedCommunities();
  await seedPlaces();
  await seedEvents();
  await verifyCounts();
  console.log("Appwrite demo content seeded idempotently; no auth users or attendance records created.");
}

main().catch((error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "unknown";
  console.error(`Appwrite seed failed code=${code}`);
  process.exitCode = 1;
});
