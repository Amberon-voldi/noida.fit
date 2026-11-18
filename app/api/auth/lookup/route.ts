import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { accountExists } from "@/lib/appwrite/auth";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { guardMutation } from "@/app/api/auth/_security";
import { emailLookupSchema } from "@/components/auth/validation";
import { HttpError, jsonError, readJson } from "@/lib/http";

/**
 * The auth form's first step: whether this email already has an account, so the form asks for its
 * password, or for the details to create one. The answer tells anyone whether an email is registered,
 * so it is rate limited and says nothing else about the account.
 */
export async function POST(request: NextRequest) {
  const rejected = guardMutation(request, "auth-lookup", undefined, 10);
  if (rejected) return rejected;

  try {
    const { email } = await readJson(request, emailLookupSchema);
    return NextResponse.json({ exists: await accountExists(email) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error);
    if (error instanceof ZodError) return jsonError(new HttpError(400, "INVALID_EMAIL", "Enter a valid email address."));
    reportAppwriteFailure("auth.lookup", error);
    return jsonError(new HttpError(503, "LOOKUP_UNAVAILABLE", "Sign-in is temporarily unavailable. Please try again."));
  }
}
