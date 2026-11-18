import { rememberPaymentPhone } from "@/lib/appwrite/auth";
import { getSessionSecret } from "@/lib/appwrite/server";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";
import { reserveTicketOnWhatsapp, ticketReservationInputSchema } from "@/lib/services/ticket-payments";

export const runtime = "nodejs";

/** Confirms a paid event's spot to pay later; the payment link goes to the WhatsApp number given. The number is kept to pre-fill the next booking. */
export async function POST(request: Request) {
  try {
    const user = await requireVerifiedMutationUser(request, "ticket-reserve", 10);
    const input = await readJson(request, ticketReservationInputSchema);
    const [rsvp] = await Promise.all([
      reserveTicketOnWhatsapp(user, input),
      rememberPaymentPhone(await getSessionSecret(), input.phone),
    ]);
    return jsonOk({ rsvped: true, eventId: rsvp.eventId, seatNumber: rsvp.seatNumber, amount: rsvp.amount, paymentStatus: rsvp.paymentStatus });
  } catch (error) {
    return jsonError(error, "Your spot could not be booked");
  }
}
