import { getAccountParticipation } from "@/lib/participation";
import { jsonError, jsonOk, requireAuthUser } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuthUser();
    return jsonOk(await getAccountParticipation(user.id));
  } catch (error) {
    return jsonError(error, "Participation could not be loaded");
  }
}
