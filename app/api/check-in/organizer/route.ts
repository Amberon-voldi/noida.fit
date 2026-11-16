import { z } from "zod";
import { checkInParticipant, checkInInputSchema } from "@/lib/participation";
import { checkInGuest, guestCheckInInputSchema } from "@/lib/services/gifts";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Event-scoped authorization is rechecked in the service; a participant cannot self-check in.
    const operator = await requireVerifiedMutationUser(request, "organizer-check-in", 120);
    // A member's .fit ID check-in QR, or a guest pass from a gift link claimed without an account.
    const input = await readJson(request, z.union([checkInInputSchema, guestCheckInInputSchema]));
    return jsonOk({ checkedIn: true, ...("guestPass" in input ? await checkInGuest(operator, input.eventId, input.guestPass) : await checkInParticipant(operator, input.eventId, input.token)) });
  } catch (error) {
    return jsonError(error, "Participant check-in could not be completed");
  }
}
