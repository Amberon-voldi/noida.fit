import Link from "next/link";
import type { Event } from "@/types/event";
import { CATEGORY_LABELS, formatDate } from "@/lib/config";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category;

  return (
    <article className="group relative flex flex-col bg-surface rounded-xl border border-border-subtle hover:border-border-strong transition-colors duration-200 overflow-hidden">
      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Date + Category row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-text-muted font-medium">
            {formatDate(event.date)} · {event.startTime}
          </span>
          <span className="text-xs text-text-muted font-medium">{categoryLabel}</span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-white group-hover:text-slate-200 transition-colors line-clamp-2 leading-snug">
          <Link href={`/event/${event.slug}`} className="focus-visible:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {event.title}
          </Link>
        </h3>

        {/* Location */}
        <p className="mt-2 text-xs text-text-muted truncate">{event.venueName}</p>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border-subtle/50 flex items-center justify-between">
          <span className="text-xs text-text-muted">{event.communityName}</span>
          <span
            className={`text-xs font-semibold ${
              event.price === "FREE" ? "text-white" : "text-text-secondary"
            }`}
          >
            {event.price}
          </span>
        </div>
      </div>
    </article>
  );
}
