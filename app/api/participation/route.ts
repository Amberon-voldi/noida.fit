import { getAccountParticipation, getParticipationControls } from "@/lib/participation";
import { jsonError, jsonOk, requireAuthUser } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireAuthUser();
    const load = new URL(request.url).searchParams.get("view") === "controls" ? getParticipationControls : getAccountParticipation;
    return jsonOk(await load(user.id));
  } catch (error) {
    return jsonError(error, "Participation could not be loaded");
  }
}
