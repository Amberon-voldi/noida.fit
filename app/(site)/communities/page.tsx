import type { Metadata } from "next";
import Link from "next/link";
import { getCommunities } from "@/lib/data";
import { CommunityCard } from "@/components/cards/CommunityCard";
import type { ActivityCategory } from "@/types/community";

export const metadata: Metadata = {
  title: "Communities",
  description:
    "Browse all fitness communities in Noida — running clubs, cycling crews, calisthenics squads, sports groups, and wellness circles meeting every week.",
  alternates: { canonical: "/communities" },
};

const FILTERS: Array<{ id: ActivityCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "cycling", label: "Cycling" },
  { id: "strength", label: "Strength" },
  { id: "sports", label: "Sports" },
  { id: "wellness", label: "Wellness" },
  { id: "outdoor", label: "Outdoor" },
];

export default function CommunitiesPage() {
  const communities = getCommunities();

  return (
    <div className="min-h-full">
      <div className="border-b border-border-subtle px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: "-0.025em" }}>
            Communities
          </h1>
          <p className="text-sm text-text-muted mb-8">
            {communities.length} active groups meeting across Noida & Greater Noida.
          </p>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by activity">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={f.id === "all" ? "/communities" : `/communities?activity=${f.id}`}
                className="inline-flex items-center rounded-full border border-border-subtle px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:border-border-strong hover:text-white transition-colors"
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-border-subtle p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-white">Run a fitness community in Noida?</p>
            <p className="mt-1 text-xs text-text-muted">List it for free and reach active people across the city.</p>
          </div>
          <Link
            href="/for-organizers"
            className="inline-flex items-center rounded-lg bg-[#9ddc2e] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors flex-shrink-0"
          >
            Add Your Community
          </Link>
        </div>
      </div>
    </div>
  );
}
