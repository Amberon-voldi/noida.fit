import "server-only";

import { ID } from "node-appwrite";
import { APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/config";
import { getAdminServices, getSessionServices } from "@/lib/appwrite/server";
import { assertUsernameAvailable, ensureProfileForUser } from "@/lib/appwrite/profiles";

export function sessionCookieOptions(expire: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expire),
    priority: "high" as const,
  };
}

export function clearSessionCookieOptions() {
  return { ...sessionCookieOptions(new Date(0).toISOString()), maxAge: 0 };
}

async function openSession(email: string, password: string) {
  // Appwrite returns session.secret to API-key clients for SSR. The SDK and
  // API key never reach the browser; email/password are still authenticated.
  const session = await getAdminServices().account.createEmailPasswordSession({ email, password });
  if (!session.secret) throw new Error("Session could not be established");
  return session;
}

export async function createEmailSession(email: string, password: string) {
  const session = await openSession(email, password);
  try {
    const user = await getSessionServices(session.secret).account.get();
    await ensureProfileForUser(user);
    return { session };
  } catch (error) {
    await deleteCurrentSession(session.secret).catch(() => undefined);
    throw error;
  }
}

/** A signup that fails after creating an account is recoverable by login. */
export class SignupRecoveryError extends Error {
  constructor() {
    super("Your account was created, but setup was interrupted. Sign in with the same email and password to finish, then confirm your username in settings.");
    this.name = "SignupRecoveryError";
  }
}

export async function createAccountSession(name: string, email: string, password: string, username: string) {
  // Preflight avoids creating an auth account for an already-taken username.
  // The unique database index still wins concurrent races.
  await assertUsernameAvailable(username);
  const { account } = getAdminServices();
  const created = await account.create({ userId: ID.unique(), email, password, name });
  try {
    await ensureProfileForUser(created, { preferredUsername: username, displayName: name });
    return { session: await openSession(email, password) };
  } catch {
    // Auth and database writes are not transactional. Preserve the new account:
    // a subsequent login repairs missing rows without resetting existing privacy.
    // Never delete a valid account because a dependent service was unavailable.
    throw new SignupRecoveryError();
  }
}

export async function deleteCurrentSession(secret: string): Promise<void> {
  try {
    await getSessionServices(secret).account.deleteSession({ sessionId: "current" });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code !== 401 && code !== 404) throw error;
  }
}

export { APPWRITE_SESSION_COOKIE };
