import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";
import type { Event } from "@/types/event";
import { CATEGORY_LABELS, formatDate } from "@/lib/config";
import { ListingImage } from "@/components/discovery/ListingImage";
import { SaveButton } from "@/components/participation/SaveButton";
import { BaseCard } from "./BaseCard";

export function EventCard({ event }: { event: Event }) {
  return (
    <BaseCard>
      <Link href={`/event/${event.slug}`} aria-label={`View ${event.title}`} className="relative block aspect-[16/9] shrink-0 overflow-hidden bg-surface-elevated">
        <ListingImage src={event.coverImageUrl ?? event.imageUrl} category={event.category} alt={event.title} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2.5 py-1.5 font-mono text-xs font-semibold text-white">{formatDate(event.date)}</span>
        {event.demo && <span className="absolute right-3 top-3 rounded-md bg-background/90 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">Demo</span>}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-velocity">{CATEGORY_LABELS[event.category] ?? event.category}</span>
          <span className="font-mono text-xs font-semibold text-white">{event.price}</span>
        </div>
        <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight"><Link href={`/event/${event.slug}`} className="hover:text-velocity">{event.title}</Link></h3>
        <p className="mt-3 flex items-center gap-2 text-xs text-text-secondary"><Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{event.startTime} · IST</p>
        <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-text-secondary"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{event.venueName} · {event.sector}</p>
        {event.level && <p className="mt-3 text-xs text-text-secondary">{event.level}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <Link href={`/community/${event.communitySlug}`} className="min-w-0 text-xs text-text-secondary hover:text-white">By {event.communityName}</Link>
          <SaveButton itemType="event" itemId={event.id} compact />
        </div>
      </div>
    </BaseCard>
  );
}
