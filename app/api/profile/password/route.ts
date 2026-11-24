import { z } from "zod";
import { getSessionSecret, getSessionServices } from "@/lib/appwrite/server";
import { isInvalidCredentials, reportAppwriteFailure } from "@/lib/appwrite/errors";
import { HttpError, jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

const passwordSchema = z.object({
  // The same rule as sign-up: 8+ characters with a letter and a number.
  password: z.string().min(8).max(256).regex(/[A-Za-z]/).regex(/[0-9]/),
  currentPassword: z.string().min(1).max(256).optional(),
}).strict();

/**
 * Sets or changes the member's password. Someone who joined with Google sets their first one with no current
 * password, and can then also sign in with their email. Changing an existing one needs the current password.
 */
export async function POST(request: Request) {
  try {
    await requireMutationUser(request, "profile-password");
    const input = await readJson(request, passwordSchema).catch(() => {
      throw new HttpError(400, "PASSWORD_WEAK", "Use at least 8 characters, including a letter and a number.");
    });
    const secret = await getSessionSecret();
    if (!secret) throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue");
    try {
      await getSessionServices(secret).account.updatePassword({ password: input.password, ...(input.currentPassword ? { oldPassword: input.currentPassword } : {}) });
    } catch (error) {
      if (isInvalidCredentials(error)) throw new HttpError(400, "WRONG_PASSWORD", input.currentPassword ? "Your current password isn’t right." : "Enter your current password to change it.");
      reportAppwriteFailure("auth.password.update", error);
      throw new HttpError(503, "PASSWORD_UNAVAILABLE", "Your password couldn’t be saved right now. Please try again.");
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, "Your password couldn’t be saved right now. Please try again.");
  }
}
