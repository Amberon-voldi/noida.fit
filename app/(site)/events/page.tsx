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
      {/* Hero Section */}
      <div className="relative isolate border-b border-white/5 bg-[#090a0f] px-4 sm:px-6 lg:px-8 py-16 sm:py-24 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[800px] h-[400px] bg-[#9ddc2e]/10 blur-[120px] pointer-events-none rounded-full opacity-50"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl relative z-10">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#9ddc2e] font-bold">
            COMMUNITY SESSIONS · NOIDA
          </span>
          <h1
            className="mt-3 text-4xl sm:text-6xl font-black text-white tracking-tighter leading-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            Happening <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">This Week</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            {allEvents.length} open workouts, group runs, and cycling rides scheduled across Noida and Greater Noida. All free to join.
          </p>

          {/* Activity Filter Chips */}
          <div className="mt-10 flex flex-wrap gap-3" role="group" aria-label="Filter by activity">
            {FILTERS.map((f) => {
              const isActive = currentFilter === f.id;
              return (
                <Link
                  key={f.id}
                  href={f.id === "all" ? "/events" : `/events?activity=${f.id}`}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-[#9ddc2e] text-black shadow-[0_0_20px_rgba(157,220,46,0.4)] scale-105"
                      : "bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <span className="text-sm">{f.icon}</span>
                  <span>{f.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-32 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
            <p className="text-4xl mb-4">🏃💨</p>
            <p className="text-xl font-bold text-white">No events found in this category</p>
            <p className="text-sm text-slate-500 mt-2">Check back soon or explore all community workouts.</p>
            <Link
              href="/events"
              className="mt-6 inline-flex items-center gap-1 text-sm font-mono text-[#9ddc2e] hover:underline font-bold"
            >
              Reset to all events →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Community Organizer Banner */}
        <div className="mt-24 rounded-3xl border border-white/10 bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 shadow-2xl">
          <div className="max-w-xl">
            <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-bold">
              FREE EVENT LISTING
            </span>
            <p className="text-2xl font-black text-white mt-2 tracking-tight">Organizing a workout or ride in Noida?</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Publish your schedule to the official city calendar and reach local runners and riders.
            </p>
          </div>
          <Link
            href="/for-organizers"
            className="inline-flex items-center rounded-full bg-[#9ddc2e] px-8 py-4 text-sm font-black text-black hover:bg-[#b5f043] transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(157,220,46,0.4)] flex-shrink-0"
          >
            Submit Your Event
          </Link>
        </div>
      </div>
    </div>
  );
}
