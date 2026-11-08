import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommunityBySlug, getDirectory } from "@/lib/data";
import { EventCard } from "@/components/cards/EventCard";
import { FollowButton } from "@/components/participation/FollowButton";
import { SaveButton } from "@/components/participation/SaveButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { StructuredData } from "@/components/discovery/DetailPrimitives";
import { DetailHero } from "@/components/discovery/DetailHero";
import { BioIntro } from "@/components/discovery/BioIntro";
import { listingPhoto } from "@/components/cards/CardMedia";
import { eventIsUpcoming, eventTimestamp } from "@/components/discovery/filter";
import { listingMetadata } from "@/components/discovery/metadata";
import { Activity, CalendarDays, Clock3, ExternalLink, Info, MapPin, Navigation, type LucideIcon } from "lucide-react";
import { CATEGORY_LABELS, formatDate, SITE_CONFIG } from "@/lib/config";

const directionsUrl = (name: string, sector?: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, sector, "Noida"].filter(Boolean).join(", "))}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const community = await getCommunityBySlug((await params).slug);
  if (!community) notFound();
  return listingMetadata({ title: `${community.name} — ${community.baseLocation}`, description: `${community.tagline} ${CATEGORY_LABELS[community.category]} schedules and local gatherings in ${community.baseLocation}.`, path: `/community/${community.slug}`, image: community.bannerUrl, demo: community.demo });
}

