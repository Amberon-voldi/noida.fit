import { ListingImage } from "@/components/discovery/ListingImage";
import Link from "next/link";
import type { Community } from "@/types/community";
import { CATEGORY_LABELS } from "@/lib/config";
import { BaseCard } from "./BaseCard";
import { CheckCircle2 } from "lucide-react";

interface CommunityCardProps { community: Community; }

export function CommunityCard({ community }: CommunityCardProps) {
  const image = community.bannerUrl;
  return (
    <BaseCard>
      <Link href={`/community/${community.slug}`} aria-label={`View ${community.name}`} className="relative block aspect-[16/9] shrink-0 overflow-hidden border-b border-border-subtle bg-surface-elevated">
        <ListingImage src={image} category={community.category} alt={community.name} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="rounded-md bg-background/90 px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-velocity">{CATEGORY_LABELS[community.category] ?? community.category}</span>
          {community.verified && !community.demo && <span className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[11px] font-semibold text-indigo-300"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Verified</span>}
          {community.demo && <span className="rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase text-white">Demo</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-white group-hover:text-velocity-glow"><Link href={`/community/${community.slug}`} className="hover:text-velocity">{community.name}</Link></h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">{community.tagline}</p>
        <div className="mt-5 space-y-2 border-t border-border-subtle pt-4 text-xs text-text-secondary">
          <p>{community.baseLocation}</p>
          <p className="font-mono text-text-secondary">{community.meetingDays.join(" · ")}</p>
        </div>
      </div>
    </BaseCard>
  );
}
