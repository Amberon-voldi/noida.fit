import { z } from "zod";
import { reportAppwriteFailure } from "@/lib/appwrite/errors";
import { completeGoogle } from "@/lib/appwrite/oauth";
import { assertRateLimit, HttpError, jsonError, jsonOk, readJson } from "@/lib/http";

export const runtime = "nodejs";

const tokenSchema = z.object({ userId: z.string().min(1).max(64), secret: z.string().min(1).max(512) }).strict();

/**
 * The .fit app, back from Google with the single-use token: it becomes a session. `needsConsent`: someone new,
 * who agrees in the app (POST /api/auth/google/consent with this secret) before it's kept.
 */
export async function POST(request: Request) {
  try {
    assertRateLimit(request, "app-auth-google", undefined, 20);
    const { userId, secret } = await readJson(request, tokenSchema);
    return jsonOk(await completeGoogle(userId, secret));
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error);
    reportAppwriteFailure("auth.google.app", error);
    return jsonError(new HttpError(401, "GOOGLE_FAILED", "Google sign-in didn’t finish. Try again."));
  }
}
