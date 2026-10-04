import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Bookmark, CalendarDays, CheckCircle2, History, Link2, Mail, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { ensureProfileForUser, profileSettings, toFitnessProfile } from "@/lib/appwrite/profiles";
import { getAccountParticipation } from "@/lib/participation";
import { getCommunities, getEvents, getPlaces, getUpcomingEvents } from "@/lib/data";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ActivitySummary } from "@/components/profile/ActivitySummary";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { SettingsForm } from "@/components/profile/SettingsForm";
import { MobileAccountSection } from "@/components/profile/MobileAccountSection";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { integrations } from "@/lib/integrations";
import { SaveButton } from "@/components/participation/SaveButton";
import { FollowButton } from "@/components/participation/FollowButton";

export const metadata: Metadata = {
  title: "My account — NOIDA.FIT",
  robots: { index: false, follow: false },
};

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

interface AccountSectionHeadingProps {
  headingId: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  count?: number;
}

function AccountSectionHeading({ headingId, eyebrow, title, description, icon: Icon, count }: AccountSectionHeadingProps) {
  return (
    <header className="account-panel-heading">
      <span className="account-section-icon" aria-hidden="true"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="eyebrow">{eyebrow}</p>
        <div className="mt-1 flex items-center gap-2"><h3 id={headingId} className="min-w-0 text-base font-bold text-white">{title}</h3>{count !== undefined && <span className="account-count" aria-label={`${count} items`}>{count}</span>}</div>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
      </div>
    </header>
  );
}

