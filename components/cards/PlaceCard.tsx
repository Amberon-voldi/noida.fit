import Link from "next/link";
import type { Place } from "@/types/place";

interface PlaceCardProps {
  place: Place;
}

export function PlaceCard({ place }: PlaceCardProps) {
  return (
    <article className="group relative flex flex-col bg-surface rounded-xl border border-border-subtle hover:border-border-strong transition-colors duration-200 overflow-hidden p-5">
      <span className="text-xs text-text-muted font-medium mb-2">{place.category}</span>

      <h3 className="text-sm font-semibold text-white group-hover:text-slate-200 transition-colors line-clamp-1">
        <Link href={`/place/${place.slug}`} className="focus-visible:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          {place.name}
        </Link>
      </h3>

      <p className="mt-1 text-xs text-text-muted">{place.sector}</p>

      <div className="mt-4 pt-3 border-t border-border-subtle/50">
        <p className="text-xs text-text-muted">
          {place.activeCommunitiesCount}{" "}
          {place.activeCommunitiesCount === 1 ? "community" : "communities"} active
        </p>
      </div>
    </article>
  );
}
