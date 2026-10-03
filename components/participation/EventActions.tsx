"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUrl, refreshParticipation, useParticipation } from "./useParticipation";
import { indiaDateTime } from "@/lib/calendar";
import { CalendarPlus, Check, LoaderCircle, Share2 } from "lucide-react";
import { createIcs } from "@/lib/calendar";
import { SaveButton } from "@/components/participation/SaveButton";

export interface EventActionsProps {
  eventId: string;
  eventSlug: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  communityName?: string;
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
  const router = useRouter();
  const state = useParticipation();
  const rsvped = state.rsvps.some(rsvp => rsvp.eventId === props.eventId && rsvp.status === "confirmed");
  const started = state.loaded && indiaDateTime(props.date, props.startTime).getTime() <= state.observedAt;
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFeedback(message: string): void {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2800);
  }

  async function toggleRsvp(): Promise<void> {
    if (!state.authenticated && !state.error) { router.push(loginUrl()); return; }
    setPending(true);
    try {
      const response = await fetch("/api/participation/rsvp", {
        method: rsvped ? "DELETE" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: props.eventId }),
      });
      if (response.status === 401) {
        router.push(loginUrl());
        return;
      }
      const data = await response.json().catch(() => null) as { rsvped?: boolean; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not update RSVP");
      await refreshParticipation();
      showFeedback(data?.rsvped ? "You're going. See you there!" : "RSVP cancelled");
      router.refresh();
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "Could not update RSVP");
    } finally {
      setPending(false);
    }
  }

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
    ? "motion-press inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-white/25 hover:text-white"
    : "motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-elevated px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-white/30 hover:bg-surface-hover";

  return (
    <div className={props.compact ? "relative flex flex-wrap items-center gap-2" : "relative space-y-3"}>
      <div className={props.compact ? "flex flex-wrap items-center gap-2" : "grid grid-cols-2 gap-2"}>
        <SaveButton itemType="event" itemId={props.eventId} compact={props.compact} />
        <button
          type="button"
          onClick={toggleRsvp}
          disabled={pending || !state.loaded || started}
          aria-pressed={rsvped}
          className={`${buttonClass} ${rsvped ? "border-velocity/50 bg-velocity text-slate-950 hover:bg-velocity-glow" : "bg-velocity text-slate-950 hover:bg-velocity-glow"}`}
        >
          {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : rsvped ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          <span>{rsvped ? "You're going" : started ? "RSVP closed" : state.loaded && !state.authenticated && !state.error ? "Sign in to RSVP" : "RSVP"}</span>
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
      {feedback && <p className="text-[11px] text-velocity" role="status" aria-live="polite">{feedback}</p>}
    </div>
  );
}
