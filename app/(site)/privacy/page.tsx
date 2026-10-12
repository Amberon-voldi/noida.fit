import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How NOIDA.FIT handles account, profile, participation and privacy information.",
  alternates: { canonical: "/privacy" },
};

const EFFECTIVE_DATE = "13 October 2026";

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
          <section aria-labelledby="privacy-scope">
            <h2 id="privacy-scope" className="text-xl font-bold text-white">About this policy</h2>
            <p className="mt-3">NOIDA.FIT is operated by Dot Fit Network, based in Noida. This policy describes the information processed by NOIDA.FIT, a discovery and participation platform for fitness communities and activities in Noida and Greater Noida. It reflects the features currently available on the website. It should be reviewed by a qualified privacy professional before publication.</p>
          </section>

          <section aria-labelledby="privacy-collect">
            <h2 id="privacy-collect" className="text-xl font-bold text-white">Information we process</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong className="text-white">Account information:</strong> name, email address, password submitted to create or access an account, and the Appwrite account identifier used internally to manage that account.</li>
              <li><strong className="text-white">Profile information:</strong> username, display name, city, optional bio, Fitness ID, member-since date, profile visibility and separate choices about sharing activity totals or followed communities.</li>
              <li><strong className="text-white">Participation information:</strong> saved listings, followed communities, event RSVPs, assigned RSVP seats, attendance records verified by an authorized organizer, and derived participation totals.</li>
              <li><strong className="text-white">Organizer and administrator information:</strong> operational information needed to authorize event check-in or administer published content. Administrative actions may include an operational reason in the audit record.</li>
              <li><strong className="text-white">Technical information:</strong> session-cookie information needed to keep you signed in and ordinary server request information needed to protect the service and diagnose failures. The application does not currently use a marketing analytics SDK.</li>
              <li><strong className="text-white">Camera input:</strong> an organizer may grant browser camera access to scan a participant QR code. Camera frames are processed on that device for scanning; the application does not use browser geolocation.</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-use">
            <h2 id="privacy-use" className="text-xl font-bold text-white">How information is used</h2>
            <p className="mt-3">Information is used to create and secure accounts, display the profile choices you make, provide saves, follows and RSVPs, allocate event seats, issue short-lived participant check-in codes, verify attendance through an authorized organizer, operate administrative tools, respond to listing requests sent by email, and protect the website from misuse.</p>
          </section>

          <section aria-labelledby="privacy-sharing">
            <h2 id="privacy-sharing" className="text-xl font-bold text-white">Profiles, sharing and service providers</h2>
            <p className="mt-3">Profiles start private. If you opt into a public profile, the public view may include the display name, username, city, bio, Fitness ID and member-since date. Activity totals and followed communities are separate choices. Email, saved plans, RSVP history, detailed history, account identifiers and private settings are not included in the public profile view.</p>
            <p className="mt-3">The application uses Appwrite for account and database services. The documented deployment uses Cloudflare Workers with OpenNext. External links may take you to services such as Google Maps or Instagram; those services have their own policies. NOIDA.FIT does not currently connect Strava, Apple Health, Cult.fit or FITPASS accounts.</p>
          </section>

          <section aria-labelledby="privacy-cookies">
            <h2 id="privacy-cookies" className="text-xl font-bold text-white">Cookies and local choices</h2>
            <p className="mt-3">The site uses an HttpOnly session cookie to maintain an authenticated Appwrite session. It also uses browser state for interface behavior such as open sections or motion preferences where a feature requires it. No advertising or cross-site tracking cookie has been identified in the current implementation.</p>
          </section>

          <section aria-labelledby="privacy-retention">
            <h2 id="privacy-retention" className="text-xl font-bold text-white">Storage, security and retention</h2>
            <p className="mt-3">Account and participation records are stored in the configured Appwrite project. The application applies server-side validation, owner-based access checks, private-by-default profile settings, secure production session cookies and bounded request handling. These measures do not mean that any system is risk-free.</p>
            <p className="mt-3">A complete retention schedule, account deletion workflow and confirmed data-location description have not been supplied for this deployment. <strong className="text-white">Owner action required:</strong> add those details, including how identity, participation, check-in and audit records are handled after an account or listing is closed, before publishing this policy.</p>
          </section>

          <section aria-labelledby="privacy-rights">
            <h2 id="privacy-rights" className="text-xl font-bold text-white">Your choices and requests</h2>
            <p className="mt-3">You can keep your profile private, separately control public activity and community sharing, and update available profile settings from your account. You may contact <a className="font-semibold text-velocity underline hover:text-velocity-glow" href="mailto:hello@noida.fit">hello@noida.fit</a> with a privacy question or request. Please include enough context for the operator to identify the relevant account without sending a password or session code.</p>
            <p className="mt-3"><strong className="text-white">Owner action required:</strong> supply the full business or registered address and confirm the applicable jurisdiction, grievance procedure and designated contact if required, identity-verification process and response timelines before publication.</p>
          </section>

          <section aria-labelledby="privacy-changes">
            <h2 id="privacy-changes" className="text-xl font-bold text-white">Changes to this policy</h2>
            <p className="mt-3">If the information practices or available controls change, this page should be updated with a new effective date and reviewed before the change is released.</p>
          </section>
        </div>
      </article>
    </div>
  );
}
