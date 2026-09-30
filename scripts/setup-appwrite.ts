import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { loadScriptEnv } from "./lib/env";
import { getScriptCollections, getScriptConfig, getScriptDatabases, type ScriptCollections } from "./lib/appwrite";

loadScriptEnv();

function ensureCheckInSecret(): void {
  const file = ".env.local";
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (process.env.APPWRITE_CHECKIN_SECRET) return;
  const prefix = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
  appendFileSync(file, `${prefix}APPWRITE_CHECKIN_SECRET=${randomBytes(32).toString("base64url")}\n`, { encoding: "utf8" });
}

ensureCheckInSecret();

import {
  AppwriteException,
  Databases,
  IndexType,
  Query,
} from "node-appwrite";

let appwriteCollections!: ScriptCollections;

type AttributeSpec =
  | { type: "string"; key: string; size: number; required: boolean; default?: string }
  | { type: "integer"; key: string; required: boolean; min?: number; max?: number; default?: number }
  | { type: "datetime"; key: string; required: boolean }
  | { type: "boolean"; key: string; required: boolean; default?: boolean };

type IndexSpec = { key: string; type: "key" | "unique" | "fulltext"; attributes: string[] };
type CollectionSpec = { key: keyof ScriptCollections; name: string; attributes: AttributeSpec[]; indexes: IndexSpec[] };

const string = (key: string, size: number, required = true, defaultValue?: string): AttributeSpec => ({
  type: "string", key, size, required, ...(defaultValue === undefined ? {} : { default: defaultValue }),
});
const integer = (key: string, required = false, min?: number, max?: number, defaultValue?: number): AttributeSpec => ({
  type: "integer", key, required, ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }), ...(defaultValue === undefined ? {} : { default: defaultValue }),
});
const datetime = (key: string, required = true): AttributeSpec => ({ type: "datetime", key, required });
const boolean = (key: string, required = false, defaultValue?: boolean): AttributeSpec => ({
  type: "boolean", key, required, ...(defaultValue === undefined ? {} : { default: defaultValue }),
});
const keyIndex = (key: string, attributes: string[]): IndexSpec => ({ key, type: "key", attributes });
const uniqueIndex = (key: string, attributes: string[]): IndexSpec => ({ key, type: "unique", attributes });

const contentAttributes = (extra: AttributeSpec[]): AttributeSpec[] => [
  string("status", 20),
  string("payload", 65535),
  boolean("demo", false, true),
  ...extra,
];

