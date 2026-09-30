import { ListingImage } from "@/components/discovery/ListingImage";
import Link from "next/link";
import type { Place } from "@/types/place";
import { BaseCard } from "./BaseCard";
import { MapPin } from "lucide-react";

interface PlaceCardProps { place: Place; }

export function PlaceCard({ place }: PlaceCardProps) {
  const image = place.coverImageUrl ?? place.imageUrl;
  const illustration = /park|nature|ground/i.test(place.category) ? "outdoor" : /road/i.test(place.category) ? "cycling" : /studio/i.test(place.category) ? "wellness" : "sports";
  return (
    <BaseCard>
      <Link href={`/place/${place.slug}`} aria-label={`View ${place.name}`} className="relative block aspect-[16/9] shrink-0 overflow-hidden border-b border-border-subtle bg-surface-elevated">
        <ListingImage src={image} category={illustration} alt={place.name} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2"><span className="rounded-md bg-background/90 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-velocity">{place.category}</span>{place.demo && <span className="shrink-0 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase text-white">Demo</span>}</div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-white group-hover:text-velocity-glow"><Link href={`/place/${place.slug}`} className="hover:text-velocity">{place.name}</Link></h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">{place.description}</p>
        <div className="mt-5 border-t border-border-subtle pt-4 text-xs text-text-secondary">
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-velocity" aria-hidden="true" />{place.sector}</p>
          <p className="mt-2 font-mono text-text-secondary">{place.amenities.slice(0, 3).join(" · ")}</p>
        </div>
      </div>
    </BaseCard>
  );
}
