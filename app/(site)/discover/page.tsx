import type { Metadata } from "next";
import Link from "next/link";
import { getCommunities, getUpcomingEvents, getPlaces } from "@/lib/data";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { EventCard } from "@/components/cards/EventCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { CATEGORY_LABELS, CATEGORY_EMOJIS } from "@/lib/config";
import type { ActivityCategory } from "@/types/community";

export const metadata: Metadata = {
  title: "Discover Noida Fitness",
  description:
    "Your one-page guide to all fitness communities, events, and training venues in Noida & Greater Noida.",
  alternates: { canonical: "/discover" },
};

const ACTIVITIES: Array<{ id: ActivityCategory }> = [
  { id: "running" },
  { id: "cycling" },
  { id: "strength" },
  { id: "sports" },
  { id: "wellness" },
  { id: "outdoor" },
];

export default function DiscoverPage() {
  const communities = getCommunities();
  const events = getUpcomingEvents();
  const places = getPlaces();

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="bg-surface border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-velocity">
            Everything Fitness · Noida
          </span>
          <h1
            className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Discover Noida Fitness
          </h1>
          <p className="mt-3 text-text-secondary leading-relaxed max-w-2xl">
            Communities, events, and venues — everything you need to find your fitness tribe in Noida and Greater Noida.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Browse by Activity */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-xl font-bold text-white mb-6">
            Browse by Activity
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ACTIVITIES.map((act) => (
              <Link
                key={act.id}
                href={`/communities?activity=${act.id}`}
                id={`discover-${act.id}`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border-subtle bg-surface p-5 text-center hover:border-velocity/50 hover:bg-surface-hover transition-all"
              >
                <span className="text-3xl" aria-hidden="true">
                  {CATEGORY_EMOJIS[act.id]}
                </span>
                <span className="text-sm font-bold text-white group-hover:text-velocity transition-colors">
                  {CATEGORY_LABELS[act.id]}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Communities */}
        <section aria-labelledby="discover-communities-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="discover-communities-heading" className="text-xl font-bold text-white">
              Communities ({communities.length})
            </h2>
            <Link href="/communities" className="text-sm font-semibold text-velocity hover:text-velocity-glow transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {communities.slice(0, 6).map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        </section>

        {/* Events */}
        <section aria-labelledby="discover-events-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="discover-events-heading" className="text-xl font-bold text-white">
              Upcoming Events ({events.length})
            </h2>
            <Link href="/events" className="text-sm font-semibold text-velocity hover:text-velocity-glow transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.slice(0, 6).map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>

        {/* Places */}
        <section aria-labelledby="discover-places-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="discover-places-heading" className="text-xl font-bold text-white">
              Training Venues ({places.length})
            </h2>
            <Link href="/places" className="text-sm font-semibold text-velocity hover:text-velocity-glow transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {places.slice(0, 4).map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
