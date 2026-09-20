import type { Metadata } from "next";
import Link from "next/link";
import { getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/cards/EventCard";
import type { ActivityCategory } from "@/types/community";

export const metadata: Metadata = {
  title: "Community Fitness Events in Noida",
  description:
    "Browse upcoming fitness events in Noida — running, cycling, strength, and sports sessions happening this week.",
  alternates: { canonical: "/events" },
};

const FILTERS: Array<{ id: ActivityCategory | "all"; label: string; icon: string }> = [
  { id: "all", label: "All Events", icon: "⚡" },
  { id: "running", label: "Running", icon: "🏃" },
  { id: "cycling", label: "Cycling", icon: "🚴" },
  { id: "strength", label: "Strength", icon: "💪" },
  { id: "sports", label: "Sports", icon: "🏸" },
  { id: "wellness", label: "Wellness", icon: "🧘" },
];

type Props = {
  searchParams: Promise<{ activity?: string }>;
};

export default async function EventsPage({ searchParams }: Props) {
  const { activity } = await searchParams;
  const allEvents = getUpcomingEvents();

  const filteredEvents = activity && activity !== "all"
    ? allEvents.filter((e) => e.category === activity)
    : allEvents;

  const currentFilter = activity || "all";

  return (
    <div className="min-h-full pb-20">
      {/* Header with Ambient Glow */}
      <div className="relative isolate border-b border-border-subtle bg-gradient-to-b from-[#0f1422] via-[#090a0f] to-[#090a0f] px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[600px] h-[250px] bg-[#9ddc2e]/10 blur-[110px] pointer-events-none rounded-full"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl">
          <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
            COMMUNITY SESSIONS · NOIDA
          </span>
          <h1
            className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Happening This Week
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#94a3b8] max-w-2xl">
            {allEvents.length} open workouts, group runs, and cycling rides scheduled across Noida and Greater Noida. All free to join.
          </p>

          {/* Activity Filter Chips */}
          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by activity">
            {FILTERS.map((f) => {
              const isActive = currentFilter === f.id;
              return (
                <Link
                  key={f.id}
                  href={f.id === "all" ? "/events" : `/events?activity=${f.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#9ddc2e] text-black shadow-[0_0_12px_rgba(157,220,46,0.35)]"
                      : "bg-surface-elevated/80 border border-white/10 text-[#94a3b8] hover:text-white hover:border-white/25"
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-border-subtle bg-surface/30">
            <p className="text-2xl mb-2">🏃💨</p>
            <p className="text-base font-bold text-white">No events found in this category</p>
            <p className="text-xs text-[#94a3b8] mt-1">Check back soon or explore all community workouts.</p>
            <Link
              href="/events"
              className="mt-4 inline-flex items-center gap-1 text-xs font-mono text-[#9ddc2e] hover:underline"
            >
              Reset to all events →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Community Organizer Banner */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-r from-surface-elevated via-surface to-surface-elevated p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
              FREE EVENT LISTING
            </span>
            <p className="text-lg font-bold text-white mt-1">Organizing a workout or ride in Noida?</p>
            <p className="text-xs text-[#94a3b8] mt-0.5 max-w-md">
              Publish your schedule to the official city calendar and reach local runners and riders.
            </p>
          </div>
          <Link
            href="/for-organizers"
            className="inline-flex items-center rounded-xl bg-[#9ddc2e] px-6 py-3 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors flex-shrink-0"
          >
            Submit Your Event
          </Link>
        </div>
      </div>
    </div>
  );
}
