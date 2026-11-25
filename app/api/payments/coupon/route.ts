import { z } from "zod";
import { HttpError, jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";
import { formatInr } from "@/lib/pricing";
import { documentIdSchema, getTicketEvent, quoteTicketCoupon } from "@/lib/services/participation";

export const runtime = "nodejs";

const inputSchema = z.object({ eventId: documentIdSchema, code: z.string().trim().min(1).max(40) }).strict();

/**
 * What a discount code makes this event's ticket cost, for the checkout summary. Changes nothing: the
 * code is checked again, and the price fixed, when the member pays. Rate-limited so codes can't be guessed.
 */
export async function POST(request: Request) {
  try {
    const user = await requireVerifiedMutationUser(request, "ticket-coupon", 10);
    const input = await readJson(request, inputSchema);
    if ((await getTicketEvent(input.eventId)).demo) throw new HttpError(409, "DEMO_EVENT", "This is a demo listing, so it can’t take a payment");
    const quote = await quoteTicketCoupon(user.id, input.eventId, input.code);
    return jsonOk({ code: quote.code, amount: quote.amount, discount: quote.discount, label: quote.label, priceLabel: formatInr(quote.amount) });
  } catch (error) {
    return jsonError(error, "The discount code could not be checked");
  }
}
