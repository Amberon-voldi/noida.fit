import Link from "next/link";
import { LEGAL_ENTITY_DESCRIPTION, LEGAL_ENTITY_NAME, LEGAL_PHONE, PRIVACY_CONTACT, REGISTERED_ADDRESS } from "@/lib/privacy";
import { TICKET_HOLD_MINUTES } from "@/lib/pricing";

interface Props {
  priceLabel: string;
  capacity?: number;
  communityName: string;
  communitySlug: string;
  payOnline: boolean;
}

const linkClass = "font-semibold text-velocity underline hover:text-velocity-glow";

/**
 * What a paid event's buyer should know before paying: the ticket on sale and its price, who runs the
 * event and who to contact, and the terms and refund policy that apply. Shown on every paid listing.
 */
export function EventBookingInfo({ priceLabel, capacity, communityName, communitySlug, payOnline }: Props) {
  return (
    <>
      <section aria-labelledby="tickets-heading">
        <h2 id="tickets-heading" className="text-xl font-bold">Tickets</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border-subtle">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-text-secondary">
              <tr><th scope="col" className="px-4 py-3">Category</th><th scope="col" className="px-4 py-3">Includes</th><th scope="col" className="px-4 py-3 text-right">Price</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-border-subtle">
                <th scope="row" className="px-4 py-3 font-semibold">General entry</th>
                <td className="px-4 py-3 text-text-secondary">Entry for one person to this session{typeof capacity === "number" ? ` (${capacity} spots in total)` : ""}</td>
                <td className="px-4 py-3 text-right font-semibold">{priceLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
          Price per person in Indian rupees. One ticket per account. {payOnline
            ? `Payment is processed securely by PayU. Your spot is held for ${TICKET_HOLD_MINUTES} minutes while you pay, and your ticket is confirmed once PayU confirms the payment.`
            : "Your ticket is confirmed once the payment is received."}
        </p>
      </section>

      <section aria-labelledby="organiser-heading">
        <h2 id="organiser-heading" className="text-xl font-bold">Organiser &amp; contact</h2>
        <dl className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">
          <div><dt className="font-semibold text-white">Event organiser</dt><dd><Link href={`/community/${communitySlug}`} className={linkClass}>{communityName}</Link></dd></div>
          <div><dt className="font-semibold text-white">Tickets sold by</dt><dd>NOIDA.FIT, operated by {LEGAL_ENTITY_NAME}, {LEGAL_ENTITY_DESCRIPTION}, {REGISTERED_ADDRESS}</dd></div>
          <div><dt className="font-semibold text-white">Booking help</dt><dd>Email <a href={`mailto:${PRIVACY_CONTACT}`} className={linkClass}>{PRIVACY_CONTACT}</a> or call <a href={`tel:+91${LEGAL_PHONE}`} className={linkClass}>+91 {LEGAL_PHONE}</a>. Please include your booking ID and payment reference.</dd></div>
        </dl>
      </section>

      <section aria-labelledby="ticket-terms-heading">
        <h2 id="ticket-terms-heading" className="text-xl font-bold">Terms, refunds &amp; cancellation</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
          <li>To cancel a booking or ask for a refund, email {PRIVACY_CONTACT} with your booking ID, the event name and the reason. Refund requests are reviewed by the event organiser.</li>
          <li>If the organiser cancels, postpones or materially changes the event, they will offer a resolution such as a full or partial refund or a new date.</li>
          <li>If you are charged twice, or charged without a confirmed ticket, contact us with the payment reference and we will resolve it with PayU.</li>
          <li>Approved refunds go back to the original payment method. The time for the amount to reach you depends on your bank or card issuer.</li>
        </ul>
        <p className="mt-3 text-sm text-text-secondary">
          By booking, you agree to the <Link href="/terms" className={linkClass}>Terms &amp; Conditions</Link> and the <Link href="/refund-policy" className={linkClass}>Refund &amp; Cancellation Policy</Link>.
        </p>
      </section>
    </>
  );
}
