import { NextRequest, NextResponse } from "next/server";
import { safeCallbackUrl } from "@/app/api/auth/_security";
import { APPWRITE_SESSION_COOKIE, sessionCookieOptions } from "@/lib/appwrite/auth";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { appRedirect, completeGoogle, OAUTH_PENDING_COOKIE } from "@/lib/appwrite/oauth";
import { siteOrigin } from "@/lib/http";

/**
 * Back from Google. For the app: hand the single-use token to its link; the app exchanges it itself. For the
 * website: members who agreed before are signed in; someone new goes to /welcome to agree first, with their
 * session held in a short-lived cookie that signs nobody in.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = siteOrigin(request);
  const userId = url.searchParams.get("userId");
  const secret = url.searchParams.get("secret");
  const failed = url.searchParams.has("error") || !userId || !secret;

  const app = appRedirect(url.searchParams.get("to"));
  if (app) {
    const back = new URL(app);
    if (failed) back.searchParams.set("error", "google");
    else { back.searchParams.set("userId", userId!); back.searchParams.set("secret", secret!); }
    return NextResponse.redirect(back.toString());
  }

  const next = safeCallbackUrl(url.searchParams.get("next") ?? undefined);
  const login = new URL(`/login?error=google&callbackUrl=${encodeURIComponent(next)}`, origin);
  if (failed) return NextResponse.redirect(login);
  try {
    const session = await completeGoogle(userId!, secret!);
    if (session.needsConsent) {
      const response = NextResponse.redirect(new URL(`/welcome?next=${encodeURIComponent(next)}`, origin));
      response.cookies.set(OAUTH_PENDING_COOKIE, session.secret, { ...sessionCookieOptions(session.expire), expires: new Date(Date.now() + 30 * 60_000) });
      return response;
    }
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set(APPWRITE_SESSION_COOKIE, session.secret, sessionCookieOptions(session.expire));
    return response;
  } catch (error) {
    reportAppwriteFailure("auth.google.callback", error);
    return NextResponse.redirect(login);
  }
}