export default async function AccountPage() {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?callbackUrl=/account");

  const [stored, participation, events, upcomingEvents, communities, places] = await Promise.all([
    ensureProfileForUser(user), getAccountParticipation(user.$id), getEvents(), getUpcomingEvents(), getCommunities(), getPlaces(),
  ]);
  const profile = toFitnessProfile(stored, participation);
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const communitiesById = new Map(communities.map((community) => [community.id, community]));
  const placesById = new Map(places.map((place) => [place.id, place]));
  const upcomingEventIds = new Set(upcomingEvents.map((event) => event.id));
  const rsvps = participation.rsvps.filter((item) => item.status === "confirmed" && upcomingEventIds.has(item.eventId));
  const canOrganize = user.labels.includes("admin") || events.some(event => event.organizerUserId === user.$id);
  const memberships = participation.memberships.filter((item) => item.status === "active");
  const history = participation.participations.map((item) => ({
    key: `participation-${item.id}`, title: item.title, occurredAt: item.occurredAt, status: item.status,
    event: item.eventId ? eventsById.get(item.eventId) : undefined,
  }));
  const recordedEvents = new Set(participation.participations.filter((item) => item.status === "verified").map((item) => item.eventId));
  for (const checkin of participation.checkins) {
    if (!recordedEvents.has(checkin.eventId)) history.push({
      key: `checkin-${checkin.id}`, title: eventsById.get(checkin.eventId)?.title || "Event check-in",
      occurredAt: checkin.timestamp, status: "verified", event: eventsById.get(checkin.eventId),
    });
  }
  history.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  const firstName = profile.name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="account-page mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pb-16 lg:px-8">
      <header className="account-header">
        <div className="min-w-0">
          <p className="eyebrow">MEMBER SPACE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Good to see you, {firstName}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base">Your Fitness ID, plans, communities and verified progress — all in one place.</p>
        </div>
        {canOrganize && <Link href="/organizer" aria-label="Organizer tools" className="button-secondary account-organizer-link"><ShieldCheck className="h-4 w-4 text-velocity" aria-hidden="true" /><span className="account-organizer-label">Organizer tools</span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}
      </header>

      <nav className="account-jump-nav" aria-label="Account sections">
        <a href="#overview" className="account-jump-link">Overview</a>
        <a href="#plans" className="account-jump-link">Your plans</a>
        <a href="#activity" className="account-jump-link">History</a>
        <a href="#settings" className="account-jump-link">Settings</a>
        <a href="#integrations" className="account-jump-link">Services</a>
      </nav>

      <section id="overview" className="account-overview-grid scroll-mt-28" aria-label="Account overview">
        <section className="account-panel account-id-panel" aria-labelledby="fitness-id-heading">
          <div className="account-panel-topline"><div><p className="eyebrow">YOUR ID</p><h2 id="fitness-id-heading" className="mt-1 text-xl font-bold text-white">Fitness ID</h2></div><span className={`account-status ${profile.visibility === "public" ? "account-status-public" : "account-status-private"}`}>{profile.visibility === "public" ? "Public" : "Private"}</span></div>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">Your shareable identity for the local fitness scene.</p>
          <FitnessCard user={profile} className="account-fitness-card mt-5" />
          {profile.visibility === "public" ? <div className="mt-4"><ProfileActions handle={profile.handle} name={profile.name} /><p className="mt-2 text-center text-xs"><Link href={`/@${profile.slug}`} className="text-velocity underline underline-offset-4">View public profile</Link></p></div>
            : <p className="account-private-note mt-4"><ShieldCheck className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />Only you can see this profile. Open <a href="#settings" className="text-white underline underline-offset-4">profile settings</a> to choose what to share.</p>}
        </section>

        <div className="account-overview-side">
          <section className="account-panel account-activity-panel" aria-labelledby="activity-summary">
            <AccountSectionHeading headingId="activity-summary" eyebrow="AT A GLANCE" title="Your activity" description="Verified records only — RSVPs do not count as attendance." icon={CheckCircle2} />
            <div className="mt-5"><ActivitySummary stats={profile.stats} /></div>
            <p className="account-help-note mt-4">A streak is consecutive active weeks, Monday–Sunday in India. Last week’s streak stays while this week is in progress.</p>
          </section>
          <dl className="account-meta-card">
            <div><dt><Mail className="h-3.5 w-3.5" aria-hidden="true" />Account email <span>(private)</span></dt><dd>{user.email}</dd></div>
            <div><dt><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Member since</dt><dd>{dateLabel(profile.joinedAt)}</dd></div>
          </dl>
        </div>
      </section>

      <section id="plans" className="account-block scroll-mt-28" aria-labelledby="plans-heading">
        <div className="account-section-header"><div><p className="eyebrow">KEEP MOVING</p><h2 id="plans-heading" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Your plans</h2></div><p className="max-w-sm text-sm leading-relaxed text-text-secondary">Everything you have saved, joined or already committed to.</p></div>
        <div className="account-plans-grid">
          <section id="rsvps" className="account-panel account-plan-panel scroll-mt-28" aria-labelledby="rsvps-heading">
            <AccountSectionHeading headingId="rsvps-heading" eyebrow="UP NEXT" title="Upcoming RSVPs" description="Confirmed plans waiting for you." icon={CalendarDays} count={rsvps.length} />
            {rsvps.length ? <ul className="account-list mt-5">{rsvps.map((rsvp) => {
              const event = eventsById.get(rsvp.eventId);
              return <li key={rsvp.id} className="account-list-item">
                {event ? <div className="account-list-content"><Link href={`/event/${event.slug}`} className="account-list-title">{event.title}</Link><p className="account-list-meta"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{dateLabel(event.startsAt || `${event.date}T00:00:00+05:30`)} · {event.startTime}</p><p className="account-list-meta"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{event.venueName}</p><p className="account-list-note">Confirmed RSVP, not proof of attendance.</p></div> : <p className="account-list-note">This RSVP’s event is no longer publicly available.</p>}
                {event && <Link href={`/event/${event.slug}`} className="account-list-action">Manage<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
              </li>;
            })}</ul> : <div className="account-empty-state mt-5"><CalendarDays className="h-5 w-5 text-text-secondary" aria-hidden="true" /><p>No RSVPs yet.</p><Link href="/events" className="text-velocity underline underline-offset-4">Find an event</Link></div>}
          </section>

          <section id="saved" className="account-panel account-plan-panel scroll-mt-28" aria-labelledby="saved-heading">
            <AccountSectionHeading headingId="saved-heading" eyebrow="YOUR SHORTLIST" title="Saved plans" description="Private bookmarks for later." icon={Bookmark} count={participation.savedItems.length} />
            {participation.savedItems.length ? <ul className="account-list mt-5">{participation.savedItems.map((saved) => {
              const item = saved.itemType === "event" ? eventsById.get(saved.itemId) : saved.itemType === "community" ? communitiesById.get(saved.itemId) : placesById.get(saved.itemId);
              return <li key={saved.id} className="account-list-item"><div className="account-list-content"><span className="account-item-label">{saved.itemType}</span>{item ? <Link href={`/${saved.itemType}/${item.slug}`} className="account-list-title">{"title" in item ? item.title : item.name}</Link> : <p className="account-list-note">This saved {saved.itemType} is no longer publicly available.</p>}</div><SaveButton itemType={saved.itemType} itemId={saved.itemId} compact refreshPage /></li>;
            })}</ul> : <div className="account-empty-state mt-5"><Bookmark className="h-5 w-5 text-text-secondary" aria-hidden="true" /><p>Nothing saved yet.</p><Link href="/discover" className="text-velocity underline underline-offset-4">Explore the directory</Link></div>}
          </section>

          <section id="following" className="account-panel account-plan-panel scroll-mt-28" aria-labelledby="following-heading">
            <AccountSectionHeading headingId="following-heading" eyebrow="YOUR PEOPLE" title="Communities you follow" description="Groups you want to hear from." icon={UsersRound} count={memberships.length} />
            {memberships.length ? <ul className="account-list mt-5">{memberships.map((membership) => {
              const community = communitiesById.get(membership.communityId);
              return <li key={membership.id} className="account-list-item"><div className="account-list-content">{community ? <Link href={`/community/${community.slug}`} className="account-list-title">{community.name}</Link> : <p className="account-list-note">This community is no longer publicly available.</p>}{community && <p className="account-list-meta"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{community.baseLocation}</p>}</div><FollowButton communityId={membership.communityId} compact refreshPage /></li>;
            })}</ul> : <div className="account-empty-state mt-5"><UsersRound className="h-5 w-5 text-text-secondary" aria-hidden="true" /><p>No communities followed yet.</p><Link href="/communities" className="text-velocity underline underline-offset-4">Find your people</Link></div>}
          </section>
        </div>
      </section>

      <section id="account-controls" className="account-block scroll-mt-28" aria-labelledby="account-controls-heading">
        <div className="account-section-header"><div><p className="eyebrow">CONTROL CENTRE</p><h2 id="account-controls-heading" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Account &amp; privacy</h2></div><p className="max-w-sm text-sm leading-relaxed text-text-secondary">Review your participation, profile visibility and connected services when you need them.</p></div>
        <div className="account-tools-grid">
          <MobileAccountSection sectionId="activity" headingId="participation" title="Participation history · private" description="Organizer-verified check-ins and activity records.">
            {history.length ? <ul className="account-list">{history.map((item) => <li key={item.key} className="account-list-item"><div className="account-list-content">{item.event ? <Link href={`/event/${item.event.slug}`} className="account-list-title">{item.title}</Link> : <p className="account-list-title">{item.title}</p>}<p className="account-list-meta"><History className="h-3.5 w-3.5" aria-hidden="true" />{dateLabel(item.occurredAt)}</p></div><span className="account-verification-status">{({ verified: "Organizer verified", connected: "Connected service", self_reported: "Self-reported · not verified", pending: "Pending verification" })[item.status]}</span></li>)}</ul> : <div className="account-empty-state"><History className="h-5 w-5 text-text-secondary" aria-hidden="true" /><p>No participation recorded yet.</p><span className="account-list-note">An organizer check-in will appear here.</span></div>}
          </MobileAccountSection>
          <MobileAccountSection headingId="settings" title="Profile settings" description="Personal details, privacy and update preferences."><SettingsForm settings={profileSettings(stored)} className="account-settings-form" /></MobileAccountSection>
          <MobileAccountSection headingId="integrations" title="Connected services" description="See what is available to connect today."><div className="account-service-grid">{integrations.map((integration) => <div key={integration.id} className="account-service-card"><div className="account-service-icon"><Link2 className="h-4 w-4" aria-hidden="true" /></div><div><h3 className="text-sm font-semibold text-white">{integration.name}</h3><p className="mt-1 text-sm leading-relaxed text-text-secondary">{integration.message}</p></div></div>)}</div></MobileAccountSection>
        </div>
      </section>

      <footer className="account-footer"><p className="text-xs text-text-secondary">Ready to leave? Your private plans stay protected.</p><SignOutButton /></footer>
    </div>
  );
}
