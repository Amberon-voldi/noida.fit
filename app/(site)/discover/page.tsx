import type { Metadata } from "next";
import Link from "next/link";
import { getCommunities, getUpcomingEvents, getPlaces } from "@/lib/data";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { EventCard } from "@/components/cards/EventCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { CATEGORY_LABELS, CATEGORY_EMOJIS } from "@/lib/config";
import type { ActivityCategory } from "@/types/community";
import { BaseCard } from "@/components/cards/BaseCard";

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
      <div className="relative isolate border-b border-white/5 bg-[#090a0f] px-4 sm:px-6 lg:px-8 py-16 sm:py-24 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[800px] h-[400px] bg-[#9ddc2e]/10 blur-[120px] pointer-events-none rounded-full opacity-50"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl relative z-10">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#9ddc2e] font-bold">
            CITYWIDE DIRECTORY · NOIDA
          </span>
          <h1
            className="mt-3 text-4xl sm:text-6xl font-black text-white tracking-tighter leading-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            Discover <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">Noida Fitness</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Everything you need to find your fitness tribe in Noida and Greater Noida — active communities, open workouts, and iconic training grounds.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        {/* Browse by Activity */}
        <section aria-labelledby="activity-heading">
          <div className="flex items-center justify-between mb-8">
            <h2 id="activity-heading" className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Browse by Discipline
            </h2>
            <span className="text-xs font-mono text-slate-500">Select sport to filter</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {ACTIVITIES.map((act) => (
              <Link
                key={act.id}
                href={`/communities?activity=${act.id}`}
                id={`discover-${act.id}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-surface/80 p-6 text-center transition-all duration-300 hover:border-[#9ddc2e]/50 hover:bg-surface-elevated hover:scale-[1.02] shadow-sm hover:shadow-[#9ddc2e]/10"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#9ddc2e]/10 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                    {CATEGORY_EMOJIS[act.id]}
                  </span>
                  <span className="text-sm font-bold text-white group-hover:text-[#9ddc2e] transition-colors">
                    {CATEGORY_LABELS[act.id]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Communities */}
        <section aria-labelledby="discover-communities-heading">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 id="discover-communities-heading" className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Active Communities ({communities.length})
              </h2>
              <p className="text-sm text-slate-500">Running clubs, cycling groups, and turf crews</p>
            </div>
            <Link href="/communities" className="text-sm font-bold text-[#9ddc2e] hover:underline flex items-center gap-1">
              View all <span className="text-lg">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {communities.slice(0, 6).map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        </section>

        {/* Events */}
        <section aria-labelledby="discover-events-heading">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 id="discover-events-heading" className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Upcoming Open Events ({events.length})
              </h2>
              <p className="text-sm text-slate-500">Scheduled group runs, rides, and training sessions</p>
            </div>
            <Link href="/events" className="text-sm font-bold text-[#9ddc2e] hover:underline flex items-center gap-1">
              View all <span className="text-lg">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.slice(0, 6).map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>

        {/* Places */}
        <section aria-labelledby="discover-places-heading">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 id="discover-places-heading" className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Training Venues ({places.length})
              </h2>
              <p className="text-sm text-slate-500">Noida Stadium, Expressway, parks, and trails</p>
            </div>
            <Link href="/places" className="text-sm font-bold text-[#9ddc2e] hover:underline flex items-center gap-1">
              View all <span className="text-lg">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {places.slice(0, 4).map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
