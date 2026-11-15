import { HttpError, readForm, siteOrigin } from "@/lib/http";
import { getTicketEvent } from "@/lib/participation";
import { txnIdSchema, verifyPayuResponseHash } from "@/lib/payments/payu";
import { settlePayuTransaction, type PaymentOutcome } from "@/lib/services/ticket-payments";

export const runtime = "nodejs";

/** PayU sends the member's browser here after checkout (surl and furl); settle, then return them to the event. */
export async function POST(request: Request) {
  let outcome: PaymentOutcome = "pending";
  let eventId: string | undefined;
  try {
    const form = await readForm(request);
    // Only a result PayU signed may trigger a lookup; the lookup, not the post, decides what was paid.
    if (txnIdSchema.safeParse(form.txnid).success && verifyPayuResponseHash(form)) {
      eventId = form.udf1 || undefined;
      ({ outcome, eventId = eventId } = await settlePayuTransaction(form.txnid));
    } else {
      console.warn("[PayU] Return rejected: its hash did not verify");
    }
  } catch (error) {
    // PayU or the database is unreachable. The webhook settles it later, so the member sees it as pending.
    console.error("[PayU] Return could not be settled", error instanceof HttpError ? error.code : error instanceof Error ? error.message : "unknown");
  }
  const slug = eventId ? await getTicketEvent(eventId).then(event => event.slug, () => null) : null;
  const target = new URL(slug ? `/event/${encodeURIComponent(slug)}?payment=${outcome}` : "/account", siteOrigin(request));
  return new Response(null, { status: 303, headers: { Location: target.href, "Cache-Control": "private, no-store" } });
}
