import Link from "next/link";
import type { Community } from "@/types/community";
import { CATEGORY_LABELS } from "@/lib/config";

interface CommunityCardProps {
  community: Community;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const categoryLabel = CATEGORY_LABELS[community.category] ?? community.category;

  return (
    <article className="group relative flex flex-col bg-surface/80 hover:bg-surface-elevated rounded-2xl border border-border-subtle hover:border-white/20 transition-all duration-300 overflow-hidden p-5 shadow-sm hover:shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-white/[0.05] text-[#94a3b8] border border-white/5">
          {categoryLabel}
        </span>
        {community.verified && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#9ddc2e] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9ddc2e]" />
            VERIFIED
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-base font-bold text-white group-hover:text-[#9ddc2e] transition-colors line-clamp-1">
        <Link href={`/community/${community.slug}`} className="focus-visible:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          {community.name}
        </Link>
      </h3>

      <p className="mt-1.5 text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
        {community.tagline}
      </p>

      {/* Footer */}
      <div className="mt-5 pt-3 border-t border-border-subtle/70 flex items-center justify-between text-xs">
        <span className="text-[#64748b] flex items-center gap-1 truncate max-w-[150px]">
          📍 {community.baseLocation}
        </span>
        <span className="font-mono text-white/80 font-medium">
          {community.membersCount.toLocaleString()}+ members
        </span>
      </div>
    </article>
  );
}
