import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAccountSession, SignupRecoveryError, sessionCookieOptions, APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/auth";
import { backendErrorCode, guardMutation, safeCallbackUrl } from "@/app/api/auth/_security";
import { UsernameConflictError } from "@/lib/appwrite/profiles";
import { signupSchema } from "@/components/auth/validation";
import { HttpError, jsonError, readJson } from "@/lib/http";

export async function POST(request: NextRequest) {
  const rejected = guardMutation(request, "auth-signup");
  if (rejected) return rejected;

  try {
    const input = await readJson(request, signupSchema);
    const { session } = await createAccountSession(input.name, input.email, input.password, input.username);
    const response = NextResponse.json({ ok: true, redirectTo: safeCallbackUrl(input.callbackUrl) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
    response.cookies.set(APPWRITE_SESSION_COOKIE, session.secret, sessionCookieOptions(session.expire));
    return response;
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error);
    if (error instanceof ZodError) {
      return jsonError(new HttpError(400, "INVALID_INPUT", "Use a valid name, email and username, and a password with 8+ characters including a letter and number."));
    }
    if (error instanceof UsernameConflictError) return jsonError(new HttpError(409, "USERNAME_TAKEN", error.message));
    if (error instanceof SignupRecoveryError) return jsonError(new HttpError(503, "SIGNUP_RECOVERY", error.message));
    // Never forward Appwrite errors, email availability, or account identifiers.
    const unavailable = backendErrorCode(error) >= 500 || backendErrorCode(error) === 0;
    return jsonError(new HttpError(unavailable ? 503 : 400, "SIGNUP_FAILED", unavailable
      ? "Account creation is temporarily unavailable. Please try again."
      : "Unable to create an account with those details. If you already registered, sign in."));
  }
}
