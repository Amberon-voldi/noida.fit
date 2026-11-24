import "server-only";

import { OAuthProvider } from "node-appwrite";
import { getAdminServices, getGuestServices, getSessionServices } from "@/lib/appwrite/server";
import { ensureProfileForUser } from "@/lib/appwrite/profiles";

/**
 * "Continue with Google", for the website and the .fit app. Appwrite runs the Google sign-in and hands back a
 * single-use token; we turn it into a session. Someone new has to agree to the Terms and Privacy Policy (two
 * separate ticks, as at sign-up) before their .fit ID exists; until then the website keeps their session in a
 * short-lived holding cookie and the app keeps it in memory, so nobody is signed in without consent.
 */
export const OAUTH_PENDING_COOKIE = "noidafit_oauth_pending";

export function googleSignInUrl(success: string, failure: string): Promise<string> {
  return getGuestServices().account.createOAuth2Token({ provider: OAuthProvider.Google, success, failure });
}

function hasConsent(prefs: unknown): boolean {
  const values = prefs as Record<string, unknown> | undefined;
  return typeof values?.termsAcceptedAt === "string" && typeof values?.privacyAcceptedAt === "string";
}

/** The token from Google's round trip, as a session. Members who agreed before are ready; someone new must agree first. */
export async function completeGoogle(userId: string, secret: string): Promise<{ secret: string; expire: string; needsConsent: boolean }> {
  const session = await getAdminServices().account.createSession({ userId, secret });
  const user = await getSessionServices(session.secret).account.get();
  const needsConsent = !hasConsent(user.prefs);
  if (!needsConsent) await ensureProfileForUser(user);
  return { secret: session.secret, expire: session.expire, needsConsent };
}

/** Records both agreements (each with its time, as sign-up does) and creates the .fit ID. */
export async function acceptGoogleConsent(sessionSecret: string): Promise<void> {
  const user = await getSessionServices(sessionSecret).account.get();
  if (!hasConsent(user.prefs)) {
    const acceptedAt = new Date().toISOString();
    await getAdminServices().users.updatePrefs({ userId: user.$id, prefs: { ...(user.prefs ?? {}), termsAcceptedAt: acceptedAt, privacyAcceptedAt: acceptedAt } });
  }
  await ensureProfileForUser(user, { displayName: user.name, email: user.email, fresh: true });
}

/** Where the app may receive its sign-in token: its own link (dotfit://), and Expo Go's (exp://) outside production. */
export function appRedirect(value: string | null): string | null {
  if (!value) return null;
  if (/^dotfit:\/\//.test(value)) return value;
  if (process.env.NODE_ENV !== "production" && /^exps?:\/\//.test(value)) return value;
  return null;
}
