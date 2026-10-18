import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requestPasswordRecovery } from "@/lib/appwrite/auth";
import { guardMutation } from "@/app/api/auth/_security";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { recoveryRequestSchema } from "@/components/auth/validation";
import { HttpError, jsonError, readJson } from "@/lib/http";

/** Same answer whether or not the email has an account, so the endpoint cannot enumerate members. */
export async function POST(request: NextRequest) {
  const rejected = guardMutation(request, "auth-recovery");
  if (rejected) return rejected;

  try {
    const input = await readJson(request, recoveryRequestSchema);
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin;
    await requestPasswordRecovery(input.email, `${origin}/reset-password`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof HttpError || error instanceof ZodError) return jsonError(error);
    reportAppwriteFailure("auth.recovery.create", error);
    return jsonError(new HttpError(503, "RECOVERY_UNAVAILABLE", "Password reset is temporarily unavailable. Please try again."));
  }
}
