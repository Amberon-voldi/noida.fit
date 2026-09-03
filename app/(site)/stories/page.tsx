import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "Stories from the Noida fitness community — runner profiles, club spotlights, and local fitness culture.",
  alternates: { canonical: "/stories" },
};

export default function StoriesPage() {
  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="bg-surface border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-velocity">
            Stories from the City
          </span>
          <h1
            className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            The Noida Fitness Chronicle
          </h1>
          <p className="mt-3 text-text-secondary leading-relaxed max-w-xl">
            Runner profiles, club spotlights, route guides, and dispatches from Noida&apos;s growing fitness culture.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <span className="text-6xl mb-6">📖</span>
          <h2 className="text-2xl font-bold text-white mb-3">Stories launching soon</h2>
          <p className="text-text-secondary max-w-md leading-relaxed">
            We&apos;re working with community captains and runners across Noida to write stories
            that actually deserve to be read. Subscribe to know when the first ones go live.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center w-full max-w-sm">
            <input
              type="email"
              placeholder="your@email.com"
              aria-label="Email address to subscribe to stories"
              className="flex-1 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-velocity focus:border-transparent"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-velocity px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-velocity-glow transition-colors"
            >
              Notify Me
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
