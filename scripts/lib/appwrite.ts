import { Client, Databases } from "node-appwrite";

export const collectionKeys = [
  "profiles", "fitnessIds", "events", "rsvps", "checkins", "activities", "places", "communities", "memberships", "savedItems", "participations",
] as const;

export type ScriptCollections = Record<(typeof collectionKeys)[number], string>;

export function getScriptCollections(): ScriptCollections {
  const collections = {
    profiles: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_PROFILES ?? "",
    fitnessIds: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_FITNESS_IDS ?? "",
    events: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_EVENTS ?? "",
    rsvps: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_RSVPS ?? "",
    checkins: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_CHECKINS ?? "",
    activities: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ACTIVITIES ?? "",
    places: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_PLACES ?? "",
    communities: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_COMMUNITIES ?? "",
    memberships: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_MEMBERSHIPS ?? "",
    savedItems: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SAVED_ITEMS ?? "",
    participations: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_PARTICIPATIONS ?? "",
  };
  const missing = Object.entries(collections).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`missing collection configuration:${missing.join(",")}`);
  return collections;
}

export function getScriptConfig(): { endpoint: string; projectId: string; apiKey: string; databaseId: string } {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_KEY;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const missing = [
    !endpoint && "NEXT_PUBLIC_APPWRITE_ENDPOINT",
    !projectId && "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    !apiKey && "APPWRITE_KEY",
    !databaseId && "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
  ].filter(Boolean);
  if (missing.length > 0) throw new Error(`missing configuration:${missing.join(",")}`);
  return { endpoint: endpoint as string, projectId: projectId as string, apiKey: apiKey as string, databaseId: databaseId as string };
}

export function getScriptDatabases(): Databases {
  const config = getScriptConfig();
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  return new Databases(client);
}
