import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCommunityBySlug, getEventsByCommunity } from "@/lib/data";
import { CATEGORY_LABELS } from "@/lib/config";
import { EventCard } from "@/components/cards/EventCard";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) return { title: "Community Not Found" };
  return {
    title: community.name,
    description: community.tagline,
    alternates: { canonical: `/community/${slug}` },
  };
}

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) notFound();

  const events = getEventsByCommunity(slug);
  const categoryLabel = CATEGORY_LABELS[community.category] ?? community.category;

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="border-b border-border-subtle px-4 sm:px-6 lg:px-8 py-3">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-muted">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span aria-hidden="true">›</span>
            <Link href="/communities" className="hover:text-white transition-colors">Communities</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{community.name}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border-subtle px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center gap-3 mb-2 text-xs text-text-muted">
            <span>{categoryLabel}</span>
            {community.verified && <span>· Verified</span>}
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-white"
            style={{ letterSpacing: "-0.025em" }}
          >
            {community.name}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">{community.tagline}</p>

          <div className="mt-4 flex flex-wrap gap-5 text-xs text-text-muted">
            <span>{community.baseLocation}</span>
            <span>{community.membersCount.toLocaleString()}+ members</span>
            <span>Meets {community.meetingDays.join(", ")}</span>
          </div>

          {Object.entries(community.socialLinks).some(([, v]) => v) && (
            <div className="mt-4 flex gap-4">
              {community.socialLinks.instagram && (
                <a href={community.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-text-muted hover:text-white transition-colors">
                  Instagram →
                </a>
              )}
              {community.socialLinks.strava && (
                <a href={community.socialLinks.strava} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-text-muted hover:text-white transition-colors">
                  Strava →
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-sm font-semibold text-white mb-3">About</h2>
              <p className="text-sm text-text-secondary leading-relaxed">{community.description}</p>
            </section>

            {events.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-white mb-4">Upcoming Events</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {community.schedule && community.schedule.length > 0 && (
              <div className="rounded-xl border border-border-subtle p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Schedule</h2>
                <ul className="space-y-3" role="list">
                  {community.schedule.map((item, i) => (
                    <li key={i} className="pb-3 border-b border-border-subtle/50 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">{item.day}</span>
                        <span className="text-xs text-text-muted font-mono">{item.time}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{item.sessionType}</p>
                      <p className="text-xs text-text-muted">{item.venueName}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {community.captains.length > 0 && (
              <div className="rounded-xl border border-border-subtle p-5">
                <h2 className="text-sm font-semibold text-white mb-4">
                  {community.captains.length === 1 ? "Captain" : "Captains"}
                </h2>
                <ul className="space-y-4" role="list">
                  {community.captains.map((captain, i) => (
                    <li key={i}>
                      <p className="text-xs font-medium text-white">{captain.name}</p>
                      <p className="text-xs text-text-muted">{captain.role}</p>
                      {captain.bio && (
                        <p className="mt-1 text-xs text-text-muted leading-relaxed">{captain.bio}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
