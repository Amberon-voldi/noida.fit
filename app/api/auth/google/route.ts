import { NextRequest, NextResponse } from "next/server";
import { safeCallbackUrl } from "@/app/api/auth/_security";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { appRedirect, googleSignInUrl } from "@/lib/appwrite/oauth";
import { assertRateLimit, siteOrigin } from "@/lib/http";

/**
 * Starts "Continue with Google". The website passes ?callbackUrl=; the .fit app passes ?to=<its own link>,
 * which only ever receives the single-use token (see lib/appwrite/oauth.ts appRedirect).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = siteOrigin(request);
  const app = appRedirect(url.searchParams.get("to"));
  const callback = new URL("/api/auth/google/callback", origin);
  if (app) callback.searchParams.set("to", app);
  else callback.searchParams.set("next", safeCallbackUrl(url.searchParams.get("callbackUrl") ?? undefined));
  const failure = new URL(callback);
  failure.searchParams.set("error", "google");
  try {
    assertRateLimit(request, "auth-google", undefined, 20);
    return NextResponse.redirect(await googleSignInUrl(callback.toString(), failure.toString()));
  } catch (error) {
    reportAppwriteFailure("auth.google.start", error);
    return NextResponse.redirect(failure);
  }
}
