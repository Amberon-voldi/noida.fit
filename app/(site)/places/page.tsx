import type { Metadata } from "next";
import Link from "next/link";
import { getPlaces } from "@/lib/data";
import { PlaceCard } from "@/components/cards/PlaceCard";

export const metadata: Metadata = {
  title: "Places to Train",
  description:
    "Discover the best parks, running tracks, expressway corridors, and fitness venues across Noida & Greater Noida.",
  alternates: { canonical: "/places" },
};

const PLACE_CATEGORIES = [
  "All", "Sports Complex", "Public Park", "Road & Expressway",
  "Nature Trail & Park", "Boutique Studio",
];

export default function PlacesPage() {
  const places = getPlaces();

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="bg-surface border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-velocity">
              Training Venues · Noida
            </span>
            <h1
              className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              Where Noida trains
            </h1>
            <p className="mt-3 text-text-secondary leading-relaxed">
              {places.length} venues — from the iconic Noida Stadium track to the Expressway corridor and nature trails.
            </p>
          </div>

          {/* Category Filters */}
          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter places by type">
            {PLACE_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={cat === "All" ? "/places" : `/places?category=${encodeURIComponent(cat)}`}
                className="inline-flex items-center rounded-full border border-border-strong bg-surface-elevated px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-white hover:border-velocity/60 hover:bg-surface-hover transition-all"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Places Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>

        {/* Map teaser */}
        <div className="mt-12 rounded-2xl border border-border-strong bg-surface overflow-hidden">
          <div className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-white">Explore on the map</h2>
              <p className="mt-2 text-text-secondary">
                Interactive map view of all fitness venues, parks, and running routes in Noida is coming soon.
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface-elevated px-5 py-2.5 text-sm font-medium text-text-muted">
                🗺️ Map View — Coming Soon
              </span>
            </div>
          </div>
          <div className="h-48 bg-surface-elevated border-t border-border-subtle flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl mb-3">🗺️</p>
              <p className="text-sm text-text-muted">Interactive map coming in next release</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
