import Link from "next/link";
import type { Place } from "@/types/place";

interface PlaceCardProps {
  place: Place;
}

export function PlaceCard({ place }: PlaceCardProps) {
  return (
    <article className="group relative flex flex-col bg-surface/80 hover:bg-surface-elevated rounded-2xl border border-border-subtle hover:border-white/20 transition-all duration-300 overflow-hidden p-5 shadow-sm hover:shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-white/[0.05] text-[#94a3b8] border border-white/5">
          {place.category}
        </span>
        <span className="text-[10px] font-mono text-[#64748b]">
          {place.sector}
        </span>
      </div>

      <h3 className="text-base font-bold text-white group-hover:text-[#9ddc2e] transition-colors line-clamp-1">
        <Link href={`/place/${place.slug}`} className="focus-visible:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          {place.name}
        </Link>
      </h3>

      <p className="mt-1.5 text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
        {place.description}
      </p>

      <div className="mt-5 pt-3 border-t border-border-subtle/70 flex items-center justify-between text-xs text-[#64748b]">
        <span>{place.amenities?.[0] ?? "Public Venue"}</span>
        <span className="font-mono text-white/80">
          {place.activeCommunitiesCount}{" "}
          {place.activeCommunitiesCount === 1 ? "squad" : "squads"} active
        </span>
      </div>
    </article>
  );
}
