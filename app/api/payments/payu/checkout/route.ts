import { rememberPaymentPhone } from "@/lib/appwrite/auth";
import { getSessionSecret } from "@/lib/appwrite/server";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser, siteOrigin } from "@/lib/http";
import { startTicketPayment, ticketPaymentInputSchema } from "@/lib/services/ticket-payments";

export const runtime = "nodejs";

/** Holds the seat and returns the signed form the browser posts to PayU. The mobile number is kept to pre-fill the next checkout. */
export async function POST(request: Request) {
  try {
    const user = await requireVerifiedMutationUser(request, "ticket-payment", 10);
    const input = await readJson(request, ticketPaymentInputSchema);
    const [form] = await Promise.all([
      startTicketPayment(user, input, siteOrigin(request)),
      rememberPaymentPhone(await getSessionSecret(), input.phone),
    ]);
    return jsonOk(form);
  } catch (error) {
    return jsonError(error, "Payment could not be started");
  }
}
