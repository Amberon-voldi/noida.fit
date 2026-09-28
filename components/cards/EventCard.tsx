import Link from "next/link";
import type { Event } from "@/types/event";
import { CATEGORY_LABELS, formatDate } from "@/lib/config";
import { BaseCard } from "./BaseCard";
import { CalendarDays, MapPin } from "lucide-react";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category;

  // Extract day and month for the date block
  const dateObj = new Date(event.date);
  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = dateObj.toLocaleString("en-US", { month: "short" }).toUpperCase();

  return (
    <BaseCard className="h-full">
      <div className="p-5 h-full flex flex-col">
        {/* Header: Date Block + Category */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center rounded-lg bg-white/5 border border-white/10 px-2 py-1 min-w-[48px] text-center">
              <span className="text-lg font-black text-white leading-none">{day}</span>
              <span className="text-[10px] font-mono font-bold text-[#9ddc2e] uppercase leading-tight">{month}</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {event.startTime}
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                {formatDate(event.date)}
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#9ddc2e]/10 text-[#9ddc2e] border border-[#9ddc2e]/20">
            {categoryLabel}
          </span>
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="text-lg font-black text-white tracking-tight group-hover:text-[#9ddc2e] transition-colors line-clamp-2 leading-tight mb-2">
            <Link href={`/event/${event.slug}`} className="focus-visible:outline-none">
              <span className="absolute inset-0" aria-hidden="true" />
              {event.title}
            </Link>
          </h3>

          <p className="text-sm text-slate-400 flex items-center gap-1.5 truncate font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            {event.venueName}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium truncate max-w-[160px] flex items-center gap-1">
            <CalendarDays className="w-3 h-3 opacity-60" />
            {event.communityName}
          </span>
          <span
            className={`font-mono font-bold px-2 py-1 rounded-md text-[11px] transition-all duration-300 ${
              event.price === "FREE"
                ? "bg-[#9ddc2e]/20 text-[#9ddc2e] border border-[#9ddc2e]/30 shadow-[0_0_10px_rgba(157,220,46,0.1)]"
                : "bg-white/5 text-white border border-white/10"
            }`}
          >
            {event.price}
          </span>
        </div>
      </div>
    </BaseCard>
  );
}
