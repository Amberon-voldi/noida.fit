import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { ensureProfileForUser, profileSettings, updateProfileForUser, UsernameConflictError } from "@/lib/appwrite/profiles";
import { guardMutation, isSameOrigin } from "@/app/api/auth/_security";
import { profileSettingsSchema } from "@/components/auth/validation";
import { HttpError, jsonError, jsonOk, readJson } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentAppwriteUser();
    if (!user) throw new HttpError(401, "AUTH_REQUIRED", "Sign in required.");
    const settings = profileSettings(await ensureProfileForUser(user));
    return jsonOk({ settings });
  } catch (error) {
    return jsonError(error, "Your settings are temporarily unavailable.");
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError(new HttpError(403, "ORIGIN_MISMATCH", "Request origin could not be verified."));
  try {
    const user = await getCurrentAppwriteUser();
    if (!user) throw new HttpError(401, "AUTH_REQUIRED", "Sign in required.");
    const rejected = guardMutation(request, "profile-settings", user.$id);
    if (rejected) return rejected;
    const updates = await readJson(request, profileSettingsSchema.partial());
    const settings = await updateProfileForUser(user, updates);
    return jsonOk({ settings });
  } catch (error) {
    if (error instanceof UsernameConflictError) return jsonError(new HttpError(409, "USERNAME_TAKEN", error.message));
    if (error instanceof ZodError) return jsonError(new HttpError(400, "INVALID_INPUT", "Check your settings. Usernames need 3–40 characters, start and end with a letter or number, and may contain dots, hyphens or underscores."));
    return jsonError(error, "Unable to save settings right now. Please retry.");
  }
}
