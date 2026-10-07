import { ListingImage } from "@/components/discovery/ListingImage";
import Link from "next/link";
import type { Community } from "@/types/community";
import { CATEGORY_LABELS } from "@/lib/config";
import { BaseCard } from "./BaseCard";
import { CalendarDays, CheckCircle2, MapPin } from "lucide-react";

export interface CommunityCardProps { community: Community; compact?: boolean; showDemoBadge?: boolean; }

export function CommunityCard({ community, compact = false, showDemoBadge = true }: CommunityCardProps) {
  const image = community.bannerUrl;
  return (
    <BaseCard className={compact ? "compact-card" : ""}>
      {!compact && <Link href={`/community/${community.slug}`} aria-label={`View ${community.name}`} className="motion-photo relative block aspect-[16/9] shrink-0 overflow-hidden border-b border-border-subtle bg-surface-elevated focus-visible:outline-offset-[-3px]">
        <ListingImage src={image} category={community.category} alt={community.name} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="min-w-0 rounded-md bg-background/90 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-velocity [overflow-wrap:anywhere]">{CATEGORY_LABELS[community.category] ?? community.category}</span>
          {community.verified && !community.demo && <span className="flex shrink-0 items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[11px] font-semibold text-foreground"><CheckCircle2 className="size-3.5 text-velocity" aria-hidden="true" /> Verified</span>}
          {community.demo && showDemoBadge && <span className="shrink-0 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase text-white">Demo</span>}
        </div>
      </Link>}
      <div className={`flex flex-1 flex-col p-4 ${compact ? "" : "sm:p-5"}`}>
        {compact && <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold"><span className="uppercase tracking-wide text-velocity">{CATEGORY_LABELS[community.category] ?? community.category}</span>{community.verified && !community.demo && <span className="flex items-center gap-1 text-foreground"><CheckCircle2 className="size-3.5 text-velocity" aria-hidden="true" />Verified</span>}{community.demo && showDemoBadge && <span className="uppercase text-text-secondary">Demo</span>}</div>}
        <h3 className="text-base font-bold leading-snug tracking-tight text-white sm:text-lg"><Link href={`/community/${community.slug}`} className="motion-press flex min-h-11 items-center rounded-sm hover:text-velocity">{community.name}</Link></h3>
        {!compact && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">{community.tagline}</p>}
        <div className="mt-auto pt-4">
          <div className="space-y-2 border-t border-border-subtle pt-3 text-xs leading-relaxed text-text-secondary">
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0">{community.baseLocation}</span></p>
            {community.meetingDays.length > 0 && <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0">{community.meetingDays.join(" · ")}</span></p>}
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