function getCollectionSpecs(): CollectionSpec[] {
  return [
  {
    key: "profiles",
    name: "Profiles",
    attributes: [
      string("userId", 36), string("username", 40), string("displayName", 128),
      string("avatarUrl", 2048, false), string("bio", 1000, false), string("city", 100),
      string("fitnessId", 32), datetime("memberSince"), string("visibility", 16, false, "private"),
      boolean("showActivity", false, false), boolean("showCommunities", false, false), boolean("notifications", false, false),
    ],
    indexes: [uniqueIndex("profiles_user", ["userId"]), uniqueIndex("profiles_username", ["username"]), uniqueIndex("profiles_fitness", ["fitnessId"])],
  },
  {
    key: "fitnessIds",
    name: "Fitness IDs",
    attributes: [string("userId", 36), string("publicId", 32), string("status", 20), datetime("memberSince")],
    indexes: [uniqueIndex("fitness_user", ["userId"]), uniqueIndex("fitness_public", ["publicId"])],
  },
  {
    key: "activities",
    name: "Activities",
    attributes: contentAttributes([string("slug", 120), string("name", 128), string("emoji", 16), string("activityId", 40, false)]),
    indexes: [uniqueIndex("activities_slug", ["slug"]), keyIndex("activities_status", ["status"])],
  },
  {
    key: "communities",
    name: "Communities",
    attributes: contentAttributes([string("slug", 120), string("activityId", 40, false)]),
    indexes: [uniqueIndex("communities_slug", ["slug"]), keyIndex("communities_status", ["status"]), keyIndex("communities_activity", ["activityId"])],
  },
  {
    key: "events",
    name: "Events",
    attributes: contentAttributes([
      string("slug", 120), string("title", 200), string("activityId", 40, false), string("communitySlug", 120),
      string("venueSlug", 120), string("sector", 100), string("date", 10), datetime("startsAt"), datetime("endsAt"),
      boolean("featured", false, false), integer("capacity", false, 1), string("organizerUserId", 36, false),
    ]),
    indexes: [uniqueIndex("events_slug", ["slug"]), keyIndex("events_status_date", ["status", "date"]), keyIndex("events_activity", ["activityId"]), keyIndex("events_community", ["communitySlug"])],
  },
  {
    key: "places",
    name: "Places",
    attributes: contentAttributes([string("slug", 120), string("sector", 100), boolean("featured", false, false)]),
    indexes: [uniqueIndex("places_slug", ["slug"]), keyIndex("places_status", ["status"]), keyIndex("places_sector", ["sector"])],
  },
  {
    key: "rsvps",
    name: "Event RSVPs",
    attributes: [string("eventId", 36), string("userId", 36), string("status", 20), integer("seatNumber", true, 1), datetime("createdAt")],
    indexes: [uniqueIndex("rsvps_event_user", ["eventId", "userId"]), uniqueIndex("rsvps_event_seat", ["eventId", "seatNumber"]), keyIndex("rsvps_user", ["userId"]), keyIndex("rsvps_event", ["eventId"])],
  },
  {
    key: "checkins",
    name: "Event Check-ins",
    attributes: [string("eventId", 36), string("userId", 36), datetime("timestamp"), string("verificationMethod", 32)],
    indexes: [uniqueIndex("checkins_event_user", ["eventId", "userId"]), keyIndex("checkins_user", ["userId"]), keyIndex("checkins_event", ["eventId"])],
  },
  {
    key: "memberships",
    name: "Community Memberships",
    attributes: [string("userId", 36), string("communityId", 36), string("status", 20), datetime("createdAt")],
    indexes: [uniqueIndex("memberships_user_community", ["userId", "communityId"]), keyIndex("memberships_user", ["userId"]), keyIndex("memberships_community", ["communityId"])],
  },
  {
    key: "savedItems",
    name: "Saved Items",
    attributes: [string("userId", 36), string("itemId", 36), string("itemType", 20), datetime("createdAt")],
    indexes: [uniqueIndex("saved_user_item", ["userId", "itemType", "itemId"]), keyIndex("saved_user", ["userId"])],
  },
  {
    key: "participations",
    name: "Participations",
    attributes: [string("userId", 36), string("eventId", 36, false), string("activityId", 40), string("title", 200), datetime("occurredAt"), string("source", 32), string("status", 20)],
    indexes: [uniqueIndex("participations_user_event", ["userId", "eventId"]), keyIndex("participations_user", ["userId"]), keyIndex("participations_activity", ["activityId"])],
  },
  ];
}

function isNotFound(error: unknown): boolean {
  return error instanceof AppwriteException && error.code === 404;
}

function errorCode(error: unknown): string {
  return error instanceof AppwriteException ? String(error.code) : "unknown";
}

type AttributeState = { type: string; key: string; required: boolean; status: string; size?: number; min?: number };

function assertMatchingAttribute(actual: AttributeState, expected: AttributeSpec): void {
  if (!actual || actual.type !== expected.type || actual.required !== expected.required) {
    throw new Error(`attribute mismatch:${expected.key}`);
  }
  if (expected.type === "string" && actual.size !== expected.size) throw new Error(`attribute size mismatch:${expected.key}`);
  if (expected.type === "integer" && expected.min !== undefined && actual.min !== expected.min) throw new Error(`attribute minimum mismatch:${expected.key}`);
}

