import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { completeEmailVerification } from "@/lib/appwrite/auth";
import { backendErrorCode, guardMutation } from "@/app/api/auth/_security";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { verificationConfirmSchema } from "@/components/auth/validation";
import { HttpError, jsonError, readJson } from "@/lib/http";

/** The emailed secret proves ownership of the address, so no session is needed to confirm it. */
export async function POST(request: NextRequest) {
  const rejected = guardMutation(request, "auth-verification-confirm");
  if (rejected) return rejected;

  try {
    const input = await readJson(request, verificationConfirmSchema);
    await completeEmailVerification(input.userId, input.secret);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof HttpError || error instanceof ZodError) return jsonError(error);
    const code = backendErrorCode(error);
    // Appwrite answers 401/404 for an expired, used or tampered link.
    if (code === 401 || code === 404) return jsonError(new HttpError(400, "VERIFICATION_LINK_INVALID", "This verification link has expired or was already used. Send a new one from your account."));
    reportAppwriteFailure("auth.verification.update", error);
    return jsonError(new HttpError(503, "VERIFICATION_UNAVAILABLE", "Email verification is temporarily unavailable. Please try again."));
  }
}
