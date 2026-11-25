import Link from "next/link";
import type { TicketTier } from "@/lib/ticket-tiers";
import { formatInr } from "@/lib/pricing";
import { LEGAL_ENTITY_DESCRIPTION, LEGAL_ENTITY_NAME, LEGAL_PHONE, PRIVACY_CONTACT, REGISTERED_ADDRESS } from "@/lib/privacy";

interface Props {
  priceLabel: string;
  capacity?: number;
  communityName: string;
  communitySlug: string;
  tiers?: TicketTier[];
}

const linkClass = "font-semibold text-velocity underline hover:text-velocity-glow";

/**
 * What a paid event's buyer should know before paying: the ticket on sale and its price, who runs the
 * event and who to contact, and the terms and refund policy that apply. Shown on every paid listing.
 */
export function EventBookingInfo({ priceLabel, capacity, communityName, communitySlug, tiers = [] }: Props) {
  const rows = tiers.length ? tiers.map(tier => ({ key: tier.id, name: tier.name, description: tier.description, price: formatInr(tier.price * 100) })) : [{ key: "general", name: "General entry", description: undefined, price: priceLabel }];
  return (
    <>
      <section aria-labelledby="tickets-heading">
        <h2 id="tickets-heading" className="text-xl font-bold">Tickets</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border-subtle">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-text-secondary">
              <tr><th scope="col" className="px-4 py-3">Ticket</th><th scope="col" className="px-4 py-3 text-right">Price</th></tr>
            </thead>
            <tbody>
              {rows.map(row => <tr key={row.key} className="border-t border-border-subtle">
                <th scope="row" className="px-4 py-3 align-top font-semibold">{row.name}{row.description && <span className="mt-0.5 block text-xs font-normal text-text-secondary">{row.description}</span>}</th>
                <td className="px-4 py-3 text-right align-top font-semibold">{row.price}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {typeof capacity === "number" && <p className="mt-2 text-xs text-text-secondary">{capacity} spots</p>}
      </section>

      <section aria-labelledby="organiser-heading">
        <h2 id="organiser-heading" className="text-xl font-bold">Organiser &amp; contact</h2>
        <dl className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">
          <div><dt className="font-semibold text-white">Event organiser</dt><dd><Link href={`/community/${communitySlug}`} className={linkClass}>{communityName}</Link></dd></div>
          <div><dt className="font-semibold text-white">Sold by</dt><dd>NOIDA.FIT ({LEGAL_ENTITY_NAME}, {LEGAL_ENTITY_DESCRIPTION}), {REGISTERED_ADDRESS}</dd></div>
          <div><dt className="font-semibold text-white">Contact</dt><dd><a href={`mailto:${PRIVACY_CONTACT}`} className={linkClass}>{PRIVACY_CONTACT}</a> · <a href={`tel:+91${LEGAL_PHONE}`} className={linkClass}>+91 {LEGAL_PHONE}</a></dd></div>
        </dl>
      </section>

      <section aria-labelledby="ticket-terms-heading">
        <h2 id="ticket-terms-heading" className="text-xl font-bold">Terms, refunds &amp; cancellation</h2>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/terms" className={linkClass}>Terms &amp; Conditions</Link>
          <Link href="/refund-policy" className={linkClass}>Refund &amp; Cancellation Policy</Link>
        </p>
      </section>
    </>
  );
}
