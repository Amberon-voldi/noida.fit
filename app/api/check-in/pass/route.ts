import { z } from "zod";
import { createParticipantCheckInToken } from "@/lib/participation";
import { jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

/** No verified email needed: a member who booked a ticket before verifying still checks in. The organizer's
 * scan admits only someone with a confirmed spot for that session. */
export async function POST(request: Request) {
  try {
    const participant = await requireMutationUser(request, "participant-check-in-pass");
    // No client-selected member/.fit ID: the pass belongs only to this session owner.
    await readJson(request, z.object({}).strict());
    return jsonOk(await createParticipantCheckInToken(participant.id));
  } catch (error) {
    return jsonError(error, "Your check-in QR could not be created. Try signing in again.");
  }
}
