import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventBySlug } from "@/lib/data";
import { CATEGORY_LABELS, CATEGORY_EMOJIS, formatDate } from "@/lib/config";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return { title: "Event Not Found" };

  return {
    title: event.title,
    description: event.description.slice(0, 160),
    alternates: { canonical: `/event/${slug}` },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) notFound();

  const categoryEmoji = CATEGORY_EMOJIS[event.category] ?? "⚡";
  const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category;

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="bg-surface border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-muted">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span aria-hidden="true">›</span>
            <Link href="/events" className="hover:text-white transition-colors">Events</Link>
            <span aria-hidden="true">›</span>
            <span className="text-text-secondary truncate" aria-current="page">{event.title}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Category + Title */}
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-velocity">
                {categoryEmoji} {categoryLabel}
              </span>
              <h1
                className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight"
                style={{ letterSpacing: "-0.03em" }}
              >
                {event.title}
              </h1>
              <p className="mt-3 text-text-secondary">
                Hosted by{" "}
                <Link
                  href={`/community/${event.communitySlug}`}
                  className="text-velocity hover:text-velocity-glow transition-colors font-semibold"
                >
                  {event.communityName}
                </Link>
              </p>
            </div>

            {/* Key Details Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-surface border border-border-subtle p-4">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm font-semibold text-white">{formatDate(event.date)}</p>
              </div>
              <div className="rounded-xl bg-surface border border-border-subtle p-4">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Time</p>
                <p className="text-sm font-semibold text-white">{event.startTime} – {event.endTime}</p>
              </div>
              <div className="rounded-xl bg-surface border border-border-subtle p-4">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Cost</p>
                <p className={`text-sm font-semibold ${event.price === "FREE" ? "text-emerald-400" : "text-white"}`}>
                  {event.price}
                </p>
              </div>
              <div className="rounded-xl bg-surface border border-border-subtle p-4">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Attending</p>
                <p className="text-sm font-semibold text-white">{event.attendeesCount}</p>
              </div>
            </div>

            {/* Level & Distance */}
            {(event.level || event.distance || event.pace) && (
              <div className="flex flex-wrap gap-3">
                {event.level && (
                  <span className="inline-flex items-center rounded-full border border-border-strong bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary">
                    🎯 {event.level}
                  </span>
                )}
                {event.distance && (
                  <span className="inline-flex items-center rounded-full border border-border-strong bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary">
                    📏 {event.distance}
                  </span>
                )}
                {event.pace && (
                  <span className="inline-flex items-center rounded-full border border-border-strong bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary">
                    ⏱ {event.pace}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            <section aria-labelledby="description-heading">
              <h2 id="description-heading" className="text-lg font-bold text-white mb-3">About this Event</h2>
              <p className="text-text-secondary leading-relaxed">{event.description}</p>
            </section>

            {/* Route Overview */}
            {event.routeOverview && (
              <section aria-labelledby="route-heading">
                <h2 id="route-heading" className="text-lg font-bold text-white mb-3">Route Overview</h2>
                <p className="text-text-secondary leading-relaxed">{event.routeOverview}</p>
              </section>
            )}

            {/* What to Bring */}
            {event.whatToBring && event.whatToBring.length > 0 && (
              <section aria-labelledby="bring-heading">
                <h2 id="bring-heading" className="text-lg font-bold text-white mb-3">What to Bring</h2>
                <ul className="space-y-2" role="list">
                  {event.whatToBring.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                      <span className="text-velocity mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Register / Join CTA */}
            <div className="rounded-xl border border-border-strong bg-surface p-6">
              <p className="text-sm text-text-muted mb-4 leading-relaxed">
                Join the community to get WhatsApp group details and confirmation.
              </p>
              <Link
                href={`/community/${event.communitySlug}`}
                className="flex w-full items-center justify-center rounded-lg bg-velocity px-4 py-3 text-sm font-bold text-slate-950 hover:bg-velocity-glow transition-colors"
              >
                View {event.communityName}
              </Link>
            </div>

            {/* Venue */}
            <div className="rounded-xl border border-border-subtle bg-surface p-6">
              <h2 className="text-sm font-bold text-white mb-3">Location</h2>
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-velocity mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">{event.venueName}</p>
                  <p className="text-xs text-text-muted mt-0.5">{event.sector}</p>
                  <Link
                    href={`/place/${event.venueSlug}`}
                    className="mt-2 inline-flex text-xs text-velocity hover:text-velocity-glow transition-colors"
                  >
                    View place details →
                  </Link>
                </div>
              </div>
            </div>

            {/* Back Link */}
            <Link
              href="/events"
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to all events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
