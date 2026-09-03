import Link from "next/link";
import type { Community } from "@/types/community";
import { CATEGORY_LABELS } from "@/lib/config";

interface CommunityCardProps {
  community: Community;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const categoryLabel = CATEGORY_LABELS[community.category] ?? community.category;

  return (
    <article className="group relative flex flex-col bg-surface rounded-xl border border-border-subtle hover:border-border-strong transition-colors duration-200 overflow-hidden p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-text-muted font-medium">{categoryLabel}</span>
        {community.verified && (
          <span className="text-xs text-text-muted font-medium">Verified</span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-white group-hover:text-slate-200 transition-colors line-clamp-1">
        <Link href={`/community/${community.slug}`} className="focus-visible:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          {community.name}
        </Link>
      </h3>

      <p className="mt-1 text-xs text-text-muted line-clamp-2 leading-relaxed">{community.tagline}</p>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border-subtle/50 flex items-center justify-between">
        <span className="text-xs text-text-muted">{community.baseLocation}</span>
        <span className="text-xs text-text-muted">{community.membersCount.toLocaleString()}+ members</span>
      </div>
    </article>
  );
}
