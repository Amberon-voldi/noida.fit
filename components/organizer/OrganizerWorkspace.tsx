import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, ClipboardCheck, Pencil, Plus, ScanLine, UsersRound, type LucideIcon } from "lucide-react";
import type { Community } from "@/types/community";
import type { Event } from "@/types/event";
import type { OrganizerClubSummary, OrganizerEventSummary } from "@/types/organizer";
import { eventIsUpcomingForOrganizer } from "@/lib/services/organizer";
import { formatDate } from "@/lib/config";
import { checkInLabel } from "./labels";

export interface OrganizerWorkspaceProps {
  events: Event[];
  summaries: OrganizerEventSummary[];
  communities: Community[];
  isAdmin: boolean;
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

function SessionCard({ summary, live = false }: { summary: OrganizerEventSummary; live?: boolean }) {
  const { event } = summary;
  const capacity = summary.capacityRemaining === null ? null : summary.confirmedRsvps + summary.capacityRemaining;
  const percent = summary.confirmedRsvps ? Math.round((summary.checkedIn / summary.confirmedRsvps) * 100) : 0;
  const status = event.status === "cancelled" ? "Cancelled" : event.status === "draft" ? "Draft" : checkInLabel(summary.checkInWindow);
  return <article className={`rounded-xl border bg-surface p-5 ${live ? "border-velocity/60" : "border-border-subtle"}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className={`font-mono text-[10px] uppercase tracking-widest ${live ? "text-velocity" : "text-text-secondary"}`}>{status}</p>
        <h3 className="mt-2 break-words text-lg font-bold text-white">{event.title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{formatDate(event.date)} · {event.startTime}–{event.endTime} · {event.venueName}, {event.sector}</p>
      </div>
      <dl className="flex shrink-0 gap-5 text-right text-xs">
        <div><dt className="text-text-secondary">RSVPs</dt><dd className="mt-1 text-lg font-bold text-white">{summary.confirmedRsvps}{capacity !== null ? <span className="text-sm font-semibold text-text-secondary"> / {capacity}</span> : null}</dd></div>
        <div><dt className="text-text-secondary">Checked in</dt><dd className="mt-1 text-lg font-bold text-velocity">{summary.checkedIn}</dd></div>
      </dl>
    </div>
    {summary.confirmedRsvps > 0 && <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full rounded-full bg-velocity" style={{ width: `${percent}%` }} /></div>}
    <div className="mt-4 flex flex-wrap gap-2">
      <Link href={`/organizer/events/${encodeURIComponent(event.id)}`} className={live ? "button-primary inline-flex min-h-11 items-center gap-2 px-4" : "inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong px-4 text-sm font-semibold text-white hover:bg-surface-hover"}><ScanLine size={16} aria-hidden="true" />{live ? "Open check-in desk" : "Guest list & check-in"}</Link>
      <Link href={`/organizer/events/${encodeURIComponent(event.id)}/edit`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-text-secondary hover:text-white"><Pencil size={14} aria-hidden="true" />Edit</Link>
      {event.status === "published" && <Link href={`/event/${event.slug}`} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-text-secondary hover:text-white">Event page <ArrowUpRight size={15} aria-hidden="true" /></Link>}
    </div>
  </article>;
}

export function OrganizerWorkspace({ events, summaries, communities, isAdmin }: OrganizerWorkspaceProps) {
  const clubs = communitySummaries(events, summaries, communities, isAdmin);
  const upcomingCount = events.filter(eventIsUpcomingForOrganizer).length;
  const confirmed = summaries.reduce((total, summary) => total + summary.confirmedRsvps, 0);
  const checkedIn = summaries.reduce((total, summary) => total + summary.checkedIn, 0);
  const live = summaries.filter(summary => summary.checkInWindow === "open");
  const upcoming = summaries.filter(summary => summary.checkInWindow !== "open" && eventIsUpcomingForOrganizer(summary.event));
  // Most recent first: yesterday's session matters more than last year's.
  const past = summaries.filter(summary => summary.checkInWindow !== "open" && !eventIsUpcomingForOrganizer(summary.event)).reverse();

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-velocity">{isAdmin ? "Admin operations" : "Organizer workspace"}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Your sessions</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">Schedule sessions, see who has RSVP’d, then open the check-in desk on the day to scan each person’s .fit ID.</p>
      </div>
      {clubs.length > 0 && <Link href="/organizer/events/new" className="button-primary inline-flex min-h-11 items-center gap-2 px-4"><Plus size={16} aria-hidden="true" />New session</Link>}
    </header>

    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Organizer overview">
      {([
        { label: "Clubs", value: clubs.length, Icon: UsersRound },
        { label: "Upcoming events", value: upcomingCount, Icon: CalendarDays },
        { label: "Confirmed RSVPs", value: confirmed, Icon: ClipboardCheck },
        { label: "Checked in", value: checkedIn, Icon: CheckCircle2 },
      ] satisfies Array<{ label: string; value: number; Icon: LucideIcon }>).map(({ label, value, Icon }) => <div key={label} className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-5"><Icon className="size-5 text-velocity" aria-hidden="true" /><p className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">{value}</p><p className="mt-1 text-xs uppercase tracking-widest text-text-secondary">{label}</p></div>)}
    </section>

    {events.length ? <>
      {live.length > 0 && <section className="mt-10" aria-labelledby="live-heading">
        <p className="eyebrow">Happening now</p><h2 id="live-heading" className="mt-2 text-2xl font-bold text-white">Check-in is open</h2>
        <div className="mt-4 space-y-3">{live.map(summary => <SessionCard key={summary.event.id} summary={summary} live />)}</div>
      </section>}

      <section className="mt-10" aria-labelledby="upcoming-heading">
        <p className="eyebrow">Coming up</p><h2 id="upcoming-heading" className="mt-2 text-2xl font-bold text-white">Upcoming sessions</h2>
        {upcoming.length ? <div className="mt-4 space-y-3">{upcoming.map(summary => <SessionCard key={summary.event.id} summary={summary} />)}</div>
          : <p className="mt-4 rounded-xl border border-dashed border-border-strong p-5 text-sm text-text-secondary">No upcoming sessions assigned to you.</p>}
      </section>

      {past.length > 0 && <details className="mt-10 rounded-xl border border-border-subtle bg-surface/50 px-5">
        <summary className="flex min-h-14 cursor-pointer items-center text-base font-semibold text-white">Past sessions ({past.length})</summary>
        <div className="space-y-3 pb-5">{past.map(summary => <SessionCard key={summary.event.id} summary={summary} />)}</div>
      </details>}

      <section className="mt-12" aria-labelledby="club-operations-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Club operations</p><h2 id="club-operations-heading" className="mt-2 text-2xl font-bold text-white">Your clubs</h2></div><Link href="/communities" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-velocity">Public directory <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {clubs.map(({ community, eventCount, upcomingEventCount, confirmedRsvps, checkedIn }) => <article key={community.id} className="rounded-xl border border-border-subtle bg-surface p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-velocity">{community.category}</p><h3 className="mt-2 text-lg font-bold text-white">{community.name}</h3><p className="mt-1 text-sm text-text-secondary">{community.baseLocation}</p></div><Link href={`/community/${community.slug}`} aria-label={`Open ${community.name} public page`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:text-white"><ArrowUpRight size={17} aria-hidden="true" /></Link></div><dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border-subtle pt-4 text-xs"><div><dt className="text-text-secondary">Events</dt><dd className="mt-1 font-bold text-white">{eventCount}</dd></div><div><dt className="text-text-secondary">Upcoming</dt><dd className="mt-1 font-bold text-white">{upcomingEventCount}</dd></div><div><dt className="text-text-secondary">Attendance</dt><dd className="mt-1 font-bold text-white">{checkedIn} / {confirmedRsvps}</dd></div></dl></article>)}
        </div>
      </section>
    </> : <section className="mt-10 rounded-2xl border border-dashed border-border-strong p-7"><h2 className="text-xl font-bold text-white">No managed sessions yet</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">Your account does not have an assigned event. Listing review and organizer assignment are still handled by the NOIDA.FIT team.</p><Link href="/for-organizers" className="mt-5 inline-flex min-h-11 items-center font-semibold text-velocity">Read organizer guidance <ArrowUpRight size={15} aria-hidden="true" /></Link></section>}
  </div>;
}
