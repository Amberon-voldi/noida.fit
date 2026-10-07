import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Organizers",
  description:
    "Share your Noida fitness community or event for a directory listing review. Find out what details to include and how existing organizers access check-in tools.",
  alternates: { canonical: "/for-organizers" },
};

const STEPS = [
  {
    number: "01",
    title: "Send the details",
    description:
      "Email your community name, activity, meeting schedule, exact location and a contact link. The button below opens your email app; it is not an online submission form.",
  },
  {
    number: "02",
    title: "Request a review",
    description:
      "Include permission to publish your details and clarify costs, access rules and who is welcome. A request is not an automatic approval or verified badge.",
  },
  {
    number: "03",
    title: "Keep details current",
    description:
      "Once a listing is published, share its page with your group and send corrections when meeting times or locations change. No publishing deadline is guaranteed.",
  },
];

const FAQS = [
  {
    q: "Is listing on NOIDA.FIT free?",
    a: "There is no payment or checkout in the listing-request flow. Session fees, if any, are set by organizers and should be stated clearly in their listings.",
  },
  {
    q: "What kind of communities can list?",
    a: "Any outdoor or community-based fitness group in Noida or Greater Noida — running clubs, cycling crews, calisthenics groups, sports teams, yoga circles, and more.",
  },
  {
    q: "Can I list individual events too?",
    a: "You can send an event for review. Include the date, start and end times in IST, meeting point, capacity, price and host contact. Emailing a request does not immediately publish it.",
  },
  {
    q: "How do I get a Verified badge?",
    a: "A listing request does not grant verification. Only a community explicitly marked verified has that status; demo groups are not verified partners.",
  },
  {
    q: "Can I update my listing?",
    a: "Email hello@noida.fit with the page URL and the correction. Self-serve listing editing is not available. Existing authorized organizers can use the check-in tool, which does not edit listing content.",
  },
];

export default function ForOrganizersPage() {
  return (
    <div className="min-h-full">
      <header className="public-page-header border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold tracking-tight">For organizers</h1>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Link
                href="mailto:hello@noida.fit?subject=List My Community on NOIDA.FIT"
                id="organizer-submit-cta"
                className="button-primary"
              >
                Email a listing request
              </Link>
              <a
                href="#faq"
                className="button-secondary"
              >
                Read FAQ
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">Send listing details for review, not automatic publication. Sample listings are not partnerships or confirmed sessions.</p>
        {/* How It Works */}
        <section aria-labelledby="how-it-works-heading">
          <h2
            id="how-it-works-heading"
            className="text-2xl font-extrabold text-white tracking-tight mb-10"
            style={{ letterSpacing: "-0.025em" }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col gap-4">
                <div className="h-12 w-12 rounded-xl bg-velocity/10 border border-velocity/30 flex items-center justify-center">
                  <span className="font-mono text-sm font-bold text-velocity">{step.number}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What you get */}
        <section aria-labelledby="benefits-heading">
          <h2
            id="benefits-heading"
            className="text-2xl font-extrabold text-white tracking-tight mb-10"
            style={{ letterSpacing: "-0.025em" }}
          >
            What you get
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                emoji: "📄",
                title: "Dedicated Community Page",
                desc: "Full profile with your schedule, captains, about section, and upcoming events.",
              },
              {
                emoji: "🔍",
                title: "Organic Discovery",
                desc: "Published listings appear in directory search and activity pages with shareable links.",
              },
              {
                emoji: "✓",
                title: "Clear first-visit details",
                desc: "Share the pace, equipment, access rules and costs a newcomer needs to know.",
              },
              {
                emoji: "📅",
                title: "Events Listing",
                desc: "Published sessions can be found by activity, date and sector. Homepage placement is not guaranteed.",
              },
            ].map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border border-border-subtle bg-surface p-6 flex gap-4"
              >
                <span className="text-2xl flex-shrink-0" aria-hidden="true">{benefit.emoji}</span>
                <div>
                  <h3 className="text-base font-bold text-white">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            className="text-2xl font-extrabold text-white tracking-tight mb-10"
            style={{ letterSpacing: "-0.025em" }}
          >
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
            {FAQS.map((faq, i) => (
              <details key={i} className="group px-6 py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-white list-none">
                  {faq.q}
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-text-muted group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-4">Ready to reach Noida fitness seekers?</p>
          <p className="text-text-secondary mb-8">Send the details for review. No automatic publication or response time is promised.</p>
          <Link
            href="mailto:hello@noida.fit?subject=List My Community on NOIDA.FIT"
            className="inline-flex items-center gap-2 rounded-lg bg-velocity px-8 py-3.5 text-base font-bold text-slate-950 hover:bg-velocity-glow transition-colors"
          >
            Email hello@noida.fit
          </Link>
          <p className="mt-6 text-sm text-text-secondary">Already authorized to host an event? <Link href="/organizer" className="inline-flex min-h-11 items-center font-semibold text-velocity">Open organizer check-in →</Link></p>
        </div>
      </div>
    </div>
  );
}
