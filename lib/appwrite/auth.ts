import "server-only";

import { ID } from "node-appwrite";
import { randomUUID } from "node:crypto";
import { traceAppwriteOperation } from "@/lib/appwrite/errors";
import { APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/config";
import { getAdminServices, getGuestServices, getSessionServices } from "@/lib/appwrite/server";
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
  const context = { traceId: randomUUID() };
  const session = await traceAppwriteOperation("auth.session.create", () => openSession(email, password), context);
  try {
    const user = await traceAppwriteOperation("auth.session.read", () => getSessionServices(session.secret).account.get(), context);
    await traceAppwriteOperation("auth.profile.ensure", () => ensureProfileForUser(user), context);
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
    // Record each consent separately so either can be audited or re-requested on its own.
    const acceptedAt = new Date().toISOString();
    await getAdminServices().users.updatePrefs({ userId: created.$id, prefs: { termsAcceptedAt: acceptedAt, privacyAcceptedAt: acceptedAt } });
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

/**
 * Emails an Appwrite recovery link (valid for 1 hour) that returns to `resetUrl`.
 * An unknown email is not an error: callers must answer identically either way.
 */
export async function requestPasswordRecovery(email: string, resetUrl: string): Promise<void> {
  try {
    await traceAppwriteOperation("auth.recovery.create", () => getAdminServices().account.createRecovery({ email, url: resetUrl }), { traceId: randomUUID() });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code !== 404) throw error;
  }
}

export async function completePasswordRecovery(userId: string, secret: string, password: string): Promise<void> {
  await traceAppwriteOperation("auth.recovery.update", () => getAdminServices().account.updateRecovery({ userId, secret, password }), { traceId: randomUUID() });
}

/** Emails the session owner an Appwrite verification link that returns to `verifyUrl`. */
export async function sendEmailVerification(sessionSecret: string, verifyUrl: string): Promise<void> {
  await traceAppwriteOperation("auth.verification.create", () => getSessionServices(sessionSecret).account.createVerification({ url: verifyUrl }), { traceId: randomUUID() });
}

/** Appwrite refuses this for API keys (missing scope); the emailed secret is the credential. */
export async function completeEmailVerification(userId: string, secret: string): Promise<void> {
  await traceAppwriteOperation("auth.verification.update", () => getGuestServices().account.updateVerification({ userId, secret }), { traceId: randomUUID() });
}

export { APPWRITE_SESSION_COOKIE };
