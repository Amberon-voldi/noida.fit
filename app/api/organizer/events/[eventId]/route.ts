import { updateOrganizerEvent } from "@/lib/services/organizer-events";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-event-update", 40);
    const { eventId } = await params;
    const { event, expectedUpdatedAt } = await readJson(request, z.object({ event: z.unknown(), expectedUpdatedAt: z.string().max(64) }).strict(), 32_768);
    return jsonOk(await updateOrganizerEvent(user, eventId, event, expectedUpdatedAt));
  } catch (error) {
    return jsonError(error, "The event could not be saved");
  }
}
