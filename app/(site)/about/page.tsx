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
      {/* Hero */}
      <div className="bg-surface border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-velocity">
              About NOIDA.FIT
            </span>
            <h1
              className="mt-2 text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight"
              style={{ letterSpacing: "-0.035em" }}
            >
              The heartbeat of
              <br />
              <span className="text-velocity">Noida fitness.</span>
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 space-y-14">
        {/* Mission */}
        <section aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="text-2xl font-bold text-white mb-5">Our Mission</h2>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              NOIDA.FIT exists for one reason: to make the fitness communities of Noida
              visible, discoverable, and alive. There is no Noida equivalent to the
              curated outdoor fitness culture you find in Bangalore or Mumbai. That gap
              is what this platform closes.
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
              in the early morning calm of a stadium track, on the expressway before traffic
              wakes up, in a park that smells like wet earth and chai.&rdquo;
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

        {/* Contact */}
        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-2xl font-bold text-white mb-5">Get in Touch</h2>
          <p className="text-text-secondary leading-relaxed mb-6">
            For listing requests, corrections, or just to say you love what we&apos;re building
            — drop us an email. We read everything.
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
