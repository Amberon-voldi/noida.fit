"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Copy, CopyPlus, Download, Gift, LayoutDashboard, Pencil, ScanLine, Search, Share2, UsersRound, type LucideIcon } from "lucide-react";
import type { GiftLink, OrganizerEventSummary } from "@/types/organizer";
import { OrganizerCheckInForm } from "@/components/participation/OrganizerCheckInForm";
import { formatDate, SITE_CONFIG } from "@/lib/config";
import { guestListCsv, guestTicketLabel } from "@/lib/guest-csv";
import { formatInr, parseEventPrice, TICKET_HOLD_MINUTES } from "@/lib/pricing";
import { checkInLabel, type DashboardTab } from "./labels";
import { GiftLinks } from "./GiftLinks";

const tabs: Array<{ id: DashboardTab; label: string; Icon: LucideIcon }> = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "guests", label: "Guests", Icon: UsersRound },
  { id: "checkin", label: "Check-in", Icon: ScanLine },
  { id: "gifts", label: "Gift links", Icon: Gift },
];

type Filter = "all" | "waiting" | "in" | "paid" | "gift";
const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Stat({ label, value, detail, accent = false, percent }: { label: string; value: string; detail: string; accent?: boolean; percent?: number }) {
  return <div className="min-w-0 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
    <dt className="text-xs uppercase tracking-widest text-text-secondary">{label}</dt>
    <dd className={`mt-2 text-3xl font-extrabold ${accent ? "text-velocity" : "text-white"}`}>{value}</dd>
    <dd className="mt-1 text-xs text-text-secondary">{detail}</dd>
    {percent !== undefined && <dd className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full rounded-full bg-velocity" style={{ width: `${Math.min(100, percent)}%` }} /></dd>}
  </div>;
}

/** One session, everything an organizer runs it with: numbers, guests, the check-in desk and gift links. */
export function EventDashboard({ summary, giftLinks, initialTab }: { summary: OrganizerEventSummary; giftLinks: GiftLink[] | null; initialTab: DashboardTab }) {
  const { event, attendees } = summary;
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState(false);
  const pricing = parseEventPrice(event.price);
  const published = event.status === "published";
  const publicUrl = `${SITE_CONFIG.url}/event/${event.slug}`;
  const waiting = summary.confirmedRsvps - summary.checkedIn;
  const capacity = summary.capacityRemaining === null ? null : summary.confirmedRsvps + summary.capacityRemaining;
  const showUp = summary.confirmedRsvps ? Math.round((summary.checkedIn / summary.confirmedRsvps) * 100) : 0;
  const paidCount = attendees.filter(attendee => attendee.ticket?.paid).length;
  const activeGiftLinks = giftLinks?.filter(link => link.status === "active").length ?? 0;
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return attendees.filter(attendee => {
      const match = filter === "all" ? true : filter === "in" ? attendee.checkInStatus === "checked_in" : filter === "waiting" ? attendee.checkInStatus !== "checked_in" : filter === "paid" ? attendee.ticket?.paid === true : Boolean(attendee.gift);
      return match && (!needle || attendee.displayName.toLowerCase().includes(needle) || attendee.gift?.label?.toLowerCase().includes(needle));
    });
  }, [attendees, filter, query]);

  // On a phone the tab row scrolls sideways: keep the open tab in view, including a deep-linked one.
  useEffect(() => { document.getElementById(`tab-${tab}`)?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [tab]);

  function choose(next: DashboardTab): void {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  async function copyLink(): Promise<void> {
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* The link stays visible to copy by hand. */ }
  }
  async function shareLink(): Promise<void> {
    if (!navigator.share) { await copyLink(); return; }
    try { await navigator.share({ title: event.title, text: `${event.title} · ${formatDate(event.date)}, ${event.startTime}`, url: publicUrl }); } catch { /* Cancelled. */ }
  }
  function exportCsv(): void {
    const blob = new Blob([guestListCsv(attendees)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event.slug}-guests.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const filters: Array<[Filter, string]> = [["all", `All ${summary.confirmedRsvps}`], ["waiting", `To arrive ${waiting}`], ["in", `In ${summary.checkedIn}`]];
  if (paidCount) filters.push(["paid", `Paid ${paidCount}`]);
  if (summary.giftsClaimed) filters.push(["gift", `Gifts ${summary.giftsClaimed}`]);

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
    <Link href="/organizer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-white"><ArrowLeft size={16} aria-hidden="true" />All sessions</Link>
    <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className={`font-mono text-xs uppercase tracking-widest ${summary.checkInWindow === "open" ? "text-velocity" : "text-text-secondary"}`}>{event.status === "draft" ? "Draft" : checkInLabel(summary.checkInWindow)}</p>
        <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{event.title}</h1>
        <p className="mt-2 text-sm text-text-secondary">{formatDate(event.date)} · {event.startTime}–{event.endTime} · {event.venueName}, {event.sector} · {pricing.label}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/organizer/events/${encodeURIComponent(event.id)}/edit`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-strong px-4 text-sm font-semibold text-white hover:bg-surface-hover"><Pencil size={14} aria-hidden="true" />Edit</Link>
        <Link href={`/organizer/events/new?from=${encodeURIComponent(event.id)}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-strong px-4 text-sm font-semibold text-white hover:bg-surface-hover"><CopyPlus size={14} aria-hidden="true" />Duplicate</Link>
        {published && <Link href={`/event/${event.slug}`} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-velocity">Public page <ArrowUpRight size={15} aria-hidden="true" /></Link>}
      </div>
    </header>

    <div role="tablist" aria-label="Session dashboard" className="organizer-tabs mt-6 flex gap-1 overflow-x-auto border-b border-border-subtle">
      {tabs.map(({ id, label, Icon }) => <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => choose(id)}
        className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors sm:px-4 ${tab === id ? "border-velocity text-white" : "border-transparent text-text-secondary hover:text-white"}`}>
        <Icon size={16} className="hidden sm:block" aria-hidden="true" />{label}
        {id === "guests" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{summary.confirmedRsvps}</span>}
        {id === "gifts" && activeGiftLinks > 0 && <span className="rounded-full bg-velocity/20 px-2 py-0.5 text-xs text-velocity">{activeGiftLinks}</span>}
      </button>)}
    </div>

    {tab === "overview" && <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="mt-6 space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Going" value={capacity === null ? String(summary.confirmedRsvps) : `${summary.confirmedRsvps} / ${capacity}`} detail={capacity === null ? "No capacity limit" : summary.capacityRemaining ? `${summary.capacityRemaining} spot${summary.capacityRemaining === 1 ? "" : "s"} left` : "Full"} percent={capacity ? (summary.confirmedRsvps / capacity) * 100 : undefined} />
        <Stat label="Checked in" value={String(summary.checkedIn)} detail={summary.confirmedRsvps ? `${showUp}% of guests` : "No guests yet"} accent percent={summary.confirmedRsvps ? showUp : undefined} />
        {pricing.kind === "paid" || summary.revenue ? <Stat label="Ticket revenue" value={formatInr(summary.revenue)} detail={`${paidCount} paid ticket${paidCount === 1 ? "" : "s"}${summary.payingNow ? ` · ${summary.payingNow} paying now` : ""}`} />
          : <Stat label="Still to arrive" value={String(waiting)} detail="Free session" />}
        <Stat label="Gifted spots" value={String(summary.giftsClaimed)} detail={giftLinks === null ? "Gift links are off" : `${activeGiftLinks} active link${activeGiftLinks === 1 ? "" : "s"}`} />
      </dl>
      {summary.payingNow > 0 && <p className="text-xs text-text-secondary">{summary.payingNow} seat{summary.payingNow === 1 ? " is" : "s are"} held for people paying right now. A hold lasts {TICKET_HOLD_MINUTES} minutes and only counts as going once the payment goes through.</p>}

      <section className="rounded-xl border border-border-subtle bg-surface p-5" aria-labelledby="share-heading">
        <h2 id="share-heading" className="text-lg font-bold text-white">Share this session</h2>
        {published ? <>
          <p className="mt-1 text-sm text-text-secondary">Post the link anywhere: it previews with your banner.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input readOnly value={publicUrl} aria-label="Public link" onFocus={focus => focus.currentTarget.select()} className="min-h-11 min-w-0 flex-1 basis-64 rounded-lg border border-border-strong bg-surface-elevated px-3 font-mono text-sm text-white" />
            <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-strong px-4 text-sm font-semibold text-white hover:bg-surface-hover">{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? "Copied" : "Copy"}</button>
            <button type="button" onClick={shareLink} className="button-primary inline-flex min-h-11 items-center gap-1.5 px-4"><Share2 size={15} aria-hidden="true" />Share</button>
          </div>
        </> : <p className="mt-1 text-sm text-text-secondary">{event.status === "cancelled" ? "This session is cancelled." : "This session is a draft. Publish it from Edit to share it and take bookings."}</p>}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {([
          { id: "checkin", title: "Open the check-in desk", text: checkInLabel(summary.checkInWindow), Icon: ScanLine },
          { id: "guests", title: "See the guest list", text: `${summary.confirmedRsvps} going · export to CSV`, Icon: UsersRound },
          { id: "gifts", title: "Invite someone free", text: "Gift links for guests, creators and partners", Icon: Gift },
        ] satisfies Array<{ id: DashboardTab; title: string; text: string; Icon: LucideIcon }>).map(({ id, title, text, Icon }) =>
          <button key={id} type="button" onClick={() => choose(id)} className="motion-press flex min-h-20 items-start gap-3 rounded-xl border border-border-subtle bg-surface p-4 text-left hover:border-velocity/60">
            <Icon className="mt-0.5 size-5 shrink-0 text-velocity" aria-hidden="true" />
            <span><span className="block font-semibold text-white">{title}</span><span className="mt-0.5 block text-xs text-text-secondary">{text}</span></span>
          </button>)}
      </div>
    </div>}

    {tab === "guests" && <section id="panel-guests" role="tabpanel" aria-labelledby="tab-guests" className="mt-6">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-1 basis-48">
          <span className="sr-only">Search guests by name</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <input type="search" value={query} onChange={change => setQuery(change.target.value)} placeholder="Search by name" className="min-h-11 w-full rounded-lg border border-border-strong bg-surface-elevated pl-9 pr-3 text-base text-white" />
        </label>
        <button type="button" onClick={exportCsv} disabled={!attendees.length} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-strong px-4 text-sm font-semibold text-white hover:bg-surface-hover disabled:opacity-50"><Download size={15} aria-hidden="true" />Export CSV</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 rounded-lg" role="group" aria-label="Filter guests">
        {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-9 rounded-md border px-3 text-xs font-semibold ${filter === value ? "border-velocity bg-velocity text-slate-950" : "border-border-strong text-text-secondary hover:text-white"}`}>{label}</button>)}
      </div>
      {visible.length ? <ul className="mt-3 divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface">
        {visible.map((attendee, index) => <li key={`${attendee.displayName}-${attendee.seatNumber ?? index}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium text-white">{attendee.displayName}</span>
            <span className="block text-xs text-text-secondary">{[attendee.seatNumber !== undefined && `Spot #${attendee.seatNumber}`, (attendee.ticket || attendee.gift) && guestTicketLabel(attendee)].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {attendee.gift && <Gift size={15} className="text-velocity" aria-label="Gifted spot" />}
            {attendee.checkInStatus === "checked_in"
              ? <span className="rounded-full bg-velocity/15 px-2.5 py-1 text-xs font-semibold text-velocity">In{attendee.checkedInAt ? ` · ${timeFormatter.format(new Date(attendee.checkedInAt))}` : ""}</span>
              : <span className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-text-secondary">Not yet</span>}
          </span>
        </li>)}
      </ul> : <p className="mt-3 rounded-xl border border-dashed border-border-strong p-5 text-sm text-text-secondary">{summary.confirmedRsvps ? "No guests match." : "No one is going yet. Share the session, or invite people with a gift link."}</p>}
      <p className="mt-3 text-xs text-text-secondary">Only names, spots and attendance are shown or exported. Contact details and account IDs stay private.</p>
    </section>}

    {tab === "checkin" && <section id="panel-checkin" role="tabpanel" aria-labelledby="tab-checkin" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-2xl border border-border-strong bg-surface p-4 sm:p-6">
        <h2 className="text-xl font-bold text-white">Scan .fit IDs</h2>
        <p className="mt-1 mb-4 text-sm leading-relaxed text-text-secondary">Ask each person to open their .fit ID and flip it to the check-in QR. Only people going to this session can be checked in, including gifted spots.</p>
        <OrganizerCheckInForm event={{ id: event.id, title: event.title, checkInWindow: summary.checkInWindow, checkedIn: summary.checkedIn, confirmedRsvps: summary.confirmedRsvps }} />
      </div>
      <dl className="grid h-fit grid-cols-2 gap-3">
        <Stat label="Checked in" value={String(summary.checkedIn)} detail={`${showUp}% of guests`} accent percent={showUp} />
        <Stat label="Still to arrive" value={String(waiting)} detail={`${summary.confirmedRsvps} going`} />
      </dl>
    </section>}

    {tab === "gifts" && <section id="panel-gifts" role="tabpanel" aria-labelledby="tab-gifts" className="mt-6">
      <GiftLinks eventId={event.id} eventTitle={event.title} published={published} initialLinks={giftLinks} attendees={attendees} paidLabel={pricing.kind === "paid" ? pricing.label : undefined} />
    </section>}
  </div>;
}
