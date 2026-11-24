import "server-only";

import { after } from "next/server";
import { ZodError } from "zod";
import { createAccountSession, createEmailSession, SignupRecoveryError, sendEmailVerification } from "@/lib/appwrite/auth";
import { isInvalidCredentials, reportAppwriteFailure } from "@/lib/appwrite/errors";
import { UsernameConflictError } from "@/lib/appwrite/profiles";
import { backendErrorCode, verifyEmailUrl } from "@/app/api/auth/_security";
import { loginSchema, signupSchema } from "@/components/auth/validation";
import { HttpError, readJson } from "@/lib/http";

/**
 * Sign-in and sign-up, shared by the website (which puts the session in a cookie) and the .fit app (which
 * keeps it in secure storage and sends it as a bearer secret). Errors come back as HttpErrors safe to show.
 */
export interface OpenedSession {
  secret: string;
  expire: string;
  callbackUrl?: string;
}

export async function signIn(request: Request): Promise<OpenedSession> {
  const input = await readJson(request, loginSchema);
  try {
    const { session } = await createEmailSession(input.email, input.password);
    return { secret: session.secret, expire: session.expire, callbackUrl: input.callbackUrl };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const invalid = isInvalidCredentials(error);
    if (!invalid) reportAppwriteFailure("auth.login", error);
    throw new HttpError(invalid ? 401 : 503, invalid ? "INVALID_CREDENTIALS" : "LOGIN_UNAVAILABLE",
      invalid ? "Invalid email or password." : "Sign-in is temporarily unavailable. Please try again.");
  }
}

/** Next's after() in a real request (Cloudflare waitUntil); outside one, e.g. a direct call, just run it. */
async function afterResponse(task: () => Promise<unknown>): Promise<void> {
  try { after(task); } catch { await task(); }
}

export async function signUp(request: Request): Promise<OpenedSession> {
  try {
    const input = await readJson(request, signupSchema);
    const { session } = await createAccountSession(input.name, input.email, input.password, input.username);
    // The account exists either way: a failed send must not fail signup. The banner offers a resend.
    // Send after responding, so the member is not kept waiting on the email provider.
    const verifyUrl = verifyEmailUrl(request);
    await afterResponse(() => sendEmailVerification(session.secret, verifyUrl)
      .catch(error => reportAppwriteFailure("auth.verification.create", error)));
    return { secret: session.secret, expire: session.expire, callbackUrl: input.callbackUrl };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof ZodError) {
      if (error.issues.some(issue => issue.path[0] === "acceptTerms" || issue.path[0] === "acceptPrivacy")) {
        throw new HttpError(400, "CONSENT_REQUIRED", "Agree to the Terms and Conditions and the Privacy Policy to create your .fit ID.");
      }
      throw new HttpError(400, "INVALID_INPUT", "Use a valid name, email and username, and a password with 8+ characters including a letter and number.");
    }
    if (error instanceof UsernameConflictError) throw new HttpError(409, "USERNAME_TAKEN", error.message);
    if (error instanceof SignupRecoveryError) throw new HttpError(503, "SIGNUP_RECOVERY", error.message);
    // Never forward Appwrite errors, email availability, or account identifiers.
    const unavailable = backendErrorCode(error) >= 500 || backendErrorCode(error) === 0;
    throw new HttpError(unavailable ? 503 : 400, "SIGNUP_FAILED", unavailable
      ? "Account creation is temporarily unavailable. Please try again."
      : "Unable to create an account with those details. If you already registered, sign in.");
  }
}