export default async function CommunityPage({ params }: Props) {
  const community = await getCommunityBySlug((await params).slug);
  if (!community) notFound();
  const directory = await getDirectory();
  const events = directory.events.filter((event) => event.communitySlug === community.slug && eventIsUpcoming(event)).sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  const place = directory.places.find((item) => item.slug === community.primaryVenueSlug);
  const activity = directory.activities.find((item) => item.id === community.activityId || item.slug === community.activityId) ?? directory.activities.find((item) => item.slug === community.category);
  const channels = Object.entries(community.socialLinks).filter((entry): entry is [string, string] => typeof entry[1] === "string" && /^https:\/\//i.test(entry[1]));
  const next = events[0];
  const facts: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "Activity", value: activity?.name ?? CATEGORY_LABELS[community.category], icon: Activity },
    { label: "Meets", value: community.meetingDays.join(" · ") || "Ask the host", icon: CalendarDays },
    { label: "Based in", value: community.baseLocation, icon: MapPin },
    { label: "Next gathering", value: next ? `${formatDate(next.date)} · ${next.startTime}` : "None scheduled", icon: Clock3 },
  ];
  const jsonLd = { "@context": "https://schema.org", "@type": "SportsClub", name: community.name, description: community.description, url: `${SITE_CONFIG.url}/community/${community.slug}`, address: { "@type": "PostalAddress", streetAddress: community.baseLocation, addressLocality: community.baseLocation.includes("Greater Noida") ? "Greater Noida" : "Noida", addressRegion: "Uttar Pradesh", addressCountry: "IN" } };

  return (
    <div className="pb-16">
      {!community.demo && <StructuredData data={jsonLd} />}
      <BioIntro kind="club" id={community.slug} name={community.name} initials={initials(community.name)} crest={listingPhoto(community.crestUrl)} subtitle={`${activity?.name ?? CATEGORY_LABELS[community.category]} · ${community.baseLocation}`} />
      <DetailHero image={community.bannerUrl} category={community.category} title={community.name} logo={community.crestUrl} logoAlt={`${community.name} logo`} verified={community.verified && !community.demo} verifiedLabel="Verified community">
          <div className="flex flex-wrap items-center gap-2">
            <span className="filter-chip pointer-events-none text-velocity">{activity?.name ?? CATEGORY_LABELS[community.category]}</span>
            {community.demo && <span className="text-xs font-semibold uppercase text-text-secondary">Demo listing</span>}
          </div>
          <p className="mt-4 max-w-2xl text-lg text-text-secondary">{community.tagline}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary"><span>{community.baseLocation}</span><span>{community.meetingDays.join(" · ")}</span></div>
          <div className="mt-6 flex flex-wrap gap-2"><FollowButton communityId={community.id} /><SaveButton itemType="community" itemId={community.id} /><ShareButton title={community.name} text={community.tagline} /></div>
      </DetailHero>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="min-w-0 space-y-12">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {facts.map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0 rounded-xl border border-border-subtle bg-surface p-4"><dt className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-secondary"><Icon className="size-4 shrink-0 text-velocity" aria-hidden="true" />{label}</dt><dd className="mt-2 break-words text-sm font-semibold">{value}</dd></div>)}
          </dl>
          <section aria-labelledby="community-events-heading">
            <div className="mb-5 flex items-center gap-3"><h2 id="community-events-heading" className="text-2xl font-bold">Upcoming gatherings</h2>{!!events.length && <span className="rounded-md bg-surface-elevated px-2 py-1 font-mono text-xs font-semibold">{events.length}</span>}</div>
            {events.length ? <div className="grid gap-5 sm:grid-cols-2">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="flex items-start gap-3 rounded-xl border border-dashed border-border-strong p-6 text-sm text-text-secondary"><CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>No upcoming events are published yet. Follow {community.name} to hear when the next one goes live. A weekly schedule is not a confirmed event.</p></div>}
          </section>
          <section aria-labelledby="community-about-heading"><h2 id="community-about-heading" className="text-2xl font-bold">About this community</h2><p className="mt-4 max-w-3xl whitespace-pre-line leading-relaxed text-text-secondary">{community.description}</p></section>
          {!!community.schedule?.length && <section aria-labelledby="schedule-heading">
            <h2 id="schedule-heading" className="text-2xl font-bold">Weekly rhythm</h2><p className="mt-2 text-xs text-text-secondary">All times are in India Standard Time. Confirm each session with the host.</p>
            <ul className="mt-5 divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface">
              {community.schedule.map((item) => {
                const venue = directory.places.find((place) => place.name === item.venueName);
                return <li key={`${item.day}-${item.time}-${item.sessionType}`} className="grid gap-x-4 gap-y-2 p-4 sm:grid-cols-[110px_100px_minmax(0,1fr)_auto] sm:items-center">
                  <span className="flex items-center gap-2 font-semibold"><CalendarDays className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />{item.day}</span>
                  <span className="flex items-center gap-2 font-mono text-xs text-velocity"><Clock3 className="size-4 shrink-0" aria-hidden="true" />{item.time}</span>
                  <div className="min-w-0"><p className="text-sm font-medium">{item.sessionType}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary"><MapPin className="size-3.5 shrink-0" aria-hidden="true" />{item.venueName}</p></div>
                  {!community.demo && <a href={directionsUrl(item.venueName, venue?.sector)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${item.venueName}`} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-velocity hover:text-velocity-glow sm:justify-end"><Navigation className="size-4" aria-hidden="true" />Directions</a>}
                </li>;
              })}
            </ul>
          </section>}
        </div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          {place && <section aria-labelledby="turf-heading" className="rounded-xl border border-border-subtle bg-surface p-5"><h2 id="turf-heading" className="eyebrow">Home turf</h2><p className="mt-3 font-bold">{place.name}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary"><MapPin className="size-4 shrink-0" aria-hidden="true" />{place.sector}</p>{!community.demo && <a href={directionsUrl(place.name, place.sector)} target="_blank" rel="noopener noreferrer" className="button-secondary mt-4 w-full"><Navigation className="size-4" aria-hidden="true" />Get directions</a>}</section>}
          {!!community.captains.length && <section aria-labelledby="captains-heading" className="rounded-xl border border-border-subtle bg-surface p-5"><h2 id="captains-heading" className="eyebrow">{community.demo ? "Sample captains" : "Captains"}</h2><ul className="mt-4 space-y-4">{community.captains.map((captain) => <li key={`${captain.name}-${captain.role}`} className="flex gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-mono text-xs font-semibold text-velocity">{initials(captain.name)}</span><div className="min-w-0"><p className="font-semibold leading-tight">{captain.name}</p><p className="mt-0.5 text-xs text-velocity">{captain.role}</p>{captain.bio && <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{captain.bio}</p>}</div></li>)}</ul></section>}
          {!!channels.length && !community.demo && <section aria-labelledby="channels-heading" className="rounded-xl border border-border-subtle bg-surface p-5"><h2 id="channels-heading" className="eyebrow">Community channels</h2><ul className="mt-4 grid gap-2">{channels.map(([label, href]) => <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" className="button-secondary w-full justify-between capitalize">{label}<ExternalLink className="size-4 text-text-secondary" aria-hidden="true" /></a></li>)}</ul></section>}
          <section aria-labelledby="first-time-heading" className="rounded-xl border border-border-subtle bg-surface p-5"><h2 id="first-time-heading" className="eyebrow flex items-center gap-2"><Info className="size-4" aria-hidden="true" />First time?</h2><p className="mt-3 text-sm leading-relaxed text-text-secondary">{community.demo ? "This sample group is here to demonstrate the directory. Following it stores your preference, not a membership in a real-world club." : "Check the event details and ask the organizer about pace, equipment and access before travelling. Following a community saves your interest; it does not book an event."}</p></section>
        </aside>
      </div>
    </div>
  );
}
