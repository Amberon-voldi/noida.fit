import Link from "next/link";
import type { Place } from "@/types/place";
import { BaseCard } from "./BaseCard";
import { MapPin, Zap, Users } from "lucide-react";

interface PlaceCardProps {
  place: Place;
}

export function PlaceCard({ place }: PlaceCardProps) {
  return (
    <BaseCard className="p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#9ddc2e]/10 text-[#9ddc2e] border border-[#9ddc2e]/20">
          {place.category}
        </span>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          {place.sector}
        </span>
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <h3 className="text-lg font-black text-white tracking-tight group-hover:text-[#9ddc2e] transition-colors line-clamp-1">
          <Link href={`/place/${place.slug}`} className="focus-visible:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {place.name}
          </Link>
        </h3>
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed font-medium">
          {place.description}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {place.amenities?.slice(0, 3).map((amenity, idx) => (
            <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
              <Zap className="w-2.5 h-2.5 text-[#9ddc2e]" />
              {amenity}
            </span>
          ))}
          {place.amenities && place.amenities.length > 3 && (
            <span className="text-[10px] font-mono text-slate-500 self-center">
              +{place.amenities.length - 3} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <MapPin className="w-3 h-3 opacity-60" />
            {place.sector}
          </span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono text-white/90 text-[11px] font-bold">
            <Users className="w-3 h-3 text-[#9ddc2e]" />
            {place.activeCommunitiesCount}{" "}
            {place.activeCommunitiesCount === 1 ? "squad" : "squads"} active
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
