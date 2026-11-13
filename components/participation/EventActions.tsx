"use client";

import Link from "next/link";
import { CalendarPlus, Check, LoaderCircle, Share2 } from "lucide-react";
import { createIcs } from "@/lib/calendar";
import { formatInr } from "@/lib/pricing";
import { SaveButton } from "@/components/participation/SaveButton";
import { TicketCheckout } from "./TicketCheckout";
import { useEventBooking } from "./useEventBooking";

export interface EventActionsProps {
  eventId: string;
  eventSlug: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  communityName?: string;
  price: string;
  /** Display date and time, e.g. "Sat, 15 Nov · 06:00 AM". */
  when: string;
  compact?: boolean;
}

function downloadCalendarEvent(props: EventActionsProps): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const calendar = createIcs(props);
  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${props.eventSlug}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function EventActions(props: EventActionsProps) {
  const { pricing, booking, pending, feedback, confirmCancel, label, act, showFeedback, disabled, checkout } = useEventBooking(props);
  const rsvped = Boolean(booking);

  async function shareEvent(): Promise<void> {
    const url = `${window.location.origin}/event/${props.eventSlug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: props.title, text: `${props.title} at ${props.venueName}`, url });
        showFeedback("Event shared");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showFeedback("Event link copied");
      } else {
        showFeedback("Copy the event URL from your browser");
      }
    } catch {
      // Native share cancellation is intentionally silent.
    }
  }

  const buttonClass = props.compact
    ? "motion-press inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-velocity hover:text-white"
    : "motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-elevated px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-velocity hover:bg-surface-hover";

  return (
    <div className={props.compact ? "relative flex flex-wrap items-center gap-2" : "relative space-y-3"}>
      <div className={props.compact ? "flex flex-wrap items-center gap-2" : "grid grid-cols-2 gap-2"}>
        <SaveButton itemType="event" itemId={props.eventId} compact={props.compact} />
        <button
          type="button"
          onClick={act}
          disabled={disabled}
          aria-pressed={rsvped}
          className={`${buttonClass} ${confirmCancel ? "border-rose-400 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25" : rsvped ? "border-velocity bg-velocity text-slate-950 hover:bg-velocity-glow" : "bg-velocity text-slate-950 hover:bg-velocity-glow"}`}
        >
          {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : rsvped ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          <span>{label}</span>
        </button>
        {!props.compact && (
          <>
            <button type="button" onClick={shareEvent} className={buttonClass}>
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Share</span>
            </button>
            <button type="button" onClick={() => { try { downloadCalendarEvent(props); } catch { showFeedback("Calendar details unavailable. Please check the event schedule."); } }} className={buttonClass}>
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add to calendar</span>
            </button>
          </>
        )}
      </div>
      {booking?.amount && !props.compact && <p className="text-xs leading-relaxed text-text-secondary">Spot #{booking.seatNumber} · <span className="font-semibold text-white">{formatInr(booking.amount)} {booking.paymentStatus === "paid" ? "paid" : "due"}</span>{booking.paymentStatus === "paid" ? "." : ". Online payment isn’t open yet, so pay the organizer at the event."}</p>}
      {rsvped && !props.compact && <p className="text-xs leading-relaxed text-text-secondary">On the day, open your <Link href="/account" className="font-semibold text-velocity underline-offset-2 hover:underline">.fit ID</Link> and show the check-in QR on its back to the organizer.</p>}
      {feedback && <p className="text-[11px] text-velocity" role="status" aria-live="polite">{feedback}</p>}
      <TicketCheckout open={checkout.open} title={props.title} when={props.when} venueName={props.venueName} priceLabel={pricing.label} pending={pending} error={checkout.error} onConfirm={checkout.confirm} onClose={checkout.close} />
    </div>
  );
}
