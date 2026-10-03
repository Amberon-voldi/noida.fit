import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getActivityBySlug, getDirectory } from "@/lib/data";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { Breadcrumb, StructuredData } from "@/components/discovery/DetailPrimitives";
import { EmptyState } from "@/components/discovery/FilterLinks";
import { filterDirectory, readFilters } from "@/components/discovery/filter";
import { listingMetadata } from "@/components/discovery/metadata";
import { SITE_CONFIG } from "@/lib/config";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const activity = await getActivityBySlug((await params).slug);
  if (!activity) notFound();
  return listingMetadata({ title: `${activity.name} in Noida`, description: `${activity.description} Find local sessions, communities and places across Noida.`, path: `/activities/${activity.slug}` });
}

export default async function ActivityPage({ params }: Props) {
  const activity = await getActivityBySlug((await params).slug);
  if (!activity) notFound();
  const directory = await getDirectory();
  const { events, communities, places, total } = filterDirectory(directory, readFilters({ activity: activity.slug }));
  return (
    <div className="pb-16">
      <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `${activity.name} in Noida`, description: activity.description, url: `${SITE_CONFIG.url}/activities/${activity.slug}` }} />
      <Breadcrumb directory="Activities" href="/activities" title={activity.name} />
      <header className="activity-guide-header border-b border-border-subtle px-4 py-10 sm:px-6 sm:py-14 lg:px-8"><div className="mx-auto max-w-7xl"><p className="eyebrow">Activity guide</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl"><span aria-hidden="true" className="mr-3">{activity.emoji}</span>{activity.name} in Noida</h1><p className="mt-4 max-w-2xl leading-relaxed text-text-secondary">{activity.description}</p><Link href={`/discover?activity=${encodeURIComponent(activity.slug)}`} className="button-primary mt-6">Filter by sector, date or cost →</Link></div></header>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {!!events.length && <section aria-labelledby="activity-events-heading"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 id="activity-events-heading" className="text-2xl font-bold">Upcoming {activity.name.toLowerCase()} sessions</h2><Link href={`/events?activity=${encodeURIComponent(activity.slug)}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-velocity">Filter events →</Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div></section>}
        {!!communities.length && <section aria-labelledby="activity-communities-heading"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 id="activity-communities-heading" className="text-2xl font-bold">Communities for {activity.name.toLowerCase()}</h2><Link href={`/communities?activity=${encodeURIComponent(activity.slug)}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-velocity">Filter communities →</Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{communities.map((community) => <CommunityCard key={community.id} community={community} />)}</div></section>}
        {!!places.length && <section aria-labelledby="activity-places-heading"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 id="activity-places-heading" className="text-2xl font-bold">Places for {activity.name.toLowerCase()}</h2><Link href={`/places?activity=${encodeURIComponent(activity.slug)}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-velocity">Filter places →</Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{places.map((place) => <PlaceCard key={place.id} place={place} />)}</div></section>}
        {!total && <EmptyState title={`No ${activity.name.toLowerCase()} listings yet`} description="Browse other activities or check back when a local organizer publishes a session." href="/activities" label="Browse all activities" />}
      </div>
    </div>
  );
}
