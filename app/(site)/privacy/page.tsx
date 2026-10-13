import type { Metadata } from "next";
import {
  COOKIE_DISCLOSURE,
  DATA_STORAGE_REGION,
  EFFECTIVE_DATE,
  LEGAL_ENTITY_DESCRIPTION,
  LEGAL_ENTITY_NAME,
  PRIVACY_CONTACT,
  REGISTERED_ADDRESS,
  TRADING_NAME,
} from "@/lib/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How NOIDA.FIT handles account, profile, participation and privacy information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full">
      <header className="public-page-header border-b border-border-subtle px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="text-sm text-text-secondary">Effective date: {EFFECTIVE_DATE}</p>
        <div className="mt-10 space-y-10 leading-relaxed text-text-secondary">
          <section aria-labelledby="privacy-who-we-are">
            <h2 id="privacy-who-we-are" className="text-xl font-bold text-white">1. Who we are</h2>
            <p className="mt-3">NOIDA.FIT is operated by {LEGAL_ENTITY_NAME}, {LEGAL_ENTITY_DESCRIPTION}, trading as {TRADING_NAME}, {REGISTERED_ADDRESS}. We run a discovery and participation platform for fitness communities and activities in Noida and Greater Noida. In this policy, we, us and our mean {LEGAL_ENTITY_NAME}. You means anyone who uses NOIDA.FIT.</p>
            <p className="mt-3">For privacy questions or requests, contact our privacy contact at <a className="font-semibold text-velocity underline hover:text-velocity-glow" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.</p>
          </section>

          <section aria-labelledby="privacy-age">
            <h2 id="privacy-age" className="text-xl font-bold text-white">2. Who can use NOIDA.FIT</h2>
            <p className="mt-3">NOIDA.FIT is intended for people who are 18 or older. The current signup flow does not ask for or verify age or date of birth. We do not knowingly collect personal data from anyone under 18. If you believe a child has created an account, contact us at <a className="font-semibold text-velocity underline hover:text-velocity-glow" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.</p>
          </section>

          <section aria-labelledby="privacy-collect">
            <h2 id="privacy-collect" className="text-xl font-bold text-white">3. What information we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong className="text-white">Account information:</strong> your name, email address and password used to create or access an account, and an internal account identifier from our account provider, Appwrite. Appwrite handles password storage and authentication; the website does not display your password.</li>
              <li><strong className="text-white">Profile information:</strong> username, display name, city, optional bio, your Fitness ID, member-since date, your profile visibility setting, and your separate choices about sharing activity totals and followed communities.</li>
              <li><strong className="text-white">Participation information:</strong> listings you save, communities you follow, event RSVPs, assigned RSVP seats, attendance records verified by an authorized organizer, and totals derived from them.</li>
              <li><strong className="text-white">Organizer and administrator information:</strong> information needed to authorize event check-in or manage published content. Administrative actions may be recorded in an audit log, sometimes with an operational reason.</li>
              <li><strong className="text-white">Technical information:</strong> a session cookie that keeps you signed in, and ordinary server request information used to protect the service and diagnose failures.</li>
              <li><strong className="text-white">Camera input:</strong> if you are an organizer, your browser may ask for camera access so you can scan a participant QR code. Camera frames are processed on your device for scanning and are not stored by us.</li>
              <li>We do not use browser geolocation.</li>
              <li>We do not currently use advertising, analytics or cross-site tracking tools.</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-use">
            <h2 id="privacy-use" className="text-xl font-bold text-white">4. Why we use your information</h2>
            <p className="mt-3">We use your information to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>create and secure your account;</li>
              <li>show the profile choices you make;</li>
              <li>provide saves, follows and RSVPs;</li>
              <li>allocate event seats and issue short-lived check-in codes;</li>
              <li>verify attendance through an authorized organizer and build your private participation record;</li>
              <li>run administrative tools and keep the service safe; and</li>
              <li>respond to listing requests and messages you send us.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data and do not currently share it with sponsors or advertisers.</p>
          </section>

          <section aria-labelledby="privacy-consent">
            <h2 id="privacy-consent" className="text-xl font-bold text-white">5. Consent</h2>
            <p className="mt-3">The current signup flow does not display a separate unticked Privacy Policy consent checkbox or store a policy version and consent date. We process account and participation information to provide the features you request, operate the service and keep it secure. Where applicable law requires a separate consent choice, we will request it before using information for that purpose.</p>
            <p className="mt-3">You can withdraw a permission or ask us to stop processing information where applicable by contacting <a className="font-semibold text-velocity underline hover:text-velocity-glow" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>. This may mean we can no longer provide features that depend on the information, such as RSVPs and check-in.</p>
          </section>

          <section aria-labelledby="privacy-sharing">
            <h2 id="privacy-sharing" className="text-xl font-bold text-white">6. Profiles, sharing and who sees what</h2>
            <p className="mt-3">Profiles are private by default. If you choose a public profile, others can see your display name, username, city, bio, Fitness ID and member-since date. Activity totals and followed communities are shared only if you separately choose to share them.</p>
            <p className="mt-3">Your email, saved plans, RSVP history, detailed history, account identifiers and private settings are never shown on your public profile.</p>
            <p className="mt-3"><strong className="text-white">Organizers.</strong> When you RSVP to an event, the assigned organizer or venue operator can see the information needed to verify your RSVP and record your attendance, including your display name and RSVP or check-in status for that event. Organizers may use this information only for that event and must not copy, export, sell or share it outside the event’s operation.</p>
          </section>

          <section aria-labelledby="privacy-providers">
            <h2 id="privacy-providers" className="text-xl font-bold text-white">7. Service providers and where data is stored</h2>
            <p className="mt-3">We use Appwrite for account and database services, and Cloudflare to host the site. Your data is stored in the Appwrite region {DATA_STORAGE_REGION}. We share data with these providers only so they can run the service for us. Links on NOIDA.FIT may take you to other services such as Google Maps or Instagram, which have their own policies. We do not currently connect Strava, Apple Health, Cult.fit or FITPASS accounts.</p>
          </section>

          <section aria-labelledby="privacy-cookies">
            <h2 id="privacy-cookies" className="text-xl font-bold text-white">8. Cookies</h2>
            <p className="mt-3">{COOKIE_DISCLOSURE} The cookie banner stores only its dismissal choice in browser local storage, not in a cookie. We also use browser state for interface preferences such as reduced-motion behavior where a feature requires it. If this changes, we will update this policy before introducing the new category of tracking or advertising technology.</p>
          </section>

          <section aria-labelledby="privacy-retention">
            <h2 id="privacy-retention" className="text-xl font-bold text-white">9. How long we keep your information</h2>
            <p className="mt-3">The current deployment does not publish fixed retention periods or automatically delete inactive accounts. The following describes the current operational position:</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border-subtle">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <thead className="border-b border-border-subtle bg-surface text-white">
                  <tr><th scope="col" className="px-4 py-3 font-semibold">Information</th><th scope="col" className="px-4 py-3 font-semibold">Current position</th></tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr><th scope="row" className="px-4 py-3 font-medium text-white">Account and profile information</th><td className="px-4 py-3">Stored while the account is active. There is no self-service deletion control or published post-deletion period; send a request to {PRIVACY_CONTACT}.</td></tr>
                  <tr><th scope="row" className="px-4 py-3 font-medium text-white">RSVPs and participation records</th><td className="px-4 py-3">Stored as account participation records while the service uses them. No fixed deletion or anonymization period is currently published.</td></tr>
                  <tr><th scope="row" className="px-4 py-3 font-medium text-white">Attendance records</th><td className="px-4 py-3">Stored as verified event check-ins and used to build the private participation record. No fixed retention period is currently published.</td></tr>
                  <tr><th scope="row" className="px-4 py-3 font-medium text-white">Audit logs</th><td className="px-4 py-3">Kept for security and accountability. No fixed retention period is currently published.</td></tr>
                  <tr><th scope="row" className="px-4 py-3 font-medium text-white">Server and error logs</th><td className="px-4 py-3">Ordinary operational logs may be handled by the hosting and service providers. The website does not publish a fixed period for these logs.</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">Account deletion and retention requests can be made by email. The current website does not promise a fixed completion period for manual requests.</p>
          </section>

          <section aria-labelledby="privacy-rights">
            <h2 id="privacy-rights" className="text-xl font-bold text-white">10. Your rights and choices</h2>
            <p className="mt-3">Depending on applicable law, you can:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>see and update your profile information in your account;</li>
              <li>keep your profile private and control what is public;</li>
              <li>ask us for a summary of the personal data we hold about you and how we use it;</li>
              <li>ask us to correct or complete your information;</li>
              <li>ask us to delete your account and personal data;</li>
              <li>withdraw your consent or request that applicable processing stop;</li>
              <li>nominate another person to exercise your rights if you die or cannot act for yourself; and</li>
              <li>make a complaint.</li>
            </ul>
            <p className="mt-3">Email <a className="font-semibold text-velocity underline hover:text-velocity-glow" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a> from the address on your account. Do not send passwords or session codes. We may ask you to confirm your identity before acting on a request. The website does not currently publish a fixed response period; we will respond within the time required by applicable law.</p>
            <p className="mt-3">If we do not resolve your complaint, you may complain to the Data Protection Board of India, as provided by applicable law.</p>
          </section>

          <section aria-labelledby="privacy-security">
            <h2 id="privacy-security" className="text-xl font-bold text-white">11. Security</h2>
            <p className="mt-3">We use server-side validation, owner-based access checks, private-by-default settings, secure session cookies and limits on request volume. No system is completely risk-free. If a personal data breach affects you, we will tell you and the authorities as the law requires, without unreasonable delay.</p>
          </section>

          <section aria-labelledby="privacy-changes">
            <h2 id="privacy-changes" className="text-xl font-bold text-white">12. Changes to this policy</h2>
            <p className="mt-3">If we change how we use data or add features that collect new data, such as payments, photos, location or a mobile app, we will update this policy and its effective date, and ask for fresh consent where the law requires it.</p>
          </section>

          <section aria-labelledby="privacy-law">
            <h2 id="privacy-law" className="text-xl font-bold text-white">13. Governing law and contact</h2>
            <p className="mt-3">This policy is governed by the laws of India. Courts in Noida, Gautam Buddha Nagar, Uttar Pradesh have jurisdiction, subject to your legal rights.</p>
            <p className="mt-3">Contact: {LEGAL_ENTITY_NAME}, {LEGAL_ENTITY_DESCRIPTION}, trading as {TRADING_NAME}, {REGISTERED_ADDRESS}; <a className="font-semibold text-velocity underline hover:text-velocity-glow" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.</p>
          </section>
        </div>
      </article>
    </div>
  );
}
