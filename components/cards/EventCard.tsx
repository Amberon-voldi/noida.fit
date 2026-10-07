import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";
import type { Event } from "@/types/event";
import { CATEGORY_LABELS, formatDate } from "@/lib/config";
import { ListingImage } from "@/components/discovery/ListingImage";
import { SaveButton } from "@/components/participation/SaveButton";
import { BaseCard } from "./BaseCard";

export interface EventCardProps { event: Event; compact?: boolean; showDemoBadge?: boolean; }

export function EventCard({ event, compact = false, showDemoBadge = true }: EventCardProps) {
  return (
    <BaseCard className={compact ? "compact-card" : ""}>
      {!compact && <Link href={`/event/${event.slug}`} aria-label={`View ${event.title}`} className="motion-photo relative block aspect-[16/9] shrink-0 overflow-hidden bg-surface-elevated focus-visible:outline-offset-[-3px]">
        <ListingImage src={event.coverImageUrl ?? event.imageUrl} category={event.category} alt={event.title} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="rounded-md bg-background/90 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-white">{formatDate(event.date)}</span>
          {event.demo && showDemoBadge && <span className="shrink-0 rounded-md bg-background/90 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">Demo</span>}
        </div>
      </Link>}
      <div className={`flex flex-1 flex-col p-4 ${compact ? "" : "sm:p-5"}`}>
        {compact && <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary"><span>{formatDate(event.date)}</span>{event.demo && showDemoBadge && <span className="text-[10px] font-semibold uppercase">Demo</span>}</div>}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <span className="min-w-0 text-[11px] font-semibold uppercase tracking-wider text-velocity [overflow-wrap:anywhere]">{CATEGORY_LABELS[event.category] ?? event.category}</span>
          <span className="rounded-md bg-surface-elevated px-2 py-1 font-mono text-xs font-semibold text-white [overflow-wrap:anywhere]">{event.price}</span>
        </div>
        <h3 className="mt-2 text-base font-bold leading-snug tracking-tight text-white sm:text-lg"><Link href={`/event/${event.slug}`} className="motion-press flex min-h-11 items-center rounded-sm hover:text-velocity">{event.title}</Link></h3>
        <p className="mt-2 flex items-start gap-2 text-xs font-medium leading-relaxed text-foreground"><Clock3 className="mt-0.5 size-3.5 shrink-0 text-text-secondary" aria-hidden="true" /><span className="min-w-0">{event.startTime} · IST</span></p>
        <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-text-secondary"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0">{event.venueName} · {event.sector}</span></p>
        {event.level && <p className="mt-2 text-xs leading-relaxed text-text-secondary">{event.level}</p>}
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border-subtle pt-3">
            <Link href={`/community/${event.communitySlug}`} className="motion-press flex min-h-11 min-w-0 flex-[1_1_7rem] items-center rounded-sm text-xs leading-relaxed text-text-secondary [overflow-wrap:anywhere] hover:text-white">By {event.communityName}</Link>
            {!compact && <SaveButton itemType="event" itemId={event.id} compact />}
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
