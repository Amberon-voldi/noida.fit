"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Copy, CopyPlus, Download, Gift, LayoutDashboard, LoaderCircle, MessageCircle, Pencil, Phone, ScanLine, Search, Share2, TicketPercent, UsersRound, type LucideIcon } from "lucide-react";
import type { GiftLink, OrganizerAttendee, OrganizerEventSummary } from "@/types/organizer";
import { OrganizerCheckInForm } from "@/components/participation/OrganizerCheckInForm";
import { formatDate, SITE_CONFIG } from "@/lib/config";
import { guestListCsv, guestTicketLabel } from "@/lib/guest-csv";
import { formatIndianMobile } from "@/lib/phone";
import { formatInr, parseEventPrice, TICKET_HOLD_MINUTES } from "@/lib/pricing";
import { checkInLabel, type DashboardTab } from "./labels";
import { GiftLinks } from "./GiftLinks";
import { CouponManager } from "./CouponManager";
import type { EditableCoupon } from "@/lib/coupon-schema";
import type { MetricTotals } from "@/lib/metrics";

const tabs: Array<{ id: DashboardTab; label: string; Icon: LucideIcon }> = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "guests", label: "Guests", Icon: UsersRound },
  { id: "checkin", label: "Check-in", Icon: ScanLine },
  { id: "gifts", label: "Gift links", Icon: Gift },
  { id: "coupons", label: "Discount codes", Icon: TicketPercent },
];

