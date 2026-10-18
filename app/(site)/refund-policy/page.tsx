import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { PRIVACY_CONTACT } from "@/lib/privacy";

const REFUND_EFFECTIVE_DATE = "18 October 2026";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "How cancellations, refund requests and booking-related disputes are handled for events and activities listed on NOIDA.FIT.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-full">
      <header className="public-page-header border-b border-border-subtle px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight">Refund &amp; Cancellation Policy</h1>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="text-sm text-text-secondary">Effective date: {REFUND_EFFECTIVE_DATE}</p>
        <aside aria-labelledby="refund-help-heading" className="mt-8 flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="refund-help-heading" className="text-base font-bold text-white">Need help with a refund or cancellation?</h2>
            <p className="mt-1 text-sm text-text-secondary">Email us with your booking ID and transaction reference.</p>
          </div>
          <a href={`mailto:${PRIVACY_CONTACT}?subject=${encodeURIComponent("Refund / cancellation request")}`} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-velocity px-5 text-sm font-semibold text-slate-950 hover:bg-velocity-glow sm:self-auto"><Mail size={16} aria-hidden="true" />{PRIVACY_CONTACT}</a>
        </aside>
        <div className="mt-10 space-y-10 leading-relaxed text-text-secondary">
          <section aria-labelledby="refund-overview">
            <h2 id="refund-overview" className="text-xl font-bold text-white">1. Overview</h2>
            <p className="mt-3">Welcome to Noida.fit. This Refund &amp; Cancellation Policy governs cancellations, refund requests, and booking-related disputes for events, activities, experiences, and other offerings listed on the Noida.fit platform.</p>
            <p className="mt-3">By booking or purchasing a ticket through Noida.fit, you agree to this policy and any additional event-specific terms communicated by the event organizer at the time of booking.</p>
          </section>

          <section aria-labelledby="refund-organizer-policy">
            <h2 id="refund-organizer-policy" className="text-xl font-bold text-white">2. Event Organizer&apos;s Refund Policy</h2>
            <p className="mt-3">Each event listed on Noida.fit may have its own cancellation and refund terms, depending on the nature of the event and the organizer&apos;s policies.</p>
            <p className="mt-3"><strong className="text-white">All refund and cancellation requests are subject to review and approval by the respective event organizer, unless applicable law requires otherwise.</strong> Submitting a refund request does not guarantee approval. The organizer will assess each request based on the event&apos;s specific terms, the reason for cancellation, the timing of the request, and other relevant circumstances.</p>
          </section>

          <section aria-labelledby="refund-customer-cancellations">
            <h2 id="refund-customer-cancellations" className="text-xl font-bold text-white">3. Customer-Initiated Cancellations</h2>
            <p className="mt-3">Customers who wish to cancel a booking must submit a refund or cancellation request through the designated Noida.fit support channel or the method specified for the event.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Refund requests must include the booking details and the reason for cancellation.</li>
              <li>The event organizer will review the request and decide whether a refund is eligible under the applicable event policy and law.</li>
              <li>Requests submitted close to the event date, after the event has started, or after it has concluded may be declined where permitted by the applicable terms and law.</li>
              <li>Certain bookings may be non-refundable if this condition was clearly disclosed before purchase and is legally permissible.</li>
              <li>Customers should not assume that a booking has been cancelled until confirmation is provided.</li>
            </ul>
          </section>

          <section aria-labelledby="refund-event-cancellation">
            <h2 id="refund-event-cancellation" className="text-xl font-bold text-white">4. Event Cancellation or Postponement</h2>
            <p className="mt-3">If an event is cancelled, postponed, rescheduled, or materially changed by the organizer, the organizer will determine the appropriate resolution in accordance with the event&apos;s published terms and applicable law. Depending on the circumstances, the resolution may include:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>A full or partial refund.</li>
              <li>An alternative event date or rescheduled booking.</li>
              <li>Credit or an alternative arrangement, where offered and accepted by the customer.</li>
            </ul>
            <p className="mt-3">Where a refund is due, the applicable refund amount and processing arrangements will be communicated to the customer. Noida.fit may assist with communication and coordination between the customer and organizer. Any organizer decision remains subject to applicable consumer protection laws and other legal obligations.</p>
          </section>

          <section aria-labelledby="refund-how-to-request">
            <h2 id="refund-how-to-request" className="text-xl font-bold text-white">5. How to Request a Refund</h2>
            <p className="mt-3">To request a cancellation or refund:</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Contact Noida.fit through its designated support channel.</li>
              <li>Provide your booking ID, event name, registered contact details, and reason for the request.</li>
              <li>Noida.fit may forward the request to the relevant organizer for review.</li>
              <li>The organizer will assess the request and communicate the decision, or Noida.fit will relay the decision where applicable.</li>
              <li>If approved, the refund will be initiated through the applicable payment method or payment provider.</li>
            </ol>
            <p className="mt-3">Customers may be asked to provide additional information where reasonably necessary to process the request.</p>
          </section>

          <section aria-labelledby="refund-processing-time">
            <h2 id="refund-processing-time" className="text-xl font-bold text-white">6. Refund Processing Time</h2>
            <p className="mt-3">Once a refund is approved, the time required for the amount to appear in the customer&apos;s account may depend on the payment gateway, bank, card issuer, or other payment provider. Any estimated processing timeline communicated by Noida.fit or the payment provider is indicative and may vary due to banking or payment-network procedures. Customers will be informed of the refund status where the relevant information is available.</p>
          </section>

          <section aria-labelledby="refund-fees">
            <h2 id="refund-fees" className="text-xl font-bold text-white">7. Convenience Fees and Payment Charges</h2>
            <p className="mt-3">Any booking fee, platform fee, convenience fee, or payment-processing charge will be treated according to the terms disclosed before the transaction and applicable law. Such fees will not automatically be treated as non-refundable in every situation. Their refundability will depend on the disclosed terms, the circumstances of cancellation, and applicable legal requirements.</p>
          </section>

          <section aria-labelledby="refund-duplicate">
            <h2 id="refund-duplicate" className="text-xl font-bold text-white">8. Duplicate or Failed Transactions</h2>
            <p className="mt-3">If a customer is charged more than once for the same booking or a payment is deducted without a corresponding confirmed booking, the customer should contact Noida.fit support with the transaction reference and relevant payment details. The transaction will be reviewed with the payment provider or organizer, where necessary. Verified duplicate or unsuccessful transactions will be handled in accordance with the applicable payment-provider process and law.</p>
          </section>

          <section aria-labelledby="refund-organizer-responsibilities">
            <h2 id="refund-organizer-responsibilities" className="text-xl font-bold text-white">9. Organizer Responsibilities</h2>
            <p className="mt-3">Event organizers are responsible for providing accurate event information, communicating applicable cancellation terms, reviewing refund requests fairly, and fulfilling their obligations to customers. Organizers must not use their approval authority to avoid refunds or other remedies required by applicable law.</p>
            <p className="mt-3">Noida.fit may assist in facilitating communication and resolving booking-related concerns but does not guarantee approval of every refund request.</p>
          </section>

          <section aria-labelledby="refund-platform-role">
            <h2 id="refund-platform-role" className="text-xl font-bold text-white">10. Noida.fit&apos;s Role</h2>
            <p className="mt-3">Noida.fit provides a platform for discovering and booking events, activities, and experiences offered by organizers. Unless expressly stated otherwise for a particular offering, the organizer is responsible for the event&apos;s delivery and for decisions concerning cancellation or refund requests, subject to applicable law and the terms presented to the customer.</p>
            <p className="mt-3">No provision of this policy limits any consumer rights or statutory remedies that cannot lawfully be excluded.</p>
          </section>

          <section aria-labelledby="refund-contact">
            <h2 id="refund-contact" className="text-xl font-bold text-white">11. Contact and Support</h2>
            <p className="mt-3">For refund or cancellation assistance, customers should contact Noida.fit through the official contact details published on the platform or the support channel provided in their booking confirmation. Please include your booking ID and transaction reference to help us review your request efficiently.</p>
            <p className="mt-3">Email: <a className="font-semibold text-velocity underline hover:text-velocity-glow" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>. Do not send passwords or full card details by email.</p>
          </section>

          <section aria-labelledby="refund-updates">
            <h2 id="refund-updates" className="text-xl font-bold text-white">12. Policy Updates</h2>
            <p className="mt-3">Noida.fit may update this policy from time to time. The version applicable to a booking will be interpreted alongside the terms communicated at the time of purchase and any mandatory legal requirements.</p>
          </section>
        </div>
      </article>
    </div>
  );
}
