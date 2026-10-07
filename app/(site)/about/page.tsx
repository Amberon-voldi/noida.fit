import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "NOIDA.FIT is the city-first fitness discovery and community platform for Noida & Greater Noida. Our philosophy: community before workout.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="min-h-full">
      <header className="public-page-header border-b border-border-subtle px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight">About</h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 space-y-14">
        {/* Mission */}
        <section aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="text-2xl font-bold text-white mb-5">Our Mission</h2>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              NOIDA.FIT exists for one reason: to make the fitness communities of Noida
              easier to find. Clear activity, sector and schedule information helps
              newcomers understand where a group meets and what to expect before
              their first visit.
            </p>
            <p>
              We are not a gym aggregator. We are not a fitness tracker. We are a
              <strong className="text-white"> city-first community discovery platform</strong> — a space where the
              running club you didn&apos;t know existed, the Saturday cycling crew, the
              bodyweight training group in the park, can find the people they deserve.
            </p>
          </div>
        </section>

        {/* Philosophy */}
        <section aria-labelledby="philosophy-heading">
          <h2 id="philosophy-heading" className="text-2xl font-bold text-white mb-5">
            Community Before Workout
          </h2>
          <blockquote className="border-l-2 border-velocity pl-6 mb-6">
            <p className="text-xl font-semibold text-white italic leading-relaxed">
              &ldquo;In Noida, people don&apos;t train despite the noise and chaos — they train together,
              in the early morning calm of a stadium track, on permitted local routes,
              in a park that smells like wet earth and chai.&rdquo;
            </p>
          </blockquote>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              NOIDA.FIT&apos;s core philosophy is simple: the run is just the excuse.
              The real value — the accountability, the friendship, the habit — comes from
              the people you show up with.
            </p>
            <p>
              We are not building a platform where you track your own performance in
              isolation. We are building a platform where you discover <em className="text-white">other people</em>
              already showing up, and learn how to show up with them.
            </p>
          </div>
        </section>

        {/* What we cover */}
        <section aria-labelledby="scope-heading">
          <h2 id="scope-heading" className="text-2xl font-bold text-white mb-5">
            What We Cover (V1)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { emoji: "🏃", label: "Running clubs & crews" },
              { emoji: "🚴", label: "Cycling groups & pelotons" },
              { emoji: "💪", label: "Outdoor calisthenics & strength" },
              { emoji: "🏸", label: "Recreational sports groups" },
              { emoji: "🧘", label: "Wellness & mobility circles" },
              { emoji: "🌿", label: "Trail running & nature hikes" },
              { emoji: "📍", label: "Parks, tracks & training venues" },
              { emoji: "📅", label: "Open community events & gatherings" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-4 py-3">
                <span aria-hidden="true">{item.emoji}</span>
                <span className="text-sm text-text-secondary">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-text-muted">
            V1 focuses entirely on Noida and Greater Noida (within the Noida Expressway–Pari Chowk–Sector 21A corridor).
          </p>
        </section>

        <section aria-labelledby="demo-heading">
          <h2 id="demo-heading" className="mb-4 text-2xl font-bold">A note about the demo directory</h2>
          <p className="leading-relaxed text-text-secondary">Sample groups, venues and sessions are labelled Demo. They show how discovery works, not confirmed gatherings, business partnerships or verified attendance. Do not travel or pay based on a demo listing. Saves, follows and RSVPs use your signed-in account, including when you try them on a demo.</p>
        </section>

        {/* Contact */}
        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-2xl font-bold text-white mb-5">Get in Touch</h2>
          <p className="text-text-secondary leading-relaxed mb-6">
            For listing requests, corrections, or just to say you love what we&apos;re building
            — send an email with the relevant page link and details.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="mailto:hello@noida.fit"
              className="inline-flex items-center gap-2 rounded-lg bg-velocity px-6 py-3 text-sm font-bold text-slate-950 hover:bg-velocity-glow transition-colors"
            >
              hello@noida.fit
            </Link>
            <Link
              href="/for-organizers"
              className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-6 py-3 text-sm font-bold text-white hover:bg-surface-hover transition-colors"
            >
              List Your Community
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
