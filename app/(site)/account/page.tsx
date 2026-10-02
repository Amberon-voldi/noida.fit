import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { ensureProfileForUser, profileSettings, toFitnessProfile } from "@/lib/appwrite/profiles";
import { getAccountParticipation } from "@/lib/participation";
import { getCommunities, getEvents, getPlaces, getUpcomingEvents } from "@/lib/data";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ActivitySummary } from "@/components/profile/ActivitySummary";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { SettingsForm } from "@/components/profile/SettingsForm";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { integrations } from "@/lib/integrations";
import { SaveButton } from "@/components/participation/SaveButton";
import { FollowButton } from "@/components/participation/FollowButton";

export const metadata: Metadata = {
  title: "My account — NOIDA.FIT",
  robots: { index: false, follow: false },
};

const panel = "rounded-xl border border-border-subtle bg-surface p-5";
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
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

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-white">Your account</h1><p className="mt-2 text-sm text-text-secondary">Your plans, communities and real participation in Noida.</p></div>
        <div className="flex items-center gap-4">{canOrganize && <Link href="/organizer" className="text-sm text-velocity underline">Organizer check-in</Link>}<SignOutButton /></div>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section aria-label="Your Fitness ID" className="space-y-5">
          <FitnessCard user={profile} />
          {profile.visibility === "public" ? <><ProfileActions handle={profile.handle} name={profile.name} /><p className="text-center text-sm"><Link href={`/@${profile.slug}`} className="text-velocity underline">View public profile</Link></p></>
            : <p className="text-sm text-text-secondary">Your profile is private. Only you can see it. Choose what to share in <a href="#settings" className="text-white underline">profile settings</a>.</p>}
        </section>
        <section aria-labelledby="activity-summary" className="space-y-4">
          <h2 id="activity-summary" className="text-lg font-semibold text-white">Your activity</h2>
          <ActivitySummary stats={profile.stats} />
          <p className="text-xs leading-relaxed text-text-secondary">Attendance and streaks count organizer-verified records only, not RSVPs. A streak is consecutive active weeks, Monday–Sunday in India; last week’s streak stays while this week is in progress.</p>
          <dl className={`${panel} space-y-4 text-sm`}><div><dt className="text-text-secondary">Account email · never public</dt><dd className="mt-1 break-all text-white">{user.email}</dd></div><div><dt className="text-text-secondary">Member since</dt><dd className="mt-1 text-white">{dateLabel(profile.joinedAt)}</dd></div></dl>
        </section>
      </div>
      <section aria-labelledby="rsvps" className="space-y-4">
        <h2 id="rsvps" className="text-lg font-semibold text-white">Upcoming RSVPs</h2>
        {rsvps.length ? <ul className="grid gap-3 sm:grid-cols-2">{rsvps.map((rsvp) => {
          const event = eventsById.get(rsvp.eventId);
          return <li key={rsvp.id} className={panel}>{event ? <><Link href={`/event/${event.slug}`} className="font-semibold text-white hover:text-velocity">{event.title}</Link><p className="mt-2 text-sm text-text-secondary">{dateLabel(event.startsAt || `${event.date}T00:00:00+05:30`)} · {event.startTime} · {event.venueName}</p><p className="mt-2 text-xs text-text-secondary">Confirmed RSVP, not proof of attendance · manage on the event page</p></> : <p className="text-sm text-text-secondary">This RSVP’s event is no longer publicly available.</p>}</li>;
        })}</ul> : <p className={`${panel} text-sm text-text-secondary`}>No RSVPs yet. <Link href="/events" className="text-white underline">Find an event</Link> to join.</p>}
      </section>
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="saved" className="space-y-4">
          <h2 id="saved" className="text-lg font-semibold text-white">Saved plans</h2>
          {participation.savedItems.length ? <ul className="space-y-3">{participation.savedItems.map((saved) => {
            const item = saved.itemType === "event" ? eventsById.get(saved.itemId) : saved.itemType === "community" ? communitiesById.get(saved.itemId) : placesById.get(saved.itemId);
            return <li key={saved.id} className={panel}>{item ? <><p className="mb-1 text-xs capitalize text-text-secondary">{saved.itemType}</p><Link href={`/${saved.itemType}/${item.slug}`} className="text-sm font-semibold text-white hover:text-velocity">{"title" in item ? item.title : item.name}</Link></> : <p className="text-sm text-text-secondary">This saved {saved.itemType} is no longer publicly available.</p>}<div className="mt-3"><SaveButton itemType={saved.itemType} itemId={saved.itemId}/></div></li>;
          })}</ul> : <p className={`${panel} text-sm text-text-secondary`}>Save an event, place or community to find it here. Your saved plans stay private.</p>}
        </section>
        <section aria-labelledby="following" className="space-y-4">
          <h2 id="following" className="text-lg font-semibold text-white">Communities you follow</h2>
          {memberships.length ? <ul className="space-y-3">{memberships.map((membership) => {
            const community = communitiesById.get(membership.communityId);
            return <li key={membership.id} className={panel}>{community ? <><Link href={`/community/${community.slug}`} className="text-sm font-semibold text-white hover:text-velocity">{community.name}</Link><p className="mt-1 text-xs text-text-secondary">{community.baseLocation}</p></> : <p className="text-sm text-text-secondary">This community is no longer publicly available.</p>}<div className="mt-3"><FollowButton communityId={membership.communityId}/></div></li>;
          })}</ul> : <p className={`${panel} text-sm text-text-secondary`}>No communities followed yet. <Link href="/communities" className="text-white underline">Find your people.</Link></p>}
        </section>
      </div>
      <section id="activity" aria-labelledby="participation" className="space-y-4 scroll-mt-24">
        <h2 id="participation" className="text-lg font-semibold text-white">Participation history · private</h2>
        {history.length ? <ul className="space-y-3">{history.map((item) => <li key={item.key} className={`${panel} flex flex-wrap justify-between gap-3`}><div>{item.event ? <Link href={`/event/${item.event.slug}`} className="text-sm font-semibold text-white hover:text-velocity">{item.title}</Link> : <p className="text-sm font-semibold text-white">{item.title}</p>}<p className="mt-1 text-xs text-text-secondary">{dateLabel(item.occurredAt)}</p></div><p className="text-xs text-text-secondary">{({ verified: "Organizer verified", connected: "Connected service", self_reported: "Self-reported · not verified", pending: "Pending verification" })[item.status]}</p></li>)}</ul> : <p className={`${panel} text-sm text-text-secondary`}>No participation recorded yet. An organizer check-in at an event will appear here.</p>}
      </section>
      <section aria-labelledby="settings" className="space-y-4"><h2 id="settings" className="scroll-mt-24 text-lg font-semibold text-white">Profile settings</h2><SettingsForm settings={profileSettings(stored)} /></section>
      <section aria-labelledby="integrations" className="space-y-4"><h2 id="integrations" className="text-lg font-semibold text-white">Connected services</h2><div className="grid gap-3 sm:grid-cols-2">{integrations.map((integration) => <div key={integration.id} className={panel}><h3 className="text-sm font-semibold text-white">{integration.name}</h3><p className="mt-1 text-sm text-text-secondary">{integration.message}</p></div>)}</div></section>
    </div>
  );
}
