import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardMutation, safeCallbackUrl } from "@/app/api/auth/_security";
import { bearerSessionSecret } from "@/lib/app-session";
import { APPWRITE_SESSION_COOKIE, clearSessionCookieOptions, sessionCookieOptions } from "@/lib/appwrite/auth";
import { acceptGoogleConsent, OAUTH_PENDING_COOKIE } from "@/lib/appwrite/oauth";
import { HttpError, jsonError, readJson } from "@/lib/http";

/** Both agreements, ticked separately by the member, as at sign-up. */
const consentSchema = z.object({ acceptTerms: z.literal(true), acceptPrivacy: z.literal(true), callbackUrl: z.string().max(2048).optional() }).strict();

/**
 * A new Google member agrees to the Terms and the Privacy Policy, and their .fit ID is created. The app sends
 * its held session as a bearer secret; the website's is in the holding cookie, and becomes the real session here.
 */
export async function POST(request: NextRequest) {
  const rejected = guardMutation(request, "auth-google-consent", undefined, 10);
  if (rejected) return rejected;
  try {
    const input = await readJson(request, consentSchema).catch(() => { throw new HttpError(400, "CONSENT_REQUIRED", "Agree to the Terms and Conditions and the Privacy Policy to create your .fit ID."); });
    const bearer = bearerSessionSecret(request.headers.get("authorization"));
    const pending = bearer ?? request.cookies.get(OAUTH_PENDING_COOKIE)?.value;
    if (!pending) throw new HttpError(401, "GOOGLE_EXPIRED", "Your Google sign-in timed out. Continue with Google again.");
    await acceptGoogleConsent(pending);
    const response = NextResponse.json({ ok: true, redirectTo: safeCallbackUrl(input.callbackUrl) }, { headers: { "Cache-Control": "private, no-store" } });
    if (!bearer) {
      response.cookies.set(APPWRITE_SESSION_COOKIE, pending, sessionCookieOptions(new Date(Date.now() + 365 * 24 * 60 * 60_000).toISOString()));
      response.cookies.set(OAUTH_PENDING_COOKIE, "", clearSessionCookieOptions());
    }
    return response;
  } catch (error) {
    return jsonError(error, "Your .fit ID couldn’t be created right now. Please try again.");
  }
}
