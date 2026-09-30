import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectory, getPlaceBySlug } from "@/lib/data";
import { EventCard } from "@/components/cards/EventCard";
import { SaveButton } from "@/components/participation/SaveButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { Breadcrumb, StructuredData } from "@/components/discovery/DetailPrimitives";
import { DemoNotice, ListingImage } from "@/components/discovery/ListingImage";
import { eventIsUpcoming, eventTimestamp } from "@/components/discovery/filter";
import { listingMetadata } from "@/components/discovery/metadata";
import { SITE_CONFIG } from "@/lib/config";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const place = await getPlaceBySlug((await params).slug);
  if (!place) notFound();
  return listingMetadata({ title: `${place.name} — ${place.sector}`, description: `${place.category} in ${place.sector}. ${place.description}`, path: `/place/${place.slug}`, image: place.coverImageUrl ?? place.imageUrl, demo: place.demo });
}

export default async function PlacePage({ params }: Props) {
  const place = await getPlaceBySlug((await params).slug);
  if (!place) notFound();
  const directory = await getDirectory();
  const venueEvents = directory.events.filter((event) => event.venueSlug === place.slug);
  const events = venueEvents.filter((event) => eventIsUpcoming(event)).sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  const communities = directory.communities.filter((community) => community.primaryVenueSlug === place.slug || venueEvents.some((event) => event.communitySlug === community.slug));
  const activities = directory.activities.filter((activity) => place.activities?.some((value) => value === activity.slug || value === activity.id));
  const jsonLd = { "@context": "https://schema.org", "@type": "SportsActivityLocation", name: place.name, description: place.description, url: `${SITE_CONFIG.url}/place/${place.slug}`, address: { "@type": "PostalAddress", streetAddress: place.address, addressLocality: place.sector.includes("Greater Noida") ? "Greater Noida" : "Noida", addressRegion: "Uttar Pradesh", addressCountry: "IN" }, geo: { "@type": "GeoCoordinates", latitude: place.coordinates.lat, longitude: place.coordinates.lng } };

  return (
    <div className="pb-16">
      {!place.demo && <StructuredData data={jsonLd} />}
      <Breadcrumb directory="Places" href="/places" title={place.name} />
      <header className="border-b border-border-subtle px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative mb-8 aspect-[16/7] overflow-hidden rounded-2xl border border-border-subtle sm:aspect-[3/1]"><ListingImage src={place.coverImageUrl ?? place.imageUrl} category={place.activities?.[0]} alt={place.name} hero sizes="(max-width: 1280px) 100vw, 1200px" /></div>
          <p className="eyebrow">{place.category}{place.demo ? " · Demo listing" : ""}</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{place.name}</h1>
          <p className="mt-3 text-sm text-text-secondary">{place.address}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {!place.demo && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`} target="_blank" rel="noopener noreferrer" className="button-primary">Get directions ↗</a>}
            <SaveButton itemType="place" itemId={place.id} /><ShareButton title={place.name} text={`${place.name}, ${place.sector}`} />
            <Link href={`/places?sector=${encodeURIComponent(place.sector)}`} className="button-secondary">More in {place.sector}</Link>
          </div>
          {place.demo && <DemoNotice detail className="mt-6" />}
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_350px] lg:px-8">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="place-about-heading"><h2 id="place-about-heading" className="text-2xl font-bold">About this place</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-text-secondary">{place.description}</p></section>
          {!!activities.length && <section aria-labelledby="place-activities-heading"><h2 id="place-activities-heading" className="text-xl font-bold">Activities</h2><div className="mt-4 flex flex-wrap gap-2">{activities.map((activity) => <Link key={activity.id} href={`/activities/${activity.slug}`} className="filter-chip">{activity.name} →</Link>)}</div></section>}
          {!!place.amenities.length && <section aria-labelledby="amenities-heading"><h2 id="amenities-heading" className="text-2xl font-bold">{place.demo ? "Listed features · unverified" : "Listed facilities"}</h2><ul className="mt-4 flex flex-wrap gap-2">{place.amenities.map((amenity) => <li key={amenity} className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-secondary">{amenity}</li>)}</ul></section>}
          <section aria-labelledby="place-events-heading"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 id="place-events-heading" className="text-2xl font-bold">Upcoming here</h2><Link href="/events" className="inline-flex min-h-11 items-center text-sm font-semibold text-velocity">All events →</Link></div>{events.length ? <div className="grid gap-5 sm:grid-cols-2">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <p className="rounded-xl border border-dashed border-border-strong p-6 text-sm text-text-secondary">No upcoming events are currently listed at this place.</p>}</section>
        </div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="visit-heading" className="rounded-xl border border-border-subtle bg-surface p-5"><h2 id="visit-heading" className="eyebrow">Visit notes</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-xs text-text-secondary">Public hours</dt><dd className="mt-1">{place.publicHours || "Not confirmed — check with the venue"}</dd></div><div><dt className="text-xs text-text-secondary">Entry cost</dt><dd className="mt-1">{place.priceIndicator || "Not confirmed"}</dd></div>{place.parkingInfo && <div><dt className="text-xs text-text-secondary">Parking</dt><dd className="mt-1 text-text-secondary">{place.parkingInfo}</dd></div>}</dl>{place.website && /^https:\/\//i.test(place.website) && !place.demo && <a href={place.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-velocity">Venue website ↗</a>}</section>
          {!!communities.length && <section aria-labelledby="place-communities-heading" className="rounded-xl border border-border-subtle bg-surface p-5"><h2 id="place-communities-heading" className="eyebrow">Communities listed here</h2><ul className="mt-3 space-y-3">{communities.map((community) => <li key={community.id}><Link href={`/community/${community.slug}`} className="inline-flex min-h-11 items-center font-semibold hover:text-velocity-glow">{community.name}</Link><p className="text-xs text-text-secondary">{community.meetingDays.join(" · ")}{community.demo ? " · Demo" : ""}</p></li>)}</ul></section>}
          <p className="rounded-xl border border-border-subtle bg-surface p-5 text-sm leading-relaxed text-text-secondary">{place.demo ? "Approximate demo locations are not verified entrances. Do not use this listing as a travel or booking confirmation." : "Distances and real-time availability are not estimated here. Confirm access and facilities directly before visiting."}</p>
        </aside>
      </div>
    </div>
  );
}
