import { HttpError, jsonError, jsonOk, readForm } from "@/lib/http";
import { txnIdSchema, verifyPayuResponseHash } from "@/lib/payments/payu";
import { settlePayuTransaction } from "@/lib/services/ticket-payments";

export const runtime = "nodejs";

/** PayU's server-to-server notification (set in the PayU dashboard). It settles payments whose
 * member never came back from checkout; a 503 leaves PayU to retry. */
export async function POST(request: Request) {
  try {
    const form = await readForm(request);
    if (!txnIdSchema.safeParse(form.txnid).success || !verifyPayuResponseHash(form)) {
      console.warn("[PayU] Webhook rejected: its hash did not verify");
      throw new HttpError(400, "PAYMENT_UNVERIFIED", "Payment notification could not be verified");
    }
    const { outcome } = await settlePayuTransaction(form.txnid);
    return jsonOk({ received: true, outcome });
  } catch (error) {
    return jsonError(error, "Payment notification could not be processed");
  }
}
