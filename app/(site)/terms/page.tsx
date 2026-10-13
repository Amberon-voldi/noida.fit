import type { Metadata } from "next";
import {
  EFFECTIVE_DATE,
  LEGAL_ENTITY_DESCRIPTION,
  LEGAL_ENTITY_NAME,
  PRIVACY_CONTACT,
  REGISTERED_ADDRESS,
  TRADING_NAME,
} from "@/lib/privacy";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms for using NOIDA.FIT to discover fitness communities, activities and events.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-full">
      <header className="public-page-header border-b border-border-subtle px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight">Terms &amp; Conditions</h1>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="text-sm text-text-secondary">Effective date: {EFFECTIVE_DATE}</p>
        <div className="mt-10 space-y-10 leading-relaxed text-text-secondary">
          <section aria-labelledby="terms-who-we-are">
            <h2 id="terms-who-we-are" className="text-xl font-bold text-white">Who we are</h2>
            <p className="mt-3">NOIDA.FIT is operated by {LEGAL_ENTITY_NAME}, {LEGAL_ENTITY_DESCRIPTION}, trading as {TRADING_NAME}, {REGISTERED_ADDRESS}. These terms describe the current NOIDA.FIT discovery and participation features.</p>
          </section>

          <section aria-labelledby="terms-purpose">
            <h2 id="terms-purpose" className="text-xl font-bold text-white">Platform purpose</h2>
            <p className="mt-3">NOIDA.FIT helps people discover independent fitness communities, activities, places and events in Noida and Greater Noida. It is a discovery and participation platform. It is not a gym operator, medical provider, payment processor, ticketing service or booking intermediary.</p>
            <p className="mt-3">Listing prices are informational. An RSVP on NOIDA.FIT does not charge you, reserve paid inventory, or replace an organizer&apos;s payment or booking process.</p>
          </section>

          <section aria-labelledby="terms-account">
            <h2 id="terms-account" className="text-xl font-bold text-white">Accounts and responsibilities</h2>
            <p className="mt-3">You must be 18 or older, provide accurate account details, keep your password and session access private, and promptly report suspected unauthorized access. You are responsible for activity carried out through your account. Profiles start private, and you control the available public-profile and sharing settings.</p>
          </section>

          <section aria-labelledby="terms-listings">
            <h2 id="terms-listings" className="text-xl font-bold text-white">Listings and organizer information</h2>
            <p className="mt-3">Published activities, communities, places and events may be supplied or maintained through operator workflows. Organizer listing requests are reviewed by email and are not automatically published. A demo label means the listing is illustrative; it is not a confirmed gathering, partnership, verified attendance record or instruction to travel or pay.</p>
            <p className="mt-3">Schedules, meeting points, access rules, capacity, prices and availability can change. Check the listing and the organizer&apos;s own instructions before attending. NOIDA.FIT does not guarantee that a listing is current, complete, safe, available or suitable for you.</p>
          </section>

          <section aria-labelledby="terms-conduct">
            <h2 id="terms-conduct" className="text-xl font-bold text-white">Acceptable use</h2>
            <p className="mt-3">Do not use the platform to impersonate another person, submit misleading or unlawful information, probe or disrupt the service, bypass access controls, automate abusive requests, send spam, harass or threaten people, misuse participant QR codes, or expose another person&apos;s private information. Do not use a participant QR as a public entry ticket or post it publicly.</p>
          </section>

          <section aria-labelledby="terms-content">
            <h2 id="terms-content" className="text-xl font-bold text-white">Content and intellectual property</h2>
            <p className="mt-3">NOIDA.FIT and its original interface, branding and platform content are protected by applicable intellectual-property laws. You may use public pages for personal discovery and sharing through normal platform links. Do not copy, scrape, republish, sell or modify platform content in a way that misrepresents its source or the status of an organizer.</p>
            <p className="mt-3">If you send listing details or other material to the operator, you represent that you have permission to provide it and to request its review. The operator may edit, decline, unpublish or remove material that is inaccurate, unauthorized, unsafe, abusive or inconsistent with the platform.</p>
          </section>

          <section aria-labelledby="terms-third-party">
            <h2 id="terms-third-party" className="text-xl font-bold text-white">Organizers and third-party services</h2>
            <p className="mt-3">Events and communities are independent of NOIDA.FIT unless a separate written arrangement says otherwise. Organizers are responsible for their sessions, instructions, permissions, safety practices, pricing and fulfillment. An organizer who receives attendee information through NOIDA.FIT may use it only to operate the relevant event and must not copy, export, sell or share it outside that event. External services linked from the platform, including maps and social networks, have their own terms and privacy policies.</p>
          </section>

          <section aria-labelledby="terms-safety">
            <h2 id="terms-safety" className="text-xl font-bold text-white">Participation and personal safety</h2>
            <p className="mt-3">Consider your own health, ability, weather, route, equipment and local conditions before participating. NOIDA.FIT does not provide medical advice or determine whether an activity is appropriate for you. Follow organizer instructions and local rules, and do not attend a session that you cannot safely undertake.</p>
          </section>

          <section aria-labelledby="terms-access">
            <h2 id="terms-access" className="text-xl font-bold text-white">Availability, suspension and changes</h2>
            <p className="mt-3">The service may be unavailable, corrected, changed or discontinued as the platform develops. Access may be limited or suspended where necessary to protect users, the service, an investigation or the integrity of a listing. Where practical, the operator will provide an explanation through the available contact channel.</p>
          </section>

          <section aria-labelledby="terms-complaints">
            <h2 id="terms-complaints" className="text-xl font-bold text-white">Questions and complaints</h2>
            <p className="mt-3">For listing corrections, account questions or complaints, contact <a className="font-semibold text-velocity underline hover:text-velocity-glow" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a> with the relevant page link and details. Do not send passwords, participant QR codes or payment credentials by email.</p>
          </section>

          <section aria-labelledby="terms-law">
            <h2 id="terms-law" className="text-xl font-bold text-white">Governing law and contact</h2>
            <p className="mt-3">These terms are governed by the laws of India. Courts in Noida, Gautam Buddha Nagar, Uttar Pradesh have jurisdiction, subject to your legal rights.</p>
            <p className="mt-3">Contact: {LEGAL_ENTITY_NAME}, {LEGAL_ENTITY_DESCRIPTION}, trading as {TRADING_NAME}, {REGISTERED_ADDRESS}; <a className="font-semibold text-velocity underline hover:text-velocity-glow" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.</p>
          </section>
        </div>
      </article>
    </div>
  );
}
