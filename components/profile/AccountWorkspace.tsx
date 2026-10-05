import Link from "next/link";
import { ArrowUpRight, Bookmark, CalendarDays, Clock3, Footprints, Globe2, Link2, LockKeyhole, Mail, MapPin, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import type { FitnessProfile, ProfileSettings } from "@/types/user";
import type { Event } from "@/types/event";
import type { Community } from "@/types/community";
import type { Place } from "@/types/place";
import type { AccountParticipation } from "@/lib/participation";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ActivitySummary } from "./ActivitySummary";
import { ProfileActions } from "./ProfileActions";
import { SettingsForm } from "./SettingsForm";
import { MobileAccountSection } from "./MobileAccountSection";
import { ParticipationPassport } from "./ParticipationPassport";
import { accountDate, accountRecords, passportDate } from "./account-data";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SaveButton } from "@/components/participation/SaveButton";
import { FollowButton } from "@/components/participation/FollowButton";
import { CATEGORY_LABELS } from "@/lib/config";
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

/** Server-rendered private workspace; data loading and authorization stay in the route. */
export function AccountWorkspace({ profile, settings, email, canOrganize, participation, events, upcomingEvents, communities, places }: AccountWorkspaceProps) {
  const { rsvps, history } = accountRecords(participation, events, upcomingEvents);
  const communitiesById = new Map(communities.map(community => [community.id, community]));
  const eventsById = new Map(events.map(event => [event.id, event]));
  const placesById = new Map(places.map(place => [place.id, place]));
  const memberships = participation.memberships.filter(item => item.status === "active");
  const nextEvent = rsvps[0]?.event;
  const nextDate = nextEvent ? passportDate(nextEvent.startsAt || `${nextEvent.date}T00:00:00+05:30`) : null;
  const firstName = profile.name.trim().split(/\s+/)[0] || "there";
  const isPublic = profile.visibility === "public";

  return <div className="member-space mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pb-16 lg:px-8">
    <header className="member-space-header">
      <div><p className="eyebrow">YOUR CORNER OF NOIDA</p><h1>Good to see you, {firstName}.</h1><p>Your people. Your plans. Your next move.</p></div>
      <div className="member-space-header-actions">
        {canOrganize && <Link href="/organizer" className="member-text-action" aria-label="Organizer tools"><ShieldCheck size={16} aria-hidden="true" /><span>Organizer tools</span></Link>}
        <a href="#settings" className="member-settings-action" aria-label="Profile settings"><Settings2 size={18} aria-hidden="true" /></a>
      </div>
    </header>

    <nav className="member-section-nav" aria-label="Account sections">
      <a href="#overview">Fitness ID</a><a href="#plans">Your plans</a><a href="#passport">Passport</a><a href="#settings">Profile &amp; privacy</a>
    </nav>

    <section id="overview" className="member-overview" aria-label="Account overview">
      <section className="member-id" aria-labelledby="fitness-id-heading">
        <div className="member-section-label"><h2 id="fitness-id-heading">Your Fitness ID</h2><span className="member-edition" aria-hidden="true">NOIDA / FIT</span></div>
        <FitnessCard user={profile} actions={isPublic ? <ProfileActions handle={profile.handle} name={profile.name} /> : undefined} />
        <div className="member-id-privacy">
          <span>{isPublic ? <Globe2 size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}{isPublic ? "Public profile" : "Private · only you"}</span>
          <a href="#settings">Profile visibility<ArrowUpRight size={13} aria-hidden="true" /></a>
          {isPublic && <Link href={`/@${profile.slug}`}>Preview public profile<ArrowUpRight size={13} aria-hidden="true" /></Link>}
        </div>
      </section>

      <section className="member-next" aria-labelledby="next-plan-heading">
        <div className="member-next-heading"><p className="eyebrow">OUTSIDE IS CALLING</p><h2 id="next-plan-heading">Your next move</h2></div>
        {nextEvent && nextDate ? <>
          <div className="member-next-date"><div><span>{nextDate.month}</span><strong>{nextDate.day}</strong></div><p><span>{CATEGORY_LABELS[nextEvent.category]}</span><span className="member-confirmed">Confirmed RSVP</span></p></div>
          <h3><Link href={`/event/${nextEvent.slug}`}>{nextEvent.title}</Link></h3>
          <p className="member-next-detail"><Clock3 size={16} aria-hidden="true" />{nextEvent.startTime} · {accountDate(nextEvent.startsAt || `${nextEvent.date}T00:00:00+05:30`)}</p>
          <p className="member-next-detail"><MapPin size={16} aria-hidden="true" />{nextEvent.venueName} · {nextEvent.sector}</p>
          {nextEvent.demo && <span className="member-demo-label">Demo listing</span>}
          <Link href={`/event/${nextEvent.slug}`} className="button-primary member-next-cta">Open event<ArrowUpRight size={16} aria-hidden="true" /></Link>
          <p className="member-next-note">An RSVP reserves your plan. Attendance is recorded at check-in.</p>
          <a href="#rsvps" className="member-text-action">All upcoming RSVPs ({rsvps.length})<ArrowUpRight size={14} aria-hidden="true" /></a>
        </> : <div className="member-next-empty">
          <Footprints size={30} strokeWidth={1.5} aria-hidden="true" /><h3>A good day starts with a plan.</h3><p>Find a run, ride or session near you. Your next confirmed RSVP will live here.</p><Link href="/events" className="button-primary">Find your next session<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>}
      </section>
    </section>

    <section id="plans" className="member-block" aria-labelledby="plans-heading">
      <div className="member-block-heading"><div><p className="eyebrow">MAKE ROOM FOR MOVEMENT</p><h2 id="plans-heading">Your plans</h2></div><p>Keep the useful things close.</p></div>
      <div className="member-plans-grid">
        <section id="rsvps" className="member-plan" aria-labelledby="rsvps-heading">
          <header><CalendarDays size={18} aria-hidden="true" /><h3 id="rsvps-heading">Upcoming RSVPs</h3><span className="member-count">{rsvps.length}</span></header>
          {rsvps.length ? <ul className="member-list">{rsvps.map(({ rsvp, event }) => <li key={rsvp.id}>
            <div className="member-list-content">{event ? <><Link href={`/event/${event.slug}`} className="member-list-title">{event.title}</Link><p>{accountDate(event.startsAt || `${event.date}T00:00:00+05:30`)} · {event.startTime}</p><p>{event.venueName}</p>{event.demo && <span className="member-demo-label">Demo</span>}</> : <p>This event is no longer publicly available.</p>}</div>
            {event && <Link href={`/event/${event.slug}`} className="member-row-action" aria-label={`Manage RSVP for ${event.title}`}>Manage<ArrowUpRight size={14} aria-hidden="true" /></Link>}
          </li>)}</ul> : <div className="member-empty"><p>No RSVPs yet.</p><Link href="/events">Find an event<ArrowUpRight size={14} aria-hidden="true" /></Link></div>}
          <p className="member-plan-note">Confirmed plans, not proof of attendance.</p>
        </section>

        <section id="saved" className="member-plan" aria-labelledby="saved-heading">
          <header><Bookmark size={18} aria-hidden="true" /><h3 id="saved-heading">Saved for later</h3><span className="member-count">{participation.savedItems.length}</span></header>
          {participation.savedItems.length ? <ul className="member-list">{participation.savedItems.map(saved => {
            const item = saved.itemType === "event" ? eventsById.get(saved.itemId) : saved.itemType === "community" ? communitiesById.get(saved.itemId) : placesById.get(saved.itemId);
            return <li key={saved.id}><div className="member-list-content"><span className="member-item-type">{saved.itemType}</span>{item ? <><Link href={`/${saved.itemType}/${item.slug}`} className="member-list-title">{"title" in item ? item.title : item.name}</Link>{item.demo && <span className="member-demo-label">Demo</span>}</> : <p>This saved {saved.itemType} is no longer publicly available.</p>}</div><SaveButton itemType={saved.itemType} itemId={saved.itemId} compact refreshPage /></li>;
          })}</ul> : <div className="member-empty"><p>Something catch your eye?</p><Link href="/discover">Explore and save it<ArrowUpRight size={14} aria-hidden="true" /></Link></div>}
        </section>

        <section id="following" className="member-plan" aria-labelledby="following-heading">
          <header><UsersRound size={18} aria-hidden="true" /><h3 id="following-heading">Your people</h3><span className="member-count">{memberships.length}</span></header>
          {memberships.length ? <ul className="member-list">{memberships.map(membership => {
            const community = communitiesById.get(membership.communityId);
            return <li key={membership.id}><div className="member-list-content">{community ? <><Link href={`/community/${community.slug}`} className="member-list-title">{community.name}</Link><p>{community.baseLocation}</p>{community.demo && <span className="member-demo-label">Demo</span>}</> : <p>This community is no longer publicly available.</p>}</div><FollowButton communityId={membership.communityId} compact refreshPage /></li>;
          })}</ul> : <div className="member-empty"><p>Movement is better together.</p><Link href="/communities">Find your people<ArrowUpRight size={14} aria-hidden="true" /></Link></div>}
        </section>
      </div>
    </section>

    <section id="passport" className="member-block member-passport" aria-labelledby="passport-heading">
      <div className="member-block-heading"><div><p className="eyebrow">THE PLACES YOU SHOW UP</p><h2 id="passport-heading">Your movement passport</h2></div><span className="member-private-label"><LockKeyhole size={13} aria-hidden="true" />Private history</span></div>
      <p className="member-passport-intro">Real sessions, one record at a time. Only organizer-verified records count toward attendance totals.</p>
      <ActivitySummary stats={profile.stats} />
      {history.length ? <ParticipationPassport entries={history.slice(0, 3)} /> : <div className="member-passport-empty"><span><Footprints size={24} aria-hidden="true" /></span><div><h3>Your story starts with showing up.</h3><p>Your first organizer-verified check-in will appear here. Saving or RSVPing does not add attendance.</p></div><Link href="/events" className="member-text-action">Find a session<ArrowUpRight size={14} aria-hidden="true" /></Link></div>}
      <MobileAccountSection sectionId="activity" headingId="participation" title={`All participation records (${history.length})`} description="See your full history and each record’s verification status.">{history.length ? <ParticipationPassport entries={history} variant="history" /> : <p className="text-sm text-text-secondary">No participation recorded yet.</p>}</MobileAccountSection>
      <p className="member-passport-note">Week streaks use Monday–Sunday in India. Last week’s streak stays while this week is in progress.</p>
    </section>

    <section className="member-block member-settings" aria-labelledby="account-controls-heading">
      <div className="member-block-heading"><div><p className="eyebrow">ON YOUR TERMS</p><h2 id="account-controls-heading">Account &amp; privacy</h2></div><p>Choose what the world gets to see.</p></div>
      <div className="member-settings-grid">
        <MobileAccountSection headingId="settings" title="Profile settings" description="Your details, profile visibility and sharing preferences.">
          <dl className="member-account-details"><div><dt><Mail size={14} aria-hidden="true" />Account email · private</dt><dd>{email}</dd></div><div><dt>Member since</dt><dd>{accountDate(profile.joinedAt)}</dd></div></dl>
          <SettingsForm settings={settings} className="account-settings-form" />
        </MobileAccountSection>
        <MobileAccountSection headingId="integrations" title="Connected services" description="Availability and setup information."><div className="account-service-grid">{integrations.map(integration => <div key={integration.id} className="account-service-card"><div className="account-service-icon"><Link2 size={16} aria-hidden="true" /></div><div><h3 className="text-sm font-semibold text-white">{integration.name}</h3><p className="mt-1 text-sm leading-relaxed text-text-secondary">{integration.message}</p></div></div>)}</div></MobileAccountSection>
      </div>
    </section>
    <footer className="member-footer"><span>NOIDA.FIT <span aria-hidden="true">/</span> Find your people. Show up.</span><SignOutButton /></footer>
  </div>;
}
