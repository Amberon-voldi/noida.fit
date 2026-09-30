import { createEventCheckInToken, eventInputSchema } from "@/lib/participation";
import { jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request, "organizer-token");
    const { eventId } = await readJson(request, eventInputSchema);
    const code = await createEventCheckInToken(eventId, user);
    return jsonOk({ ...code, eventId });
  } catch (error) {
    return jsonError(error, "Check-in code could not be created");
  }
}
