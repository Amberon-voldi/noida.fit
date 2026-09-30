import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommunityBySlug, getDirectory } from "@/lib/data";
import { EventCard } from "@/components/cards/EventCard";
import { FollowButton } from "@/components/participation/FollowButton";
import { SaveButton } from "@/components/participation/SaveButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { Breadcrumb, StructuredData } from "@/components/discovery/DetailPrimitives";
import { DemoNotice, ListingImage } from "@/components/discovery/ListingImage";
import { eventIsUpcoming, eventTimestamp } from "@/components/discovery/filter";
import { listingMetadata } from "@/components/discovery/metadata";
import { CATEGORY_LABELS, SITE_CONFIG } from "@/lib/config";

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
  const jsonLd = { "@context": "https://schema.org", "@type": "SportsClub", name: community.name, description: community.description, url: `${SITE_CONFIG.url}/community/${community.slug}`, address: { "@type": "PostalAddress", streetAddress: community.baseLocation, addressLocality: community.baseLocation.includes("Greater Noida") ? "Greater Noida" : "Noida", addressRegion: "Uttar Pradesh", addressCountry: "IN" } };

  return (
    <div className="pb-16">
      {!community.demo && <StructuredData data={jsonLd} />}
      <Breadcrumb directory="Communities" href="/communities" title={community.name} />
      <header className="border-b border-border-subtle px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative mb-8 aspect-[16/7] overflow-hidden rounded-2xl border border-border-subtle sm:aspect-[3/1]"><ListingImage src={community.bannerUrl} category={community.category} alt={community.name} hero sizes="(max-width: 1280px) 100vw, 1200px" /></div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={activity ? `/activities/${activity.slug}` : `/communities?activity=${community.category}`} className="filter-chip text-velocity">{activity?.name ?? CATEGORY_LABELS[community.category]}</Link>
            {community.verified && !community.demo && <span className="rounded-md border border-indigo-400/40 px-2 py-1 text-xs font-semibold text-indigo-200">Verified community</span>}
            {community.demo && <span className="text-xs font-semibold uppercase text-text-secondary">Demo listing</span>}
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">{community.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-text-secondary">{community.tagline}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary"><span>{community.baseLocation}</span><span>{community.meetingDays.join(" · ")}</span></div>
          <div className="mt-6 flex flex-wrap gap-2"><FollowButton communityId={community.id} /><SaveButton itemType="community" itemId={community.id} /><ShareButton title={community.name} text={community.tagline} /></div>
          {community.demo && <DemoNotice detail className="mt-6" />}
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_350px] lg:px-8">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="community-about-heading"><h2 id="community-about-heading" className="text-2xl font-bold">About this community</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-text-secondary">{community.description}</p></section>
          {!!community.schedule?.length && <section aria-labelledby="schedule-heading">
            <h2 id="schedule-heading" className="text-2xl font-bold">Weekly rhythm</h2><p className="mt-2 text-xs text-text-secondary">All times are in India Standard Time. Confirm each session with the host.</p>
            <ul className="mt-4 divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle">
              {community.schedule.map((item) => {
                const scheduledPlace = directory.places.find((venue) => venue.name === item.venueName);
                return <li key={`${item.day}-${item.time}-${item.sessionType}`} className="grid gap-2 bg-surface p-4 sm:grid-cols-[90px_90px_minmax(0,1fr)]"><span className="font-semibold">{item.day}</span><span className="font-mono text-xs text-velocity">{item.time}</span><div><p className="text-sm text-text-secondary">{item.sessionType}</p>{scheduledPlace ? <Link href={`/place/${scheduledPlace.slug}`} className="inline-flex min-h-11 items-center text-sm text-velocity">{item.venueName} →</Link> : <p className="mt-1 text-sm text-text-secondary">{item.venueName}</p>}</div></li>;
              })}
            </ul>
          </section>}
          <section aria-labelledby="community-events-heading"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 id="community-events-heading" className="text-2xl font-bold">Upcoming gatherings</h2><Link href="/events" className="inline-flex min-h-11 items-center text-sm font-semibold text-velocity">All events →</Link></div>{events.length ? <div className="grid gap-5 sm:grid-cols-2">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <p className="rounded-xl border border-dashed border-border-strong p-6 text-sm text-text-secondary">No upcoming events are published for this community. A weekly schedule is not a confirmed event.</p>}</section>
        </div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          {place && <Link href={`/place/${place.slug}`} className="block rounded-xl border border-border-subtle bg-surface p-5 hover:border-border-strong"><p className="eyebrow">Home turf</p><p className="mt-2 font-bold">{place.name}</p><p className="mt-1 text-sm text-text-secondary">{place.sector}</p><span className="mt-4 inline-block text-sm font-semibold text-velocity">See venue details →</span></Link>}
          {!!community.captains.length && <section aria-labelledby="captains-heading" className="rounded-xl border border-border-subtle bg-surface p-5"><h2 id="captains-heading" className="eyebrow">{community.demo ? "Sample captains" : "Captains"}</h2><ul className="mt-4 space-y-4">{community.captains.map((captain) => <li key={`${captain.name}-${captain.role}`}><p className="font-semibold">{captain.name}</p><p className="text-xs text-velocity">{captain.role}</p>{captain.bio && <p className="mt-1 text-xs leading-relaxed text-text-secondary">{captain.bio}</p>}</li>)}</ul></section>}
          {!!channels.length && !community.demo && <section aria-labelledby="channels-heading" className="rounded-xl border border-border-subtle bg-surface p-5"><h2 id="channels-heading" className="eyebrow">Community channels</h2><ul className="mt-3">{channels.map(([label, href]) => <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm capitalize text-velocity">{label} ↗</a></li>)}</ul></section>}
          <div className="rounded-xl border border-border-subtle bg-surface p-5"><p className="eyebrow">First time?</p><p className="mt-2 text-sm leading-relaxed text-text-secondary">{community.demo ? "This sample group is here to demonstrate the directory. Following it stores your preference, not a membership in a real-world club." : "Check the event details and ask the organizer about pace, equipment and access before travelling. Following a community saves your interest; it does not book an event."}</p></div>
        </aside>
      </div>
    </div>
  );
}
