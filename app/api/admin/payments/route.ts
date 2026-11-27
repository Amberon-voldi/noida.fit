import { z } from "zod";
import { HttpError, jsonError, jsonOk, readJson } from "@/lib/http";
import { requireAdminMutationUser } from "@/lib/admin/auth";
import { payuTxnIdFor, txnIdSchema } from "@/lib/payments/payu";
import { settlePayuTransaction } from "@/lib/services/ticket-payments";

export const runtime = "nodejs";

const inputSchema = z.object({ payment: z.string().trim().min(5).max(40) }).strict();

/**
 * Settles a PayU payment by hand: our transaction id (NF…), or the PayU ID shown first in the PayU dashboard.
 * Asks PayU for the payment (never trusts the input) and issues the ticket it paid for, exactly as the return
 * page and webhook would. For a payment whose buyer never came back and whose webhook didn't arrive.
 */
export async function POST(request: Request) {
  try {
    await requireAdminMutationUser(request, "admin-payment-settle", 20);
    const { payment } = await readJson(request, inputSchema);
    const txnid = txnIdSchema.safeParse(payment).success ? payment : /^\d{5,20}$/.test(payment) ? await payuTxnIdFor(payment) : null;
    if (!txnid) throw new HttpError(404, "PAYMENT_NOT_FOUND", "PayU has no NOIDA.FIT payment with that ID");
    const result = await settlePayuTransaction(txnid);
    return jsonOk({ txnid, ...result });
  } catch (error) {
    return jsonError(error, "The payment could not be settled");
  }
}
