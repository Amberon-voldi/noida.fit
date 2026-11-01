import { createOrganizerEvent } from "@/lib/services/organizer-events";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-event-create", 20);
    const { event } = await readJson(request, z.object({ event: z.unknown() }).strict(), 32_768);
    return jsonOk(await createOrganizerEvent(user, event));
  } catch (error) {
    return jsonError(error, "The event could not be created");
  }
}
