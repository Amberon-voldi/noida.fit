import Link from "next/link";
import type { Event } from "@/types/event";
import { CATEGORY_LABELS, formatDate } from "@/lib/config";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category;

  return (
    <article className="group relative flex flex-col bg-surface/80 hover:bg-surface-elevated rounded-2xl border border-border-subtle hover:border-white/20 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-lg">
      <div className="flex flex-col flex-1 p-5">
        {/* Date + Category row */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#94a3b8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9ddc2e]" />
            {formatDate(event.date)} · {event.startTime}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-white/[0.05] text-[#94a3b8] border border-white/5">
            {categoryLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-[#9ddc2e] transition-colors line-clamp-2 leading-snug">
          <Link href={`/event/${event.slug}`} className="focus-visible:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {event.title}
          </Link>
        </h3>

        {/* Location */}
        <p className="mt-2 text-xs text-[#94a3b8] flex items-center gap-1 truncate">
          <span className="text-[#64748b]">📍</span>
          {event.venueName}
        </p>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-border-subtle/70 flex items-center justify-between text-xs">
          <span className="text-[#64748b] font-medium truncate max-w-[170px]">
            {event.communityName}
          </span>
          <span
            className={`font-mono font-semibold px-2 py-0.5 rounded-full text-[11px] ${
              event.price === "FREE"
                ? "bg-[#9ddc2e]/10 text-[#9ddc2e] border border-[#9ddc2e]/20"
                : "bg-white/5 text-white"
            }`}
          >
            {event.price}
          </span>
        </div>
      </div>
    </article>
  );
}
