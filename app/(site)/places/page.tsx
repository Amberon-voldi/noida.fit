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
      {/* Hero Section */}
      <div className="relative isolate border-b border-white/5 bg-[#090a0f] px-4 sm:px-6 lg:px-8 py-16 sm:py-24 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[800px] h-[400px] bg-[#9ddc2e]/10 blur-[120px] pointer-events-none rounded-full opacity-50"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl relative z-10">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#9ddc2e] font-bold">
            TRAINING GROUNDS · NOIDA
          </span>
          <h1
            className="mt-3 text-4xl sm:text-6xl font-black text-white tracking-tighter leading-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            Where <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">Noida Trains</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            {allPlaces.length} vetted venues — from the 400m synthetic track at Sector 21A to the fast asphalt of the Expressway and green park circuits.
          </p>

          {/* Category Filters */}
          <div className="mt-10 flex flex-wrap gap-3" role="group" aria-label="Filter places by type">
            {PLACE_CATEGORIES.map((cat) => {
              const isActive = currentCategory === cat;
              return (
                <Link
                  key={cat}
                  href={cat === "All" ? "/places" : `/places?category=${encodeURIComponent(cat)}`}
                  className={`inline-flex items-center rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-[#9ddc2e] text-black shadow-[0_0_20px_rgba(157,220,46,0.4)] scale-105"
                      : "bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10"
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>

        {/* Map teaser */}
        <div className="mt-24 rounded-3xl border border-white/10 bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xl">
          <div className="max-w-xl">
            <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-bold">
              SECTOR MAP
            </span>
            <h2 className="text-2xl font-black text-white mt-2 tracking-tight">
              Explore Noida Training Grounds on the Map
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-xl leading-relaxed">
              Interactive city map view with running routes, elevation profiles, water points, and transit accessibility.
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md px-5 py-2.5 text-xs font-mono font-bold text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#9ddc2e] animate-pulse" />
              Interactive Map V2 · In Progress
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
