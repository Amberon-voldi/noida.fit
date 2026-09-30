import "server-only";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export const appwritePublicConfig = {
  endpoint: endpoint ?? "",
  projectId: projectId ?? "",
  projectName: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME ?? "NOIDA.FIT",
};

export const appwriteCollections = {
  profiles: process.env.APPWRITE_COLLECTION_PROFILES ?? "",
  fitnessIds: process.env.APPWRITE_COLLECTION_FITNESS_IDS ?? "",
  events: process.env.APPWRITE_COLLECTION_EVENTS ?? "",
  rsvps: process.env.APPWRITE_COLLECTION_RSVPS ?? "",
  checkins: process.env.APPWRITE_COLLECTION_CHECKINS ?? "",
  activities: process.env.APPWRITE_COLLECTION_ACTIVITIES ?? "",
  places: process.env.APPWRITE_COLLECTION_PLACES ?? "",
  communities: process.env.APPWRITE_COLLECTION_COMMUNITIES ?? "",
  memberships: process.env.APPWRITE_COLLECTION_MEMBERSHIPS ?? "",
  savedItems: process.env.APPWRITE_COLLECTION_SAVED_ITEMS ?? "",
  participations: process.env.APPWRITE_COLLECTION_PARTICIPATIONS ?? "",
} as const;

export function hasPublicAppwriteConfig(): boolean {
  return Boolean(endpoint && projectId);
}

export function requireAppwritePublicConfig(): {
  endpoint: string;
  projectId: string;
  projectName: string;
} {
  if (!endpoint || !projectId) {
    throw new Error(
      "Missing Appwrite client configuration. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.",
    );
  }

  return { endpoint, projectId, projectName: appwritePublicConfig.projectName };
}

export function requireAppwriteServerConfig(): {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
  collections: typeof appwriteCollections;
} {
  const apiKey = process.env.APPWRITE_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const missing = [
    !endpoint && "NEXT_PUBLIC_APPWRITE_ENDPOINT",
    !projectId && "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    !apiKey && "APPWRITE_KEY",
    !databaseId && "APPWRITE_DATABASE_ID",
  ].filter((value): value is string => Boolean(value));

  const missingCollections = Object.entries(appwriteCollections).filter(([, value]) => !value).map(([key]) => `collection:${key}`);
  if (missing.length > 0 || missingCollections.length > 0) {
    throw new Error(`Missing Appwrite server configuration: ${[...missing, ...missingCollections].join(", ")}`);
  }
  const url = new URL(endpoint as string);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Appwrite endpoint must use HTTPS outside localhost");
  }

  return {
    endpoint: endpoint as string,
    projectId: projectId as string,
    apiKey: apiKey as string,
    databaseId: databaseId as string,
    collections: appwriteCollections,
  };
}

export const APPWRITE_SESSION_COOKIE = "noidafit_appwrite_session";
export const APPWRITE_SESSION_MAX_AGE = 60 * 60 * 24 * 30;
