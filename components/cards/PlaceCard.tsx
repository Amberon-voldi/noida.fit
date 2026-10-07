import { ListingImage } from "@/components/discovery/ListingImage";
import Link from "next/link";
import type { Place } from "@/types/place";
import { BaseCard } from "./BaseCard";
import { MapPin } from "lucide-react";

export interface PlaceCardProps { place: Place; compact?: boolean; showDemoBadge?: boolean; }

export function PlaceCard({ place, compact = false, showDemoBadge = true }: PlaceCardProps) {
  const image = place.coverImageUrl ?? place.imageUrl;
  const illustration = /park|nature|ground/i.test(place.category) ? "outdoor" : /road/i.test(place.category) ? "cycling" : /studio/i.test(place.category) ? "wellness" : "sports";
  return (
    <BaseCard className={compact ? "compact-card" : ""}>
      {!compact && <Link href={`/place/${place.slug}`} aria-label={`View ${place.name}`} className="motion-photo relative block aspect-[16/9] shrink-0 overflow-hidden border-b border-border-subtle bg-surface-elevated focus-visible:outline-offset-[-3px]">
        <ListingImage src={image} category={illustration} alt={place.name} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="min-w-0 rounded-md bg-background/90 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-velocity [overflow-wrap:anywhere]">{place.category}</span>
          {place.demo && showDemoBadge && <span className="shrink-0 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase text-white">Demo</span>}
        </div>
      </Link>}
      <div className={`flex flex-1 flex-col p-4 ${compact ? "" : "sm:p-5"}`}>
        {compact && <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold"><span className="uppercase tracking-wide text-velocity">{place.category.replaceAll("-", " ")}</span>{place.demo && showDemoBadge && <span className="uppercase text-text-secondary">Demo</span>}</div>}
        <h3 className="text-base font-bold leading-snug tracking-tight text-white sm:text-lg"><Link href={`/place/${place.slug}`} className="motion-press flex min-h-11 items-center rounded-sm hover:text-velocity">{place.name}</Link></h3>
        {!compact && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">{place.description}</p>}
        <div className="mt-auto pt-4">
          <div className="border-t border-border-subtle pt-3 text-xs leading-relaxed text-text-secondary">
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0">{place.sector}</span></p>
            {compact && place.publicHours && <p className="mt-2">{place.publicHours}</p>}
            {!compact && place.amenities.length > 0 && <ul aria-label="Amenities" className="mt-2.5 flex flex-wrap gap-1.5">
              {place.amenities.slice(0, 3).map((amenity, index) => <li key={`${amenity}-${index}`} className="max-w-full rounded-md bg-surface-elevated px-2 py-1 text-[11px] leading-relaxed [overflow-wrap:anywhere]">{amenity}</li>)}
            </ul>}
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
