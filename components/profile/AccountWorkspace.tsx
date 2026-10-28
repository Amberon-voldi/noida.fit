import Link from "next/link";
import { ArrowUpRight, Bookmark, CalendarDays, ChevronRight, Clock3, Footprints, Link2, LockKeyhole, Mail, MapPin, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import type { FitnessProfile, ProfileSettings } from "@/types/user";
import type { Event } from "@/types/event";
import type { Community } from "@/types/community";
import type { Place } from "@/types/place";
import type { AccountParticipation } from "@/lib/participation";
import { ActivitySummary } from "./ActivitySummary";
import { MemberIdentity } from "./MemberIdentity";
import { SettingsForm } from "./SettingsForm";
import { MobileAccountSection } from "./MobileAccountSection";
import { AccountSectionNav } from "./AccountSectionNav";
import { PlanTabs, type PlanTab } from "./PlanTabs";
import { ParticipationPassport } from "./ParticipationPassport";
import { accountDate, accountRecords, passportDate } from "./account-data";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SaveButton } from "@/components/participation/SaveButton";
import { FollowButton } from "@/components/participation/FollowButton";
import { integrations } from "@/lib/integrations";
import "./account-workspace.css";

export interface AccountWorkspaceProps {
  profile: FitnessProfile;
  settings: ProfileSettings;
  email: string;
  canOrganize: boolean;
  participation: AccountParticipation;
  events: Event[];
  upcomingEvents: Event[];
  communities: Community[];
  places: Place[];
}

function DateChip({ value }: { value: string }) {
  const date = passportDate(value);
  return <span className="member-date-chip" aria-hidden="true"><span>{date.month}</span><strong>{date.day}</strong></span>;
}

