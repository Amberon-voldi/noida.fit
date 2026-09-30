import { NextRequest } from "next/server";
import { getPublicProfileByUsername, toPublicProfileDto } from "@/lib/appwrite/profiles";
import { HttpError, jsonError, jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username");
    const profile = username ? await getPublicProfileByUsername(username) : null;
    // Private and missing profiles are intentionally indistinguishable.
    if (!profile) throw new HttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
    return jsonOk({ profile: toPublicProfileDto(profile) });
  } catch (error) {
    return jsonError(error, "Profiles are temporarily unavailable.");
  }
}
