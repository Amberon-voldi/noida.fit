import Link from "next/link";
import type { Community } from "@/types/community";
import { CATEGORY_LABELS } from "@/lib/config";
import { BaseCard } from "./BaseCard";
import { CheckCircle2 } from "lucide-react";

interface CommunityCardProps {
  community: Community;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const categoryLabel = CATEGORY_LABELS[community.category] ?? community.category;

  return (
    <BaseCard className="p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#9ddc2e]/10 text-[#9ddc2e] border border-[#9ddc2e]/20">
          {categoryLabel}
        </span>
        {community.verified && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#9ddc2e] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>VERIFIED</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <h3 className="text-lg font-black text-white tracking-tight group-hover:text-[#9ddc2e] transition-colors line-clamp-1">
          <Link href={`/community/${community.slug}`} className="focus-visible:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {community.name}
          </Link>
        </h3>
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed font-medium">
          {community.tagline}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-500 flex items-center gap-1.5 truncate max-w-[140px] font-medium">
          <span className="opacity-50">📍</span> {community.baseLocation}
        </span>
        <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono text-white/90 text-[11px] font-bold">
          {community.membersCount.toLocaleString()}+ members
        </div>
      </div>
    </BaseCard>
  );
}
