import { NextRequest, NextResponse } from "next/server";
import { createEmailSession, sessionCookieOptions, APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/auth";
import { guardMutation, safeCallbackUrl } from "@/app/api/auth/_security";
import { isInvalidCredentials, reportAppwriteFailure } from "@/lib/appwrite/errors";
import { loginSchema } from "@/components/auth/validation";
import { HttpError, jsonError, readJson } from "@/lib/http";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  const rejected = guardMutation(request, "auth-login");
  if (rejected) return rejected;

  try {
    const input = await readJson(request, loginSchema);
    const { session } = await createEmailSession(input.email, input.password);
    const response = NextResponse.json({ ok: true, redirectTo: safeCallbackUrl(input.callbackUrl) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
    response.cookies.set(APPWRITE_SESSION_COOKIE, session.secret, sessionCookieOptions(session.expire));
    return response;
  } catch (error) {
    if (error instanceof HttpError || error instanceof ZodError) return jsonError(error);
    jsonError(error);
    const invalid = isInvalidCredentials(error);
    if (!invalid) reportAppwriteFailure("auth.login", error);
    return jsonError(new HttpError(invalid ? 401 : 503, invalid ? "INVALID_CREDENTIALS" : "LOGIN_UNAVAILABLE",
      invalid ? "Invalid email or password." : "Sign-in is temporarily unavailable. Please try again."));
  }
}
