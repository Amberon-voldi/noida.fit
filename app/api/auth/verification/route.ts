import { NextRequest } from "next/server";
import { sendEmailVerification } from "@/lib/appwrite/auth";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { getSessionSecret } from "@/lib/appwrite/server";
import { verifyEmailUrl } from "@/app/api/auth/_security";
import { HttpError, jsonError, jsonOk, requireMutationUser } from "@/lib/http";

/** Resends the verification link to the signed-in member's own email. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireMutationUser(request, "auth-verification");
    if (user.emailVerified) return jsonOk({ ok: true, verified: true });
    const secret = await getSessionSecret();
    if (!secret) throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue");
    try {
      await sendEmailVerification(secret, verifyEmailUrl(request));
    } catch (error) {
      reportAppwriteFailure("auth.verification.create", error);
      throw new HttpError(503, "VERIFICATION_UNAVAILABLE", "The verification email couldn't be sent. Please try again.");
    }
    return jsonOk({ ok: true, verified: false });
  } catch (error) {
    return jsonError(error, "The verification email couldn't be sent. Please try again.");
  }
}
