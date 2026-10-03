import "server-only";

import { AppwriteException, ID, Permission, Query, Role } from "node-appwrite";
import type { Models } from "node-appwrite";
import { getAdminServices, getAppwriteDatabaseConfig } from "@/lib/appwrite/server";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { appwriteCollections } from "@/lib/appwrite/config";

export type AppwriteData = Record<string, unknown>;
export type AppwriteDocument<T extends object> = T & Models.Document;
export type AppwriteInput<T extends object> = Omit<T, keyof Models.Document>;

/** Appwrite owns its metadata. Never let caller-supplied $ fields reach a mutation. */
function stripSystemFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSystemFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith("$"))
      .map(([key, entry]) => [key, stripSystemFields(entry)]),
  );
}

function cleanData(data: object): Record<string, unknown> {
  return stripSystemFields(data) as Record<string, unknown>;
}

export function publicReadPermissions(): string[] {
  return [Permission.read(Role.any())];
}

/** All writes go through authenticated server code, even for a row's owner. */
export function userDocumentPermissions(userId: string): string[] {
  return [Permission.read(Role.user(userId))];
}

function queryMethod(query: string): string {
  const parsed: unknown = JSON.parse(query);
  if (!parsed || typeof parsed !== "object" || !("method" in parsed) || typeof parsed.method !== "string") {
    throw new Error("Invalid Appwrite query");
  }
  return parsed.method;
}

function logCollectionRead(collectionId: string): void {
  const configured = Object.entries(appwriteCollections).find(([, id]) => id && id === collectionId);
  // Server console only: never include credentials, queries, row IDs or row data.
  console.info("[Appwrite] Reading collection", {
    name: configured?.[0] ?? "unconfigured",
    id: configured?.[1] ?? "(unset)",
  });
}

/** Auto-paginate unbounded queries. An explicit Query.limit is honored as a bounded read. */
export async function listAppwriteDocuments<T extends object = AppwriteData>(
  collectionId: string,
  queries: string[] = [],
): Promise<AppwriteDocument<T>[]> {
  logCollectionRead(collectionId);
  try {
    return await listDocuments<T>(collectionId, queries);
  } catch (error) {
    reportAppwriteFailure("database.list", error);
    throw error;
  }
}

async function listDocuments<T extends object>(collectionId: string, queries: string[]): Promise<AppwriteDocument<T>[]> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  if (queries.some((query) => queryMethod(query) === "limit")) {
    return (await databases.listDocuments<T & Models.Document>({ databaseId, collectionId, queries })).documents;
  }

  const documents: AppwriteDocument<T>[] = [];
  let pageQueries = [...queries, Query.limit(100)];
  while (true) {
    const result = await databases.listDocuments<T & Models.Document>({ databaseId, collectionId, queries: pageQueries });
    documents.push(...result.documents);
    if (result.documents.length < 100) break;
    pageQueries = [
      ...queries.filter((query) => !["offset", "cursorAfter", "cursorBefore"].includes(queryMethod(query))),
      Query.limit(100),
      Query.cursorAfter(result.documents[result.documents.length - 1].$id),
    ];
  }
  return documents;
}

export async function getAppwriteDocument<T extends object = AppwriteData>(
  collectionId: string,
  documentId: string,
): Promise<AppwriteDocument<T> | null> {
  logCollectionRead(collectionId);
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  try {
    return await databases.getDocument<T & Models.Document>({ databaseId, collectionId, documentId });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) return null;
    throw error;
  }
}

export async function createAppwriteDocument<T extends object = AppwriteData>(
  collectionId: string,
  data: AppwriteInput<T>,
  documentId = ID.unique(),
  permissions: string[] = [],
): Promise<AppwriteDocument<T>> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  const result = await databases.createDocument({ databaseId, collectionId, documentId, data: cleanData(data), permissions });
  return result as unknown as AppwriteDocument<T>;
}

export function upsertAppwriteDocument<T extends object = AppwriteData>(collectionId: string, data: AppwriteInput<T>, documentId?: string, permissions?: string[]): Promise<AppwriteDocument<T>>;
/** Retain the original ID-first calling convention for existing profile services. */
export function upsertAppwriteDocument<T extends object = AppwriteData>(collectionId: string, documentId: string, data: AppwriteInput<T>, permissions?: string[]): Promise<AppwriteDocument<T>>;
export async function upsertAppwriteDocument<T extends object = AppwriteData>(
  collectionId: string,
  dataOrId: AppwriteInput<T> | string,
  idOrData?: string | AppwriteInput<T>,
  permissions?: string[],
): Promise<AppwriteDocument<T>> {
  const data = typeof dataOrId === "string" ? idOrData : dataOrId;
  const documentId = typeof dataOrId === "string" ? dataOrId : typeof idOrData === "string" ? idOrData : ID.unique();
  if (!data || typeof data === "string") throw new Error("Appwrite document data is required");
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  // Preserve existing ACLs unless the service explicitly supplies replacements.
  const result = await databases.upsertDocument({ databaseId, collectionId, documentId, data: cleanData(data), ...(permissions === undefined ? {} : { permissions }) });
  return result as unknown as AppwriteDocument<T>;
}

export async function deleteAppwriteDocument(collectionId: string, documentId: string): Promise<void> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  await databases.deleteDocument({ databaseId, collectionId, documentId });
}

export { Query };
