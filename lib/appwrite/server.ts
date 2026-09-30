import "server-only";

import { Account, Client, Databases, Users } from "node-appwrite";
import { AppwriteException } from "node-appwrite";
import { cookies } from "next/headers";
import {
  APPWRITE_SESSION_COOKIE,
  appwriteCollections,
  requireAppwriteServerConfig,
} from "@/lib/appwrite/config";

function createClient(): Client {
  const config = requireAppwriteServerConfig();
  return new Client().setEndpoint(config.endpoint).setProject(config.projectId);
}

export function getAdminClient(): Client {
  const config = requireAppwriteServerConfig();
  return createClient().setKey(config.apiKey);
}

export function getAdminServices(): {
  account: Account;
  databases: Databases;
  users: Users;
} {
  const client = getAdminClient();
  return {
    account: new Account(client),
    databases: new Databases(client),
    users: new Users(client),
  };
}

export function getSessionServices(sessionSecret: string): { account: Account } {
  const client = createClient().setSession(sessionSecret);
  return { account: new Account(client) };
}

export async function getSessionSecret(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(APPWRITE_SESSION_COOKIE)?.value ?? null;
}

function isMissingSessionError(error: unknown): boolean {
  return error instanceof AppwriteException && (error.code === 401 || error.code === 404);
}

export async function getCurrentAppwriteUser() {
  const sessionSecret = await getSessionSecret();
  if (!sessionSecret) return null;

  try {
    const { account } = getSessionServices(sessionSecret);
    return await account.get();
  } catch (error) {
    if (isMissingSessionError(error)) return null;
    throw error;
  }
}

export function getAppwriteDatabaseConfig() {
  const config = requireAppwriteServerConfig();
  return {
    databaseId: config.databaseId,
    collections: appwriteCollections,
  };
}
