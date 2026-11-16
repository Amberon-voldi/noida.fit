import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, CopyPlus, Gift, IndianRupee, Pencil, Plus, ScanLine, UsersRound, type LucideIcon } from "lucide-react";
import type { Community } from "@/types/community";
import type { Event } from "@/types/event";
import type { OrganizerClubSummary, OrganizerEventSummary } from "@/types/organizer";
import { eventIsUpcomingForOrganizer } from "@/lib/services/organizer";
import { formatDate } from "@/lib/config";
import { formatInr, parseEventPrice } from "@/lib/pricing";
import { checkInLabel } from "./labels";

export type WorkspaceView = "upcoming" | "drafts" | "past";

export interface OrganizerWorkspaceProps {
  events: Event[];
  summaries: OrganizerEventSummary[];
  communities: Community[];
  isAdmin: boolean;
  view: WorkspaceView;
}

function communitySummaries(events: Event[], summaries: OrganizerEventSummary[], communities: Community[], isAdmin: boolean): OrganizerClubSummary[] {
  const visible = isAdmin ? communities : communities.filter(community => events.some(event => event.communitySlug === community.slug));
  return visible.map(community => {
    const clubEvents = events.filter(event => event.communitySlug === community.slug);
    const clubSummaries = summaries.filter(summary => summary.event.communitySlug === community.slug);
    return {
      community,
      eventCount: clubEvents.length,
      upcomingEventCount: clubEvents.filter(eventIsUpcomingForOrganizer).length,
      confirmedRsvps: clubSummaries.reduce((total, summary) => total + summary.confirmedRsvps, 0),
      checkedIn: clubSummaries.reduce((total, summary) => total + summary.checkedIn, 0),
    };
  }).filter(summary => isAdmin || summary.eventCount > 0);
}

const sum = (summaries: OrganizerEventSummary[], pick: (summary: OrganizerEventSummary) => number) => summaries.reduce((total, summary) => total + pick(summary), 0);
const quiet = "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-text-secondary hover:text-white";

