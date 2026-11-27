import { NextRequest, NextResponse } from "next/server";
import { safeCallbackUrl } from "@/app/api/auth/_security";
import { APPWRITE_SESSION_COOKIE, sessionCookieOptions } from "@/lib/appwrite/auth";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { acceptGoogleConsent, appRedirect, completeGoogle } from "@/lib/appwrite/oauth";
import { siteOrigin } from "@/lib/http";

/**
 * Back from Google. For the app: hand the single-use token to its link; the app exchanges it itself. For the
 * website: one step. Tapping "Continue with Google" under "By continuing, you agree to the Terms and the
 * Privacy Policy" is the agreement, so someone new has it recorded and their .fit ID created here, and is
 * signed in and sent back to the page they came from, like a returning member.
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
    if (session.needsConsent) await acceptGoogleConsent(session.secret);
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set(APPWRITE_SESSION_COOKIE, session.secret, sessionCookieOptions(session.expire));
    return response;
  } catch (error) {
    reportAppwriteFailure("auth.google.callback", error);
    return NextResponse.redirect(login);
  }
}
