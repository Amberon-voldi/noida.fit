import { jsonError, jsonOk, readJson, requireVerifiedMutationUser, siteOrigin } from "@/lib/http";
import { startTicketPayment, ticketPaymentInputSchema } from "@/lib/services/ticket-payments";

export const runtime = "nodejs";

/** Holds the seat and returns the signed form the browser posts to PayU. */
export async function POST(request: Request) {
  try {
    const user = await requireVerifiedMutationUser(request, "ticket-payment", 10);
    const input = await readJson(request, ticketPaymentInputSchema);
    return jsonOk(await startTicketPayment(user, input, siteOrigin(request)));
  } catch (error) {
    return jsonError(error, "Payment could not be started");
  }
}
