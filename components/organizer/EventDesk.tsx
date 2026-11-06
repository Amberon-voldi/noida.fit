"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Pencil, Search } from "lucide-react";
import type { OrganizerEventSummary } from "@/types/organizer";
import { OrganizerCheckInForm } from "@/components/participation/OrganizerCheckInForm";
import { formatDate } from "@/lib/config";
import { checkInLabel } from "./labels";

type Filter = "all" | "waiting" | "in";
const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** A single event's check-in desk: scan, see the result, and watch the guest list fill in. */
export function EventDesk({ summary }: { summary: OrganizerEventSummary }) {
  const { event, attendees } = summary;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const waiting = summary.confirmedRsvps - summary.checkedIn;
  const capacity = summary.capacityRemaining === null ? null : summary.confirmedRsvps + summary.capacityRemaining;
  const percent = summary.confirmedRsvps ? Math.round((summary.checkedIn / summary.confirmedRsvps) * 100) : 0;
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return attendees.filter(attendee =>
      (filter === "all" || (filter === "in") === (attendee.checkInStatus === "checked_in"))
      && (!needle || attendee.displayName.toLowerCase().includes(needle)));
  }, [attendees, filter, query]);

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
    <Link href="/organizer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-white"><ArrowLeft size={16} aria-hidden="true" />All sessions</Link>
    <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className={`font-mono text-xs uppercase tracking-widest ${summary.checkInWindow === "open" ? "text-velocity" : "text-text-secondary"}`}>{checkInLabel(summary.checkInWindow)}</p>
        <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{event.title}</h1>
        <p className="mt-2 text-sm text-text-secondary">{formatDate(event.date)} · {event.startTime}–{event.endTime} · {event.venueName}, {event.sector}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/organizer/events/${encodeURIComponent(event.id)}/edit`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-strong px-4 text-sm font-semibold text-white hover:bg-surface-hover"><Pencil size={14} aria-hidden="true" />Edit session</Link>
        {event.status === "published" && <Link href={`/event/${event.slug}`} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-velocity">Public page <ArrowUpRight size={15} aria-hidden="true" /></Link>}
      </div>
    </header>

    <section className="mt-6 rounded-xl border border-border-subtle bg-surface p-5" aria-label="Attendance so far">
      <dl className="grid grid-cols-3 gap-3 text-center sm:text-left">
        <div><dt className="text-xs uppercase tracking-widest text-text-secondary">Checked in</dt><dd className="mt-1 text-3xl font-extrabold text-velocity">{summary.checkedIn}</dd></div>
        <div><dt className="text-xs uppercase tracking-widest text-text-secondary">Still to arrive</dt><dd className="mt-1 text-3xl font-extrabold text-white">{waiting}</dd></div>
        <div><dt className="text-xs uppercase tracking-widest text-text-secondary">RSVPs</dt><dd className="mt-1 text-3xl font-extrabold text-white">{summary.confirmedRsvps}{capacity !== null && <span className="text-base font-semibold text-text-secondary"> / {capacity}</span>}</dd></div>
      </dl>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Share of RSVPs checked in" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-full rounded-full bg-velocity transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-2xl border border-border-strong bg-surface p-4 sm:p-6" aria-labelledby="desk-heading">
        <h2 id="desk-heading" className="text-xl font-bold text-white">Scan .fit IDs</h2>
        <p className="mt-1 mb-4 text-sm leading-relaxed text-text-secondary">Ask each person to open their .fit ID and flip it to the check-in QR. Only people on this event’s RSVP list can be checked in.</p>
        <OrganizerCheckInForm event={{ id: event.id, title: event.title, checkInWindow: summary.checkInWindow, checkedIn: summary.checkedIn, confirmedRsvps: summary.confirmedRsvps }} />
      </section>

      <section className="min-w-0" aria-labelledby="guests-heading">
        <h2 id="guests-heading" className="text-xl font-bold text-white">Guest list</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="relative min-w-0 flex-1 basis-48">
            <span className="sr-only">Search guests by name</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <input type="search" value={query} onChange={change => setQuery(change.target.value)} placeholder="Search by name" className="min-h-11 w-full rounded-lg border border-border-strong bg-surface-elevated pl-9 pr-3 text-base text-white" />
          </label>
          <div className="flex rounded-lg border border-border-strong p-1" role="group" aria-label="Filter guests">
            {([["all", `All ${summary.confirmedRsvps}`], ["waiting", `To arrive ${waiting}`], ["in", `In ${summary.checkedIn}`]] as const).map(([value, label]) =>
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${filter === value ? "bg-velocity text-slate-950" : "text-text-secondary hover:text-white"}`}>{label}</button>)}
          </div>
        </div>
        {visible.length ? <ul className="mt-3 divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface">
          {visible.map((attendee, index) => <li key={`${attendee.displayName}-${attendee.seatNumber ?? index}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-white">{attendee.displayName}</span>
              {attendee.seatNumber !== undefined && <span className="block text-xs text-text-secondary">Spot #{attendee.seatNumber}</span>}
            </span>
            {attendee.checkInStatus === "checked_in"
              ? <span className="shrink-0 rounded-full bg-velocity/15 px-2.5 py-1 text-xs font-semibold text-velocity">In{attendee.checkedInAt ? ` · ${timeFormatter.format(new Date(attendee.checkedInAt))}` : ""}</span>
              : <span className="shrink-0 rounded-full border border-border-subtle px-2.5 py-1 text-xs text-text-secondary">Not yet</span>}
          </li>)}
        </ul> : <p className="mt-3 rounded-xl border border-dashed border-border-strong p-5 text-sm text-text-secondary">{summary.confirmedRsvps ? "No guests match." : "No confirmed RSVPs yet. Share the event page so people can RSVP."}</p>}
        <p className="mt-3 text-xs text-text-secondary">Only names and attendance are shown. Contact details and account IDs stay private.</p>
      </section>
    </div>
  </div>;
}
