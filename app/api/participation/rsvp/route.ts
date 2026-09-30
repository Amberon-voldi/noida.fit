import { cancelRsvp, createRsvp, eventInputSchema } from "@/lib/participation";
import { jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request, "rsvp");
    const { eventId } = await readJson(request, eventInputSchema);
    const rsvp = await createRsvp(user.id, eventId);
    return jsonOk({ rsvped: true, eventId: rsvp.eventId, seatNumber: rsvp.seatNumber });
  } catch (error) {
    return jsonError(error, "RSVP could not be created");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireMutationUser(request, "rsvp-cancel");
    const { eventId } = await readJson(request, eventInputSchema);
    await cancelRsvp(user.id, eventId);
    return jsonOk({ rsvped: false, eventId });
  } catch (error) {
    return jsonError(error, "RSVP could not be cancelled");
  }
}