/** Server-rendered private workspace; data loading and authorization stay in the route. */
export function AccountWorkspace({ profile, settings, email, canOrganize, participation, events, upcomingEvents, communities, places }: AccountWorkspaceProps) {
  const { rsvps, history } = accountRecords(participation, events, upcomingEvents);
  const communitiesById = new Map(communities.map(community => [community.id, community]));
  const eventsById = new Map(events.map(event => [event.id, event]));
  const placesById = new Map(places.map(place => [place.id, place]));
  const memberships = participation.memberships.filter(item => item.status === "active");
  const nextEvent = rsvps[0]?.event;
  const isPublic = profile.visibility === "public";

  const plans: PlanTab[] = [
    { id: "rsvps", label: "Upcoming", count: rsvps.length, content: rsvps.length ? <>
      <ul className="member-list">{rsvps.map(({ rsvp, event }) => <li key={rsvp.id}>
        {event ? <div className="member-list-row"><DateChip value={event.startsAt || `${event.date}T00:00:00+05:30`} /><div className="member-list-content"><Link href={`/event/${event.slug}`} className="member-list-title">{event.title}</Link><p><span className="sr-only">{accountDate(event.startsAt || `${event.date}T00:00:00+05:30`)} · </span>{event.startTime} · {event.venueName}</p>{event.demo && <span className="member-demo-label">Demo</span>}</div></div> : <div className="member-list-content"><p>This event is no longer publicly available.</p></div>}
        {event && <Link href={`/event/${event.slug}`} className="member-row-action" aria-label={`Manage RSVP for ${event.title}`}><ChevronRight size={18} aria-hidden="true" /></Link>}
      </li>)}</ul>
      <p className="member-plan-note">Confirmed plans, not proof of attendance.</p>
    </> : <div className="member-empty"><CalendarDays size={22} aria-hidden="true" /><p>No RSVPs yet.</p><Link href="/events">Find an event</Link></div> },
    { id: "saved", label: "Saved", count: participation.savedItems.length, content: participation.savedItems.length ? <ul className="member-list">{participation.savedItems.map(saved => {
      const item = saved.itemType === "event" ? eventsById.get(saved.itemId) : saved.itemType === "community" ? communitiesById.get(saved.itemId) : placesById.get(saved.itemId);
      return <li key={saved.id}><div className="member-list-content"><span className="member-item-type">{saved.itemType}</span>{item ? <><Link href={`/${saved.itemType}/${item.slug}`} className="member-list-title">{"title" in item ? item.title : item.name}</Link>{item.demo && <span className="member-demo-label">Demo</span>}</> : <p>This saved {saved.itemType} is no longer publicly available.</p>}</div><SaveButton itemType={saved.itemType} itemId={saved.itemId} compact refreshPage /></li>;
    })}</ul> : <div className="member-empty"><Bookmark size={22} aria-hidden="true" /><p>Something catch your eye?</p><Link href="/discover">Explore and save it</Link></div> },
    { id: "following", label: "People", count: memberships.length, content: memberships.length ? <ul className="member-list">{memberships.map(membership => {
      const community = communitiesById.get(membership.communityId);
      return <li key={membership.id}><div className="member-list-content">{community ? <><Link href={`/community/${community.slug}`} className="member-list-title">{community.name}</Link><p>{community.baseLocation}</p>{community.demo && <span className="member-demo-label">Demo</span>}</> : <p>This community is no longer publicly available.</p>}</div><FollowButton communityId={membership.communityId} compact refreshPage /></li>;
    })}</ul> : <div className="member-empty"><UsersRound size={22} aria-hidden="true" /><p>Movement is better together.</p><Link href="/communities">Find your people</Link></div> },
  ];

  return <div className="member-space mx-auto max-w-5xl px-4 pb-12 pt-4 sm:px-6 sm:pb-16 lg:px-8">
    <h1 className="sr-only">My account</h1>

    <section id="overview" className="member-overview" aria-label="Account overview">
      <section className="member-id" aria-labelledby="fitness-id-heading">
        <h2 id="fitness-id-heading" className="sr-only">Your .fit ID</h2>
        <MemberIdentity profile={profile} checkIn>
          <div className="identity-owner-links"><a href="#settings" aria-label="Privacy settings"><SlidersHorizontal size={16} aria-hidden="true" />Privacy</a>{isPublic && <Link href={`/@${profile.slug}`} className="identity-preview" aria-label="Preview public profile" title="Preview public profile"><ArrowUpRight size={16} aria-hidden="true" /></Link>}</div>
        </MemberIdentity>
      </section>

      <section className="member-next" aria-labelledby="next-plan-heading">
        <h2 id="next-plan-heading" className="member-eyebrow">Up next</h2>
        {nextEvent ? <>
          <p className="member-confirmed">Confirmed RSVP</p>
          <h3><Link href={`/event/${nextEvent.slug}`}>{nextEvent.title}</Link></h3>
          <p className="member-next-detail"><Clock3 size={16} aria-hidden="true" />{nextEvent.startTime} · {accountDate(nextEvent.startsAt || `${nextEvent.date}T00:00:00+05:30`)}</p>
          <p className="member-next-detail"><MapPin size={16} aria-hidden="true" />{nextEvent.venueName} · {nextEvent.sector}</p>
          {nextEvent.demo && <span className="member-demo-label">Demo listing</span>}
          <div className="member-next-actions">
            <Link href={`/event/${nextEvent.slug}`} className="button-secondary">Open event<ArrowUpRight size={16} aria-hidden="true" /></Link>
            <a href="#rsvps" className="member-text-action" aria-label={`View all (${rsvps.length}) upcoming RSVPs`}>View all ({rsvps.length})</a>
          </div>
        </> : <div className="member-next-empty"><p>No upcoming plans.</p><Link href="/events" className="button-secondary">Find your next session<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
      </section>
    </section>

    <AccountSectionNav />

    <section id="plans" className="member-block" aria-labelledby="plans-heading">
      <h2 id="plans-heading" className="member-heading">Your plans</h2>
      <PlanTabs tabs={plans} label="Your plans" />
    </section>

    <section id="passport" className="member-block member-passport" aria-labelledby="passport-heading">
      <div className="member-heading-row"><h2 id="passport-heading" className="member-heading">Movement passport</h2><span className="member-private-label"><LockKeyhole size={12} aria-hidden="true" />Private</span></div>
      <ActivitySummary stats={profile.stats} />
      {history.length ? <ParticipationPassport entries={history.slice(0, 3)} /> : <div className="member-passport-empty"><span><Footprints size={22} aria-hidden="true" /></span><div><h3>Your story starts with showing up.</h3><p>Your first organizer-verified check-in will appear here. Saving or RSVPing does not add attendance.</p></div><Link href="/events" className="member-text-action">Find a session</Link></div>}
      <MobileAccountSection sectionId="activity" headingId="participation" title={`All participation records (${history.length})`} description="Full history with each record’s verification status.">{history.length ? <ParticipationPassport entries={history} variant="history" /> : <p className="text-sm text-text-secondary">No participation recorded yet.</p>}</MobileAccountSection>
      <p className="member-caption">Only organizer-verified records count toward totals. Week streaks run Monday–Sunday in India; last week’s streak stays while this week is in progress.</p>
    </section>

    <section className="member-block member-settings" aria-labelledby="account-controls-heading">
      <h2 id="account-controls-heading" className="member-heading">Account</h2>
      <div className="member-account-list">
        <MobileAccountSection headingId="settings" title="Profile & privacy" description="Your details, visibility and sharing.">
          <dl className="member-account-details"><div><dt><Mail size={14} aria-hidden="true" />Account email · private</dt><dd>{email}</dd></div><div><dt>Member since</dt><dd>{accountDate(profile.joinedAt)}</dd></div></dl>
          <SettingsForm settings={settings} className="account-settings-form" />
        </MobileAccountSection>
        <MobileAccountSection headingId="integrations" title="Connected services" description="Availability and setup information."><div className="account-service-grid">{integrations.map(integration => <div key={integration.id} className="account-service-card"><div className="account-service-icon"><Link2 size={16} aria-hidden="true" /></div><div><h3 className="text-sm font-semibold text-white">{integration.name}</h3><p className="mt-1 text-sm leading-relaxed text-text-secondary">{integration.message}</p></div></div>)}</div></MobileAccountSection>
        {canOrganize && <Link href="/organizer" className="member-account-row" aria-label="Organizer tools"><ShieldCheck size={18} aria-hidden="true" /><span>Organizer tools</span><ChevronRight size={18} aria-hidden="true" /></Link>}
        <SignOutButton variant="row" />
      </div>
    </section>
  </div>;
}
