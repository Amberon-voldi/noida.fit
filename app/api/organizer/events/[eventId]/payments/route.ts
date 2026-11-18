import { z } from "zod";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";
import { setTicketPaid } from "@/lib/participation";

export const runtime = "nodejs";

const paymentInputSchema = z.object({ seatNumber: z.number().int().min(1).max(100_000), paid: z.boolean() }).strict();

/** The organizer marks a guest's ticket paid (e.g. through the WhatsApp link) or still due, by its spot. */
export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-ticket-payment", 120);
    const { eventId } = await params;
    const { seatNumber, paid } = await readJson(request, paymentInputSchema);
    return jsonOk(await setTicketPaid(user, eventId, seatNumber, paid));
  } catch (error) {
    return jsonError(error, "The payment status could not be saved");
  }
}
