import { z } from "zod";
import { createParticipantCheckInToken } from "@/lib/participation";
import { jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const participant = await requireMutationUser(request, "participant-check-in-pass");
    // No client-selected member/Fitness ID: the pass belongs only to this session owner.
    await readJson(request, z.object({}).strict());
    return jsonOk(await createParticipantCheckInToken(participant.id));
  } catch (error) {
    return jsonError(error, "Your check-in QR could not be created. Try signing in again.");
  }
}