function SessionCard({ summary, live = false }: { summary: OrganizerEventSummary; live?: boolean }) {
  const { event } = summary;
  const id = encodeURIComponent(event.id);
  const capacity = summary.capacityRemaining === null ? null : summary.confirmedRsvps + summary.capacityRemaining;
  const upcoming = eventIsUpcomingForOrganizer(event) && !live;
  // Before the day: how full it is. On and after the day: how many came.
  const percent = upcoming ? (capacity ? Math.round((summary.confirmedRsvps / capacity) * 100) : 0) : summary.confirmedRsvps ? Math.round((summary.checkedIn / summary.confirmedRsvps) * 100) : 0;
  const status = event.status === "cancelled" ? "Cancelled" : event.status === "draft" ? "Draft" : checkInLabel(summary.checkInWindow);
  const pricing = parseEventPrice(event.price);
  return <article className={`rounded-xl border bg-surface p-5 ${live ? "border-velocity/60" : "border-border-subtle"}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className={`font-mono text-[10px] uppercase tracking-widest ${live ? "text-velocity" : "text-text-secondary"}`}>{status}</p>
        <h3 className="mt-2 break-words text-lg font-bold text-white"><Link href={`/organizer/events/${id}`} className="hover:text-velocity">{event.title}</Link></h3>
        <p className="mt-1 text-sm text-text-secondary">{formatDate(event.date)} · {event.startTime}–{event.endTime} · {event.venueName}, {event.sector}</p>
      </div>
      <dl className="flex shrink-0 gap-5 text-right text-xs">
        <div><dt className="text-text-secondary">Going</dt><dd className="mt-1 text-lg font-bold text-white">{summary.confirmedRsvps}{capacity !== null ? <span className="text-sm font-semibold text-text-secondary"> / {capacity}</span> : null}</dd></div>
        {upcoming && pricing.kind === "paid"
          ? <div><dt className="text-text-secondary">Revenue</dt><dd className="mt-1 text-lg font-bold text-velocity">{formatInr(summary.revenue)}</dd></div>
          : <div><dt className="text-text-secondary">Checked in</dt><dd className="mt-1 text-lg font-bold text-velocity">{summary.checkedIn}</dd></div>}
      </dl>
    </div>
    {(upcoming ? capacity : summary.confirmedRsvps) ? <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full rounded-full bg-velocity" style={{ width: `${Math.min(100, percent)}%` }} /></div> : null}
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
      <span>{pricing.label}</span>
      {summary.giftsClaimed > 0 && <span className="inline-flex items-center gap-1 text-velocity"><Gift size={12} aria-hidden="true" />{summary.giftsClaimed} gifted</span>}
      {summary.payingNow > 0 && <span>{summary.payingNow} paying now</span>}
      {!upcoming && pricing.kind === "paid" && summary.revenue > 0 && <span>{formatInr(summary.revenue)} collected</span>}
    </p>
    <div className="mt-4 flex flex-wrap gap-2">
      {live
        ? <Link href={`/organizer/events/${id}?tab=checkin`} className="button-primary inline-flex min-h-11 items-center gap-2 px-4"><ScanLine size={16} aria-hidden="true" />Open check-in desk</Link>
        : <Link href={`/organizer/events/${id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong px-4 text-sm font-semibold text-white hover:bg-surface-hover">Manage</Link>}
      <Link href={`/organizer/events/${id}?tab=guests`} className={quiet}><UsersRound size={14} aria-hidden="true" />Guests</Link>
      {upcoming && <Link href={`/organizer/events/${id}?tab=gifts`} className={quiet}><Gift size={14} aria-hidden="true" />Gift links</Link>}
      <Link href={`/organizer/events/${id}/edit`} className={quiet}><Pencil size={14} aria-hidden="true" />Edit</Link>
      <Link href={`/organizer/events/new?from=${id}`} className={quiet}><CopyPlus size={14} aria-hidden="true" />Duplicate</Link>
      {event.status === "published" && <Link href={`/event/${event.slug}`} className={quiet}>Event page <ArrowUpRight size={15} aria-hidden="true" /></Link>}
    </div>
  </article>;
}

export function OrganizerWorkspace({ events, summaries, communities, isAdmin, view }: OrganizerWorkspaceProps) {
  const clubs = communitySummaries(events, summaries, communities, isAdmin);
  const live = summaries.filter(summary => summary.checkInWindow === "open");
  const notLive = summaries.filter(summary => summary.checkInWindow !== "open");
  const drafts = notLive.filter(summary => summary.event.status === "draft");
  const upcoming = notLive.filter(summary => summary.event.status !== "draft" && eventIsUpcomingForOrganizer(summary.event));
  // Most recent first: yesterday's session matters more than last year's.
  const past = notLive.filter(summary => summary.event.status !== "draft" && !eventIsUpcomingForOrganizer(summary.event)).reverse();
  const going = sum([...live, ...upcoming], summary => summary.confirmedRsvps);
  const revenue = sum(summaries, summary => summary.revenue);
  const paidTickets = sum(summaries, summary => summary.attendees.filter(attendee => attendee.ticket?.paid).length);
  const pastGuests = sum(past, summary => summary.confirmedRsvps);
  const showUp = pastGuests ? `${Math.round((sum(past, summary => summary.checkedIn) / pastGuests) * 100)}%` : "–";
  const lists: Record<WorkspaceView, { items: OrganizerEventSummary[]; label: string; empty: string }> = {
    upcoming: { items: upcoming, label: "Upcoming", empty: "No upcoming sessions. Schedule one, or duplicate a past session." },
    drafts: { items: drafts, label: "Drafts", empty: "No drafts. Sessions saved as drafts wait here until you publish them." },
    past: { items: past, label: "Past", empty: "No past sessions yet." },
  };
  const current = lists[view];

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-velocity">{isAdmin ? "Admin operations" : "Organizer workspace"}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Your sessions</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">Schedule sessions, track who’s going and what you’ve collected, invite guests free with gift links, then run check-in on the day.</p>
      </div>
      {clubs.length > 0 && <Link href="/organizer/events/new" className="button-primary inline-flex min-h-11 items-center gap-2 px-4"><Plus size={16} aria-hidden="true" />New session</Link>}
    </header>

    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Organizer overview">
      {([
        { label: "Upcoming sessions", value: String(live.length + upcoming.length), detail: drafts.length ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"}` : "Published", Icon: CalendarDays },
        { label: "Going", value: String(going), detail: "Across upcoming sessions", Icon: UsersRound },
        { label: "Ticket revenue", value: formatInr(revenue), detail: `${paidTickets} paid ticket${paidTickets === 1 ? "" : "s"}`, Icon: IndianRupee },
        { label: "Show-up rate", value: showUp, detail: "Checked in at past sessions", Icon: CheckCircle2 },
      ] satisfies Array<{ label: string; value: string; detail: string; Icon: LucideIcon }>).map(({ label, value, detail, Icon }) => <div key={label} className="min-w-0 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5"><Icon className="size-5 text-velocity" aria-hidden="true" /><p className="mt-4 truncate text-2xl font-extrabold text-white sm:text-3xl">{value}</p><p className="mt-1 text-xs uppercase tracking-widest text-text-secondary">{label}</p><p className="mt-1 text-xs text-text-secondary">{detail}</p></div>)}
    </section>

    {events.length ? <>
      {live.length > 0 && <section className="mt-10" aria-labelledby="live-heading">
        <p className="eyebrow">Happening now</p><h2 id="live-heading" className="mt-2 text-2xl font-bold text-white">Check-in is open</h2>
        <div className="mt-4 space-y-3">{live.map(summary => <SessionCard key={summary.event.id} summary={summary} live />)}</div>
      </section>}

      <section className="mt-10" aria-labelledby="sessions-heading">
        <h2 id="sessions-heading" className="sr-only">Sessions</h2>
        <nav aria-label="Sessions" className="flex gap-1 overflow-x-auto border-b border-border-subtle">
          {(Object.keys(lists) as WorkspaceView[]).map(key => <Link key={key} href={key === "upcoming" ? "/organizer" : `/organizer?view=${key}`} aria-current={view === key ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${view === key ? "border-velocity text-white" : "border-transparent text-text-secondary hover:text-white"}`}>
            {lists[key].label}<span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{lists[key].items.length}</span>
          </Link>)}
        </nav>
        {current.items.length ? <div className="mt-4 space-y-3">{current.items.map(summary => <SessionCard key={summary.event.id} summary={summary} />)}</div>
          : <p className="mt-4 rounded-xl border border-dashed border-border-strong p-5 text-sm text-text-secondary">{current.empty}</p>}
      </section>

      <section className="mt-12" aria-labelledby="club-operations-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Club operations</p><h2 id="club-operations-heading" className="mt-2 text-2xl font-bold text-white">Your clubs</h2></div><Link href="/communities" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-velocity">Public directory <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {clubs.map(({ community, eventCount, upcomingEventCount, confirmedRsvps, checkedIn }) => <article key={community.id} className="rounded-xl border border-border-subtle bg-surface p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-velocity">{community.category}</p><h3 className="mt-2 text-lg font-bold text-white">{community.name}</h3><p className="mt-1 text-sm text-text-secondary">{community.baseLocation}</p></div><Link href={`/community/${community.slug}`} aria-label={`Open ${community.name} public page`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:text-white"><ArrowUpRight size={17} aria-hidden="true" /></Link></div><dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border-subtle pt-4 text-xs"><div><dt className="text-text-secondary">Events</dt><dd className="mt-1 font-bold text-white">{eventCount}</dd></div><div><dt className="text-text-secondary">Upcoming</dt><dd className="mt-1 font-bold text-white">{upcomingEventCount}</dd></div><div><dt className="text-text-secondary">Attendance</dt><dd className="mt-1 font-bold text-white">{checkedIn} / {confirmedRsvps}</dd></div></dl></article>)}
        </div>
      </section>
    </> : <section className="mt-10 rounded-2xl border border-dashed border-border-strong p-7"><h2 className="text-xl font-bold text-white">No managed sessions yet</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">Your account does not have an assigned event. Listing review and organizer assignment are still handled by the NOIDA.FIT team.</p><Link href="/for-organizers" className="mt-5 inline-flex min-h-11 items-center font-semibold text-velocity">Read organizer guidance <ArrowUpRight size={15} aria-hidden="true" /></Link></section>}
  </div>;
}
