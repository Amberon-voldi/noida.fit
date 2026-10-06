import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, ClipboardCheck, UsersRound, type LucideIcon } from "lucide-react";
import type { Community } from "@/types/community";
import type { Event } from "@/types/event";
import type { OrganizerClubSummary, OrganizerEventSummary } from "@/types/organizer";
import { OrganizerTokenForm } from "@/components/participation/OrganizerTokenForm";
import { eventIsUpcomingForOrganizer } from "@/lib/services/organizer";

export interface OrganizerWorkspaceProps {
  events: Event[];
  summaries: OrganizerEventSummary[];
  communities: Community[];
  isAdmin: boolean;
}

function eventLabel(event: Event): string {
  if (event.status === "cancelled") return "Cancelled";
  if (event.status === "draft") return "Draft";
  if (!eventIsUpcomingForOrganizer(event)) return "Past";
  return "Upcoming";
}

function checkInLabel(state: OrganizerEventSummary["checkInWindow"]): string {
  return {
    open: "Check-in open",
    "not-open": "Check-in not open",
    closed: "Check-in closed",
    cancelled: "Event cancelled",
    unavailable: "Not published",
    invalid: "Schedule needs review",
  }[state];
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

export function OrganizerWorkspace({ events, summaries, communities, isAdmin }: OrganizerWorkspaceProps) {
  const clubs = communitySummaries(events, summaries, communities, isAdmin);
  const upcoming = events.filter(eventIsUpcomingForOrganizer).length;
  const confirmed = summaries.reduce((total, summary) => total + summary.confirmedRsvps, 0);
  const checkedIn = summaries.reduce((total, summary) => total + summary.checkedIn, 0);
  const summaryByEvent = new Map(summaries.map(summary => [summary.event.id, summary]));
  const formEvents = events.map(event => {
    const summary = summaryByEvent.get(event.id);
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      venueName: event.venueName,
      sector: event.sector,
      status: event.status,
      checkInWindow: summary?.checkInWindow ?? "invalid" as const,
    };
  });

  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
    <header className="max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-widest text-velocity">{isAdmin ? "Admin operations" : "Organizer workspace"}</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Run the session, not the spreadsheet.</h1>
      <p className="mt-4 text-base leading-relaxed text-text-secondary">Manage the events assigned to your account, open a time-limited check-in code, and see attendance without exposing private contact details.</p>
    </header>

    <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Organizer overview">
      {([
        { label: "Clubs", value: clubs.length, Icon: UsersRound },
        { label: "Upcoming events", value: upcoming, Icon: CalendarDays },
        { label: "Confirmed RSVPs", value: confirmed, Icon: ClipboardCheck },
        { label: "Checked in", value: checkedIn, Icon: CheckCircle2 },
      ] satisfies Array<{ label: string; value: number; Icon: LucideIcon }>).map(({ label, value, Icon }) => <div key={label} className="rounded-xl border border-border-subtle bg-surface p-5"><Icon className="size-5 text-velocity" aria-hidden="true" /><p className="mt-5 text-3xl font-extrabold text-white">{value}</p><p className="mt-1 text-xs uppercase tracking-widest text-text-secondary">{label}</p></div>)}
    </section>

    {events.length ? <>
      <section className="mt-12" aria-labelledby="club-operations-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Club operations</p><h2 id="club-operations-heading" className="mt-2 text-2xl font-bold text-white">Your clubs</h2></div><Link href="/communities" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-velocity">Public directory <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {clubs.map(({ community, eventCount, upcomingEventCount, confirmedRsvps, checkedIn }) => <article key={community.id} className="rounded-xl border border-border-subtle bg-surface p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-velocity">{community.category}</p><h3 className="mt-2 text-lg font-bold text-white">{community.name}</h3><p className="mt-1 text-sm text-text-secondary">{community.baseLocation}</p></div><Link href={`/community/${community.slug}`} aria-label={`Open ${community.name} public page`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:text-white"><ArrowUpRight size={17} aria-hidden="true" /></Link></div><dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border-subtle pt-4 text-xs"><div><dt className="text-text-secondary">Events</dt><dd className="mt-1 font-bold text-white">{eventCount}</dd></div><div><dt className="text-text-secondary">Upcoming</dt><dd className="mt-1 font-bold text-white">{upcomingEventCount}</dd></div><div><dt className="text-text-secondary">Attendance</dt><dd className="mt-1 font-bold text-white">{checkedIn} / {confirmedRsvps}</dd></div></dl></article>)}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="event-operations-heading">
        <div><p className="eyebrow">Event operations</p><h2 id="event-operations-heading" className="mt-2 text-2xl font-bold text-white">Your sessions</h2></div>
        <div className="mt-5 space-y-3">
          {summaries.map(summary => <article key={summary.event.id} className="rounded-xl border border-border-subtle bg-surface p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-widest text-velocity">{eventLabel(summary.event)}</span><span className="text-xs text-text-secondary">{checkInLabel(summary.checkInWindow)}</span></div><h3 className="mt-2 break-words text-lg font-bold text-white"><Link href={`/event/${summary.event.slug}`} className="hover:text-velocity">{summary.event.title}</Link></h3><p className="mt-1 text-sm text-text-secondary">{summary.event.date} · {summary.event.startTime}–{summary.event.endTime} · {summary.event.venueName}, {summary.event.sector}</p></div><div className="flex shrink-0 gap-5 text-right text-xs"><div><p className="text-text-secondary">RSVPs</p><p className="mt-1 text-lg font-bold text-white">{summary.confirmedRsvps}{summary.capacityRemaining !== null ? ` / ${summary.confirmedRsvps + summary.capacityRemaining}` : ""}</p></div><div><p className="text-text-secondary">Checked in</p><p className="mt-1 text-lg font-bold text-velocity">{summary.checkedIn}</p></div></div></div><details className="mt-4 border-t border-border-subtle pt-3"><summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-velocity">View privacy-safe attendee list</summary>{summary.attendees.length ? <ul className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle">{summary.attendees.map((attendee, index) => <li key={`${attendee.displayName}-${index}`} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm"><span className="min-w-0 truncate text-white">{attendee.displayName}</span><span className={attendee.checkInStatus === "checked_in" ? "shrink-0 text-xs text-velocity" : "shrink-0 text-xs text-text-secondary"}>{attendee.checkInStatus === "checked_in" ? "Checked in" : "RSVP confirmed"}</span></li>)}</ul> : <p className="mt-3 text-sm text-text-secondary">No confirmed RSVPs yet.</p>}<p className="mt-3 text-xs text-text-secondary">Only display names and attendance state are shown. Contact details and account IDs stay private.</p></details></article>)}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-border-strong bg-surface p-5 sm:p-7" aria-labelledby="check-in-tools-heading"><p className="eyebrow">Attendance desk</p><h2 id="check-in-tools-heading" className="mt-2 text-2xl font-bold text-white">Open event check-in</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">Codes work only during the event window. Display the QR at the meeting point; attendees still need a confirmed RSVP and their own account.</p><div className="mt-6"><OrganizerTokenForm events={formEvents} /></div></section>
    </> : <section className="mt-10 rounded-2xl border border-dashed border-border-strong p-7"><h2 className="text-xl font-bold text-white">No managed sessions yet</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">Your account does not have an assigned event. Listing review and organizer assignment are still handled by the NOIDA.FIT team.</p><Link href="/for-organizers" className="mt-5 inline-flex min-h-11 items-center font-semibold text-velocity">Read organizer guidance <ArrowUpRight size={15} aria-hidden="true" /></Link></section>}
  </div>;
}
