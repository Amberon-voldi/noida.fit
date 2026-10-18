import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { completePasswordRecovery } from "@/lib/appwrite/auth";
import { backendErrorCode, guardMutation } from "@/app/api/auth/_security";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { recoveryConfirmSchema } from "@/components/auth/validation";
import { HttpError, jsonError, readJson } from "@/lib/http";

export async function POST(request: NextRequest) {
  const rejected = guardMutation(request, "auth-recovery-confirm");
  if (rejected) return rejected;

  try {
    const input = await readJson(request, recoveryConfirmSchema);
    await completePasswordRecovery(input.userId, input.secret, input.password);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof HttpError || error instanceof ZodError) return jsonError(error);
    const code = backendErrorCode(error);
    // Appwrite answers 401/404 for an expired, used or tampered link.
    if (code === 401 || code === 404) return jsonError(new HttpError(400, "RECOVERY_LINK_INVALID", "This reset link has expired or was already used. Request a new one."));
    if (code === 400) return jsonError(new HttpError(400, "PASSWORD_REJECTED", "Choose a different password. It may be too common or match a previous one."));
    reportAppwriteFailure("auth.recovery.update", error);
    return jsonError(new HttpError(503, "RECOVERY_UNAVAILABLE", "Password reset is temporarily unavailable. Please try again."));
  }
}
