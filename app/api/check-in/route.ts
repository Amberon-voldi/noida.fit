import { checkInAttendee, checkInInputSchema } from "@/lib/participation";
import { jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request, "check-in");
    const { token } = await readJson(request, checkInInputSchema);
    const result = await checkInAttendee(user.id, token);
    return jsonOk({ checkedIn: true, eventId: result.checkin.eventId, repaired: result.repaired });
  } catch (error) {
    return jsonError(error, "Check-in could not be completed");
  }
}