async function waitForAttribute(databases: InstanceType<typeof Databases>, databaseId: string, collectionId: string, key: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const attribute = await databases.getAttribute({ databaseId, collectionId, key }) as AttributeState;
    if (attribute.status === "available") return;
    if (["failed", "stuck"].includes(attribute.status)) throw new Error(`attribute unavailable:${key}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`attribute timeout:${key}`);
}

async function ensureAttribute(databases: InstanceType<typeof Databases>, databaseId: string, collectionId: string, spec: AttributeSpec): Promise<void> {
  const current = await databases.listAttributes({ databaseId, collectionId });
  const existing = current.attributes.find((attribute) => attribute.key === spec.key);
  if (existing) {
    assertMatchingAttribute(existing as AttributeState, spec);
    if (existing.status !== "available") await waitForAttribute(databases, databaseId, collectionId, spec.key);
    return;
  }

  if (spec.type === "string") {
    await databases.createStringAttribute({ databaseId, collectionId, key: spec.key, size: spec.size, required: spec.required, ...(spec.default === undefined ? {} : { xdefault: spec.default }) });
  } else if (spec.type === "integer") {
    await databases.createIntegerAttribute({ databaseId, collectionId, key: spec.key, required: spec.required, ...(spec.min === undefined ? {} : { min: spec.min }), ...(spec.max === undefined ? {} : { max: spec.max }), ...(spec.default === undefined ? {} : { xdefault: spec.default }) });
  } else if (spec.type === "datetime") {
    await databases.createDatetimeAttribute({ databaseId, collectionId, key: spec.key, required: spec.required });
  } else {
    await databases.createBooleanAttribute({ databaseId, collectionId, key: spec.key, required: spec.required, ...(spec.default === undefined ? {} : { xdefault: spec.default }) });
  }
  await waitForAttribute(databases, databaseId, collectionId, spec.key);
}

async function ensureIndex(databases: InstanceType<typeof Databases>, databaseId: string, collectionId: string, spec: IndexSpec): Promise<void> {
  const current = await databases.listIndexes({ databaseId, collectionId });
  const existing = current.indexes.find((index) => index.key === spec.key);
  if (existing) {
    const same = existing.type === spec.type && JSON.stringify(existing.attributes) === JSON.stringify(spec.attributes);
    if (!same) throw new Error(`index mismatch:${spec.key}`);
  } else {
    const type = spec.type === "unique" ? IndexType.Unique : spec.type === "fulltext" ? IndexType.Fulltext : IndexType.Key;
    await databases.createIndex({ databaseId, collectionId, key: spec.key, type, attributes: spec.attributes });
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const index = await databases.getIndex({ databaseId, collectionId, key: spec.key });
    if (index.status === "available") return;
    if (["failed", "stuck"].includes(index.status)) throw new Error(`index unavailable:${spec.key}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`index timeout:${spec.key}`);
}

async function ensureCollection(databases: InstanceType<typeof Databases>, databaseId: string, spec: CollectionSpec): Promise<void> {
  const collectionId = appwriteCollections[spec.key];
  let collection;
  try {
    collection = await databases.getCollection({ databaseId, collectionId });
  } catch (error) {
    if (!isNotFound(error)) throw error;
    const similar = await databases.listCollections({ databaseId, queries: [Query.equal("name", spec.name)] });
    if (similar.total > 0) throw new Error(`Existing collection named ${spec.name}: set its ID in the environment instead of creating a duplicate`);
    collection = await databases.createCollection({ databaseId, collectionId, name: spec.name, permissions: [], documentSecurity: true, enabled: true });
  }

  const collectionPermissions = collection.$permissions ?? [];
  if (!collection.documentSecurity || collectionPermissions.length > 0) {
    collection = await databases.updateCollection({ databaseId, collectionId, name: collection.name, permissions: [], documentSecurity: true, enabled: collection.enabled });
  }
  if (!collection.documentSecurity || (collection.$permissions ?? []).length > 0) throw new Error(`insecure collection:${spec.key}`);

  for (const attribute of spec.attributes) await ensureAttribute(databases, databaseId, collectionId, attribute);
  for (const index of spec.indexes) await ensureIndex(databases, databaseId, collectionId, index);

  const verified = await databases.getCollection({ databaseId, collectionId });
  if (!verified.documentSecurity || (verified.$permissions ?? []).length > 0) throw new Error(`ACL verification failed:${spec.key}`);
  console.log(`verified ${spec.key} attributes=${spec.attributes.length} indexes=${spec.indexes.length} documentSecurity=true`);
}

async function main(): Promise<void> {
  appwriteCollections = getScriptCollections();
  const collectionSpecs = getCollectionSpecs();
  const config = getScriptConfig();
  const databases = getScriptDatabases();
  try {
    await databases.get({ databaseId: config.databaseId });
  } catch (error) {
    if (!isNotFound(error)) throw error;
    const existing = await databases.list({ queries: [Query.equal("name", "NOIDA.FIT")] });
    if (existing.total > 0) throw new Error("Existing NOIDA.FIT database: set APPWRITE_DATABASE_ID to its ID before continuing");
    await databases.create({ databaseId: config.databaseId, name: "NOIDA.FIT", enabled: true });
  }
  for (const spec of collectionSpecs) await ensureCollection(databases, config.databaseId, spec);
  console.log(`Appwrite schema ready collections=${collectionSpecs.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message.replace(/https?:\/\/[^\s]+/gi, "[endpoint]").replace(/(standard|secret|key|token)[^\s]*/gi, "[redacted]") : "unknown";
  console.error(`Appwrite schema setup failed code=${errorCode(error)} message=${message}`);
  process.exitCode = 1;
});