type Filter = "all" | "waiting" | "in" | "paid" | "due" | "gift";
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
/** `guestPasses`: gift links can let people claim without an account (the gift guest table is set up). */
export function EventDashboard({ summary, giftLinks, guestPasses, coupons, activity, initialTab }: { summary: OrganizerEventSummary; giftLinks: GiftLink[] | null; guestPasses: boolean; coupons: EditableCoupon[]; activity: MetricTotals | null; initialTab: DashboardTab }) {
  const { event, attendees } = summary;
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<{ pass: string; message: string } | null>(null);
  const [paying, setPaying] = useState<number | null>(null);
  const [payError, setPayError] = useState<{ seat: number; message: string } | null>(null);
  const pricing = parseEventPrice(event.price);
  const published = event.status === "published";
  const publicUrl = `${SITE_CONFIG.url}/event/${event.slug}`;
  const waiting = summary.confirmedRsvps - summary.checkedIn;
  const capacity = summary.capacityRemaining === null ? null : summary.confirmedRsvps + summary.capacityRemaining;
  const showUp = summary.confirmedRsvps ? Math.round((summary.checkedIn / summary.confirmedRsvps) * 100) : 0;
  const paidCount = attendees.filter(attendee => attendee.ticket?.paid).length;
  const dueCount = attendees.filter(attendee => attendee.ticket?.paid === false).length;
  const activeGiftLinks = giftLinks?.filter(link => link.status === "active").length ?? 0;
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    return attendees.filter(attendee => {
      const match = filter === "all" ? true : filter === "in" ? attendee.checkInStatus === "checked_in" : filter === "waiting" ? attendee.checkInStatus !== "checked_in" : filter === "paid" ? attendee.ticket?.paid === true : filter === "due" ? attendee.ticket?.paid === false : Boolean(attendee.gift);
      return match && (!needle || attendee.displayName.toLowerCase().includes(needle) || attendee.gift?.label?.toLowerCase().includes(needle) || (digits.length >= 3 && Boolean(attendee.guest?.phone.includes(digits) || attendee.whatsapp?.includes(digits))));
    });
  }, [attendees, filter, query]);

  /** A WhatsApp chat with a member who booked to pay later, opened with a message to paste their payment link into. */
  function whatsappChat(attendee: OrganizerAttendee & { whatsapp: string }): string {
    const spot = attendee.seatNumber === undefined ? "spot" : `spot #${attendee.seatNumber}`;
    const amount = attendee.ticket && !attendee.ticket.paid ? ` Here’s your link to pay ${formatInr(attendee.ticket.amount)}: ` : "";
    return `https://wa.me/91${attendee.whatsapp}?text=${encodeURIComponent(`Hi ${attendee.displayName}, your ${spot} for ${event.title} on ${formatDate(event.date)} is confirmed.${amount}`)}`;
  }

  /** Guests without an account can be checked in from the list too, e.g. when their phone is flat. */
  async function checkInGuest(pass: string): Promise<void> {
    setChecking(pass); setCheckError(null);
    try {
      const response = await fetch("/api/check-in/organizer", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: event.id, guestPass: pass }) });
      const data = await response.json().catch(() => null) as { checkedIn?: boolean; error?: string } | null;
      if (!response.ok || !data?.checkedIn) { setCheckError({ pass, message: data?.error || "Check-in didn’t go through. Try again." }); return; }
      router.refresh();
    } catch {
      setCheckError({ pass, message: "Nothing was recorded. Check the connection and try again." });
    } finally {
      setChecking(null);
    }
  }

  /** Marks a guest's ticket paid (e.g. through the WhatsApp link) or back to still due, by its spot. */
  async function setPaid(seatNumber: number, paid: boolean): Promise<void> {
    setPaying(seatNumber); setPayError(null);
    try {
      const response = await fetch(`/api/organizer/events/${encodeURIComponent(event.id)}/payments`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seatNumber, paid }) });
      const data = await response.json().catch(() => null) as { paid?: boolean; error?: string } | null;
      if (!response.ok || data?.paid !== paid) { setPayError({ seat: seatNumber, message: data?.error || "The payment status didn’t save. Try again." }); return; }
      router.refresh();
    } catch {
      setPayError({ seat: seatNumber, message: "Nothing was saved. Check the connection and try again." });
    } finally {
      setPaying(null);
    }
  }

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
  if (dueCount) filters.push(["due", `Payment due ${dueCount}`]);
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
        {id === "coupons" && coupons.length > 0 && <span className="rounded-full bg-velocity/20 px-2 py-0.5 text-xs text-velocity">{coupons.length}</span>}
      </button>)}
    </div>

    {tab === "overview" && <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="mt-6 space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Going" value={capacity === null ? String(summary.confirmedRsvps) : `${summary.confirmedRsvps} / ${capacity}`} detail={capacity === null ? "No capacity limit" : summary.capacityRemaining ? `${summary.capacityRemaining} spot${summary.capacityRemaining === 1 ? "" : "s"} left` : "Full"} percent={capacity ? (summary.confirmedRsvps / capacity) * 100 : undefined} />
        <Stat label="Checked in" value={String(summary.checkedIn)} detail={summary.confirmedRsvps ? `${showUp}% of guests` : "No guests yet"} accent percent={summary.confirmedRsvps ? showUp : undefined} />
        {pricing.kind === "paid" || summary.revenue ? <Stat label="Ticket revenue" value={formatInr(summary.revenue)} detail={`${paidCount} paid ticket${paidCount === 1 ? "" : "s"}${dueCount ? ` · ${dueCount} payment${dueCount === 1 ? "" : "s"} due` : ""}${summary.payingNow ? ` · ${summary.payingNow} paying now` : ""}`} />
          : <Stat label="Still to arrive" value={String(waiting)} detail="Free session" />}
        <Stat label="Gifted spots" value={String(summary.giftsClaimed)} detail={giftLinks === null ? "Gift links are off" : `${activeGiftLinks} active link${activeGiftLinks === 1 ? "" : "s"}`} />
      </dl>
      {summary.payingNow > 0 && <p className="text-xs text-text-secondary">{summary.payingNow} seat{summary.payingNow === 1 ? " is" : "s are"} held for people paying right now. A hold lasts {TICKET_HOLD_MINUTES} minutes and only counts as going once the payment goes through.</p>}

      {activity && <section className="rounded-xl border border-border-subtle bg-surface p-5" aria-labelledby="activity-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="activity-heading" className="text-lg font-bold text-white">Page activity</h2>
          <p className="text-xs text-text-secondary">Last 30 days · people counted once a day</p>
        </div>
        <ol className="mt-4 space-y-3">
          {(pricing.kind === "paid" ? [
            { label: "Visited the page", people: activity.view_people, detail: `${activity.view} view${activity.view === 1 ? "" : "s"}` },
            { label: "Tapped Get ticket", people: activity.cta_people, detail: `${activity.cta} tap${activity.cta === 1 ? "" : "s"}` },
            { label: "Tapped Pay", people: activity.pay_people, detail: `${activity.pay} tap${activity.pay === 1 ? "" : "s"}` },
            { label: "Paid", people: paidCount, detail: formatInr(summary.revenue) },
          ] : [
            { label: "Visited the page", people: activity.view_people, detail: `${activity.view} view${activity.view === 1 ? "" : "s"}` },
            { label: "Tapped RSVP", people: activity.cta_people, detail: `${activity.cta} tap${activity.cta === 1 ? "" : "s"}` },
            { label: "Going", people: summary.confirmedRsvps, detail: summary.giftsClaimed ? `${summary.giftsClaimed} gifted` : "" },
          ]).map((step, index, steps) => {
            const top = Math.max(1, steps[0].people);
            const previous = index ? steps[index - 1].people : 0;
            return <li key={step.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-white">{step.label}{step.detail && <span className="text-text-secondary"> · {step.detail}</span>}</span>
                <span className="shrink-0 font-mono font-bold text-white">{step.people}{index > 0 && <span className="ml-1.5 font-sans text-xs font-normal text-text-secondary">{previous ? `${Math.round((step.people / previous) * 100)}%` : "—"}</span>}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full rounded-full bg-velocity" style={{ width: `${Math.min(100, (step.people / top) * 100)}%`, minWidth: step.people ? 4 : 0 }} /></div>
            </li>;
          })}
        </ol>
      </section>}

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
          <span className="sr-only">Search guests by name, or a guest’s mobile number</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <input type="search" value={query} onChange={change => setQuery(change.target.value)} placeholder="Search by name or mobile" className="min-h-11 w-full rounded-lg border border-border-strong bg-surface-elevated pl-9 pr-3 text-base text-white" />
        </label>
        <button type="button" onClick={exportCsv} disabled={!attendees.length} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-strong px-4 text-sm font-semibold text-white hover:bg-surface-hover disabled:opacity-50"><Download size={15} aria-hidden="true" />Export CSV</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 rounded-lg" role="group" aria-label="Filter guests">
        {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-9 rounded-md border px-3 text-xs font-semibold ${filter === value ? "border-velocity bg-velocity text-slate-950" : "border-border-strong text-text-secondary hover:text-white"}`}>{label}</button>)}
      </div>
      {visible.length ? <ul className="mt-3 divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface">
        {visible.map((attendee, index) => <li key={attendee.guest?.pass ?? `${attendee.displayName}-${attendee.seatNumber ?? index}`} className="px-4 py-2 text-sm">
          <div className="flex min-h-10 items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium text-white">{attendee.displayName}</span>
                {attendee.guest && <span className="shrink-0 rounded-full border border-border-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Guest pass</span>}
              </span>
              <span className="block text-xs text-text-secondary">
                {[attendee.seatNumber !== undefined && `Spot #${attendee.seatNumber}`, (attendee.ticket || attendee.gift) && guestTicketLabel(attendee)].filter(Boolean).join(" · ")}
                {attendee.guest && <> · <a href={`tel:+91${attendee.guest.phone}`} className="inline-flex items-center gap-1 font-medium text-velocity hover:text-velocity-glow"><Phone size={11} aria-hidden="true" />{attendee.guest.phone.replace(/^(\d{5})(\d{5})$/, "$1 $2")}</a></>}
                {attendee.whatsapp && <> · <a href={whatsappChat({ ...attendee, whatsapp: attendee.whatsapp })} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${attendee.displayName} at ${formatIndianMobile(attendee.whatsapp)}`} className="inline-flex items-center gap-1 font-medium text-velocity hover:text-velocity-glow"><MessageCircle size={11} aria-hidden="true" />{formatIndianMobile(attendee.whatsapp)}</a></>}
              </span>
            </span>
            <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {attendee.gift && <Gift size={15} className="text-velocity" aria-label="Gifted spot" />}
              {attendee.ticket && !attendee.ticket.online && attendee.seatNumber !== undefined && (() => {
                const seat = attendee.seatNumber;
                const paid = attendee.ticket.paid;
                return <button type="button" onClick={() => setPaid(seat, !paid)} disabled={paying !== null} aria-pressed={paid}
                  aria-label={paid ? `${attendee.displayName} has paid. Mark as still due` : `Mark ${attendee.displayName} as paid`} title={paid ? "Paid. Tap to mark as still due" : "Tap once they’ve paid"}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold disabled:opacity-60 ${paid ? "bg-velocity text-slate-950" : "border border-velocity text-velocity hover:bg-velocity/10"}`}>
                  {paying === seat ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : paid && <Check size={13} aria-hidden="true" />}{paid ? "Paid" : "Mark paid"}
                </button>;
              })()}
              {attendee.checkInStatus === "checked_in"
                ? <span className="rounded-full bg-velocity/15 px-2.5 py-1 text-xs font-semibold text-velocity">In{attendee.checkedInAt ? ` · ${timeFormatter.format(new Date(attendee.checkedInAt))}` : ""}</span>
                : attendee.guest && summary.checkInWindow === "open"
                  ? <button type="button" onClick={() => checkInGuest(attendee.guest!.pass)} disabled={checking !== null} aria-label={`Check in ${attendee.displayName}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-velocity px-3 text-xs font-bold text-slate-950 disabled:opacity-60">{checking === attendee.guest.pass && <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />}Check in</button>
                  : <span className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-text-secondary">Not yet</span>}
            </span>
          </div>
          {checkError && checkError.pass === attendee.guest?.pass && <p role="alert" className="mt-1 text-xs text-rose-200">{checkError.message}</p>}
          {payError && payError.seat === attendee.seatNumber && <p role="alert" className="mt-1 text-xs text-rose-200">{payError.message}</p>}
        </li>)}
      </ul> : <p className="mt-3 rounded-xl border border-dashed border-border-strong p-5 text-sm text-text-secondary">{summary.confirmedRsvps ? "No guests match." : "No one is going yet. Share the session, or invite people with a gift link."}</p>}
      {attendees.some(attendee => attendee.ticket && !attendee.ticket.online) && <p className="mt-3 text-xs text-text-secondary">Tap <strong className="text-white">Mark paid</strong> once a guest has paid, e.g. through the WhatsApp link: revenue counts it and the check-in desk lets them in. Until then, check-in tells the desk they haven’t paid. Tap <strong className="text-white">Paid</strong> to set it back to due.</p>}
      <p className="mt-3 text-xs text-text-secondary">Members’ contact details and account IDs stay private. Guests who claimed a gift without an account gave you their mobile number, and members who booked to pay later gave you their WhatsApp number for the payment link: tap it to message them. Neither is in the CSV export.</p>
    </section>}

    {tab === "checkin" && <section id="panel-checkin" role="tabpanel" aria-labelledby="tab-checkin" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-2xl border border-border-strong bg-surface p-4 sm:p-6">
        <h2 className="text-xl font-bold text-white">Scan .fit IDs and guest passes</h2>
        <p className="mt-1 mb-4 text-sm leading-relaxed text-text-secondary">Ask each person to open their .fit ID and flip it to the check-in QR. Guests who claimed a gift without an account show the QR on their guest pass, or you can check them in from the guest list. Only people going to this session can be checked in.</p>
        <OrganizerCheckInForm event={{ id: event.id, title: event.title, checkInWindow: summary.checkInWindow, checkedIn: summary.checkedIn, confirmedRsvps: summary.confirmedRsvps }} />
      </div>
      <dl className="grid h-fit grid-cols-2 gap-3">
        <Stat label="Checked in" value={String(summary.checkedIn)} detail={`${showUp}% of guests`} accent percent={showUp} />
        <Stat label="Still to arrive" value={String(waiting)} detail={`${summary.confirmedRsvps} going`} />
      </dl>
    </section>}

    {tab === "gifts" && <section id="panel-gifts" role="tabpanel" aria-labelledby="tab-gifts" className="mt-6">
      <GiftLinks eventId={event.id} eventTitle={event.title} published={published} initialLinks={giftLinks} guestPasses={guestPasses} attendees={attendees} paidLabel={pricing.kind === "paid" ? pricing.label : undefined} />
    </section>}

    {tab === "coupons" && <section id="panel-coupons" role="tabpanel" aria-labelledby="tab-coupons" className="mt-6">
      <CouponManager eventId={event.id} ticketPaise={pricing.kind === "paid" ? pricing.amount : null} initialCoupons={coupons} />
    </section>}
  </div>;
}
