import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Organizers",
  description:
    "List your fitness community or event on NOIDA.FIT for free. Reach hundreds of active fitness seekers across Noida & Greater Noida.",
  alternates: { canonical: "/for-organizers" },
};

const STEPS = [
  {
    number: "01",
    title: "Fill the form",
    description:
      "Share your community's name, activity type, meeting schedule, and location. Takes 5 minutes.",
  },
  {
    number: "02",
    title: "We verify",
    description:
      "Our team manually reviews every submission for quality. Active communities get verified badges.",
  },
  {
    number: "03",
    title: "You're live",
    description:
      "Your community page goes live within 48 hours. Discoverable by hundreds of Noida fitness seekers.",
  },
];

const FAQS = [
  {
    q: "Is listing on NOIDA.FIT free?",
    a: "Yes, completely free. NOIDA.FIT is a community platform, not a marketplace. We do not take any commission or listing fees.",
  },
  {
    q: "What kind of communities can list?",
    a: "Any outdoor or community-based fitness group in Noida or Greater Noida — running clubs, cycling crews, calisthenics groups, sports teams, yoga circles, and more.",
  },
  {
    q: "Can I list individual events too?",
    a: "Yes. If you organise a fitness event or race in Noida, you can submit it for listing under Events. It's free and reaches our entire audience.",
  },
  {
    q: "How do I get a Verified badge?",
    a: "Verified badges are granted to communities that have been active for at least 3 months, have a consistent weekly schedule, and are manually reviewed by our team.",
  },
  {
    q: "Can I update my listing?",
    a: "Yes. Email us at hello@noida.fit and we'll update your page within 24 hours. A self-serve dashboard is on our product roadmap.",
  },
];

export default function ForOrganizersPage() {
  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="bg-surface border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-velocity">
              For Organizers
            </span>
            <h1
              className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight"
              style={{ letterSpacing: "-0.035em" }}
            >
              You organize,
              <br />
              <span className="text-velocity">we amplify.</span>
            </h1>
            <p className="mt-5 text-lg text-text-secondary leading-relaxed max-w-xl">
              List your fitness community or event on NOIDA.FIT for free. Reach hundreds
              of active fitness seekers across Noida and Greater Noida — no fees, no
              friction.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="mailto:hello@noida.fit?subject=List My Community on NOIDA.FIT"
                id="organizer-submit-cta"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-velocity px-8 py-3.5 text-base font-bold text-slate-950 hover:bg-velocity-glow transition-colors"
              >
                Submit Your Community
              </Link>
              <a
                href="#faq"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-8 py-3.5 text-base font-bold text-white hover:bg-surface-hover transition-colors"
              >
                Read FAQ
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-20">
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
                desc: "Listed in Noida fitness search results, category pages, and the weekly Discover feed.",
              },
              {
                emoji: "✓",
                title: "Verified Badge",
                desc: "Earn credibility and trust with a manually granted verification badge.",
              },
              {
                emoji: "📅",
                title: "Events Listing",
                desc: "Your community's events featured on the homepage, events page, and category feeds.",
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
          <p className="text-text-secondary mb-8">Send us an email and we&apos;ll have you live within 48 hours.</p>
          <Link
            href="mailto:hello@noida.fit?subject=List My Community on NOIDA.FIT"
            className="inline-flex items-center gap-2 rounded-lg bg-velocity px-8 py-3.5 text-base font-bold text-slate-950 hover:bg-velocity-glow transition-colors"
          >
            Email hello@noida.fit
          </Link>
        </div>
      </div>
    </div>
  );
}
