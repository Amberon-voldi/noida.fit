import type { Metadata } from "next";
import Link from "next/link";
import { getCommunities, getUpcomingEvents, getPlaces } from "@/lib/data";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { EventCard } from "@/components/cards/EventCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { CATEGORY_LABELS, CATEGORY_EMOJIS } from "@/lib/config";
import type { ActivityCategory } from "@/types/community";

export const metadata: Metadata = {
  title: "Discover Noida Fitness — Communities, Events & Venues",
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
    <div className="min-h-full pb-20">
      {/* Page Header with Ambient Lighting */}
      <div className="relative isolate border-b border-border-subtle bg-gradient-to-b from-[#0f1422] via-[#090a0f] to-[#090a0f]">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[600px] h-[250px] bg-[#9ddc2e]/10 blur-[110px] pointer-events-none rounded-full"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
            CITYWIDE DIRECTORY · NOIDA
          </span>
          <h1
            className="mt-2 text-3xl sm:text-5xl font-black text-white tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Discover Noida Fitness
          </h1>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl">
            Everything you need to find your fitness tribe in Noida and Greater Noida — active communities, open workouts, and iconic training grounds.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Browse by Activity */}
        <section aria-labelledby="activity-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="activity-heading" className="text-lg sm:text-xl font-bold text-white">
              Browse by Discipline
            </h2>
            <span className="text-xs font-mono text-[#64748b]">Select sport to filter</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {ACTIVITIES.map((act) => (
              <Link
                key={act.id}
                href={`/communities?activity=${act.id}`}
                id={`discover-${act.id}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border-subtle bg-surface/80 p-5 text-center hover:border-[#9ddc2e]/40 hover:bg-surface-elevated transition-all shadow-sm"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform" aria-hidden="true">
                  {CATEGORY_EMOJIS[act.id]}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#9ddc2e] transition-colors">
                  {CATEGORY_LABELS[act.id]}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Communities */}
        <section aria-labelledby="discover-communities-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 id="discover-communities-heading" className="text-lg sm:text-xl font-bold text-white">
                Active Communities ({communities.length})
              </h2>
              <p className="text-xs text-[#64748b]">Running clubs, cycling groups, and turf crews</p>
            </div>
            <Link href="/communities" className="text-xs sm:text-sm font-semibold text-[#9ddc2e] hover:underline">
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
            <div>
              <h2 id="discover-events-heading" className="text-lg sm:text-xl font-bold text-white">
                Upcoming Open Events ({events.length})
              </h2>
              <p className="text-xs text-[#64748b]">Scheduled group runs, rides, and training sessions</p>
            </div>
            <Link href="/events" className="text-xs sm:text-sm font-semibold text-[#9ddc2e] hover:underline">
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
            <div>
              <h2 id="discover-places-heading" className="text-lg sm:text-xl font-bold text-white">
                Training Venues ({places.length})
              </h2>
              <p className="text-xs text-[#64748b]">Noida Stadium, Expressway, parks, and trails</p>
            </div>
            <Link href="/places" className="text-xs sm:text-sm font-semibold text-[#9ddc2e] hover:underline">
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
