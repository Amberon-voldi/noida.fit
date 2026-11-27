import { z } from "zod";
import { Query } from "node-appwrite";
import { HttpError, jsonError, jsonOk, readJson } from "@/lib/http";
import { requireAdminMutationUser } from "@/lib/admin/auth";
import { runAdminMutation } from "@/lib/admin/audit";
import { getAdminServices } from "@/lib/appwrite/server";
import { payuTxnIdFor, txnIdSchema } from "@/lib/payments/payu";
import { confirmTicketPayment, documentIdSchema } from "@/lib/services/participation";
import { settlePayuTransaction } from "@/lib/services/ticket-payments";

export const runtime = "nodejs";

const lookupSchema = z.object({ payment: z.string().trim().min(5).max(40) }).strict();
/** Issue by hand, from the PayU dashboard: the buyer's account email, the event, the ticket type and the amount PayU captured. */
const manualSchema = lookupSchema.extend({
  email: z.string().trim().toLowerCase().email().max(200),
  eventId: documentIdSchema,
  tier: z.string().regex(/^[a-z0-9]{6}$/).optional(),
  rupees: z.number().int().positive().max(100000),
  reason: z.string().trim().min(5).max(300),
}).strict();

/**
 * Settles a PayU payment that never reached the site (the buyer didn't come back and no webhook arrived).
 * `{ payment }`: our txnid (NF…) or the PayU ID; the server asks PayU for it and issues its ticket as the return
 * page would. Where PayU's lookups aren't enabled for the account, `{ payment, email, eventId, tier?, rupees,
 * reason }` issues the ticket the admin read off the PayU dashboard, audited, at a price the type must match.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAdminMutationUser(request, "admin-payment-settle", 20);
    const body = await readJson(request, z.union([manualSchema, lookupSchema]));
    if ("email" in body) {
      const { users } = getAdminServices();
      const found = await users.list({ queries: [Query.equal("email", [body.email]), Query.limit(1)] });
      const member = found.users[0];
      if (!member) throw new HttpError(404, "MEMBER_NOT_FOUND", "No NOIDA.FIT account has that email");
      const ref = `payu:manual:${body.payment.replace(/[^A-Za-z0-9]/g, "").slice(0, 40)}`;
      const ticket = await runAdminMutation(user, "payment.manual-ticket", `${body.eventId}:${member.$id}`, body.reason, () =>
        confirmTicketPayment(body.eventId, member.$id, body.rupees * 100, ref, body.tier ? `;t=${body.tier}` : ""));
      return jsonOk({ outcome: "paid", seatNumber: ticket.seatNumber, name: member.name });
    }
    const txnid = txnIdSchema.safeParse(body.payment).success ? body.payment : /^\d{5,20}$/.test(body.payment) ? await payuTxnIdFor(body.payment) : null;
    if (!txnid) throw new HttpError(404, "PAYMENT_NOT_FOUND", "PayU didn’t find that payment by its ID. Enter the buyer’s email and the ticket to issue it from the PayU dashboard instead.");
    const result = await settlePayuTransaction(txnid);
    return jsonOk({ txnid, ...result });
  } catch (error) {
    return jsonError(error, "The payment could not be settled");
  }
}
