import type { Metadata } from "next";
import Link from "next/link";
import { getPlaces } from "@/lib/data";
import { PlaceCard } from "@/components/cards/PlaceCard";

export const metadata: Metadata = {
  title: "Where Noida Trains — Iconic Venues & Tracks",
  description:
    "Discover the best parks, running tracks, expressway corridors, and fitness venues across Noida & Greater Noida.",
  alternates: { canonical: "/places" },
};

const PLACE_CATEGORIES = [
  "All",
  "Sports Complex",
  "Public Park",
  "Road & Expressway",
  "Nature Trail & Park",
  "Boutique Studio",
];

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function PlacesPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const allPlaces = getPlaces();

  const filteredPlaces = category && category !== "All"
    ? allPlaces.filter((p) => p.category === category)
    : allPlaces;

  const currentCategory = category || "All";

  return (
    <div className="min-h-full pb-20">
      {/* Page Header */}
      <div className="relative isolate border-b border-border-subtle bg-gradient-to-b from-[#0f1422] via-[#090a0f] to-[#090a0f] px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[600px] h-[250px] bg-[#9ddc2e]/10 blur-[110px] pointer-events-none rounded-full"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl">
          <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
            TRAINING GROUNDS · NOIDA
          </span>
          <h1
            className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Where Noida Trains
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#94a3b8] max-w-2xl">
            {allPlaces.length} vetted venues — from the 400m synthetic track at Sector 21A to the fast asphalt of the Expressway and green park circuits.
          </p>

          {/* Category Filters */}
          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter places by type">
            {PLACE_CATEGORIES.map((cat) => {
              const isActive = currentCategory === cat;
              return (
                <Link
                  key={cat}
                  href={cat === "All" ? "/places" : `/places?category=${encodeURIComponent(cat)}`}
                  className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#9ddc2e] text-black shadow-[0_0_12px_rgba(157,220,46,0.35)]"
                      : "bg-surface-elevated/80 border border-white/10 text-[#94a3b8] hover:text-white hover:border-white/25"
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Places Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>

        {/* Map teaser */}
        <div className="mt-14 rounded-3xl border border-white/10 bg-surface/80 overflow-hidden shadow-lg">
          <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
                SECTOR MAP
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Explore Noida Training Grounds on the Map
              </h2>
              <p className="mt-1 text-sm text-[#94a3b8] max-w-xl">
                Interactive city map view with running routes, elevation profiles, water points, and transit accessibility.
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-surface-elevated px-5 py-2.5 text-xs font-mono font-semibold text-white">
                🗺️ Interactive Map V2 · In Progress
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
