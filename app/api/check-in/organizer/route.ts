import { checkInParticipant, checkInInputSchema } from "@/lib/participation";
import { jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Event-scoped authorization is rechecked in the service; a participant cannot self-check in.
    const operator = await requireMutationUser(request, "organizer-check-in", 120);
    const { eventId, token } = await readJson(request, checkInInputSchema);
    return jsonOk({ checkedIn: true, ...await checkInParticipant(operator, eventId, token) });
  } catch (error) {
    return jsonError(error, "Participant check-in could not be completed");
  }
}
