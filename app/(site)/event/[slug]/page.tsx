import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventActions } from "@/components/participation/EventActions";
import { SaveButton } from "@/components/participation/SaveButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { Breadcrumb, StructuredData } from "@/components/discovery/DetailPrimitives";
import { DemoNotice, ListingImage } from "@/components/discovery/ListingImage";
import { eventIsUpcoming, eventTimestamp } from "@/components/discovery/filter";
import { listingMetadata } from "@/components/discovery/metadata";
import { getActivities, getEventBySlug } from "@/lib/data";
import { CATEGORY_LABELS, formatDate, SITE_CONFIG } from "@/lib/config";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();
  return listingMetadata({ title: `${event.title} — ${formatDate(event.date)} at ${event.venueName}`, description: `${event.startTime} IST · ${event.sector} · ${event.price}. ${event.description}`, path: `/event/${event.slug}`, image: event.coverImageUrl ?? event.imageUrl, demo: event.demo });
}

export default async function EventPage({ params }: Props) {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();
  const activities = await getActivities();
  const activity = activities.find((item) => item.id === event.activityId || item.slug === event.activityId) ?? activities.find((item) => item.slug === event.category);
  const upcoming = eventIsUpcoming(event);
  const start = eventTimestamp(event);
  const end = eventTimestamp(event, true);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "SportsEvent", name: event.title, description: event.description,
    startDate: Number.isFinite(start) ? new Date(start).toISOString() : undefined,
    endDate: Number.isFinite(end) ? new Date(end).toISOString() : undefined,
    eventStatus: event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.venueName, address: { "@type": "PostalAddress", streetAddress: event.sector, addressLocality: event.sector.includes("Greater Noida") ? "Greater Noida" : "Noida", addressRegion: "Uttar Pradesh", addressCountry: "IN" } },
    organizer: { "@type": "SportsClub", name: event.communityName, url: `${SITE_CONFIG.url}/community/${event.communitySlug}` },
    url: `${SITE_CONFIG.url}/event/${event.slug}`,
  };

  return (
    <div className="pb-16">
      {!event.demo && <StructuredData data={jsonLd} />}
      <Breadcrumb directory="Events" href="/events" title={event.title} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_350px] lg:px-8">
        <div className="min-w-0 space-y-8">
          <header>
            <div className="relative mb-7 aspect-[16/9] overflow-hidden rounded-2xl border border-border-subtle sm:aspect-[16/7]"><ListingImage src={event.coverImageUrl ?? event.imageUrl} category={event.category} alt={event.title} hero sizes="(max-width: 1024px) 100vw, 760px" /></div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={activity ? `/activities/${activity.slug}` : `/events?activity=${event.category}`} className="filter-chip text-velocity">{activity?.name ?? CATEGORY_LABELS[event.category]}</Link>
              <Link href={`/discover?sector=${encodeURIComponent(event.sector)}`} className="filter-chip">{event.sector}</Link>
              {event.demo && <span className="text-xs font-semibold uppercase text-text-secondary">Demo listing</span>}
            </div>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{event.title}</h1>
            <p className="mt-4 text-sm text-text-secondary">Hosted by <Link href={`/community/${event.communitySlug}`} className="font-semibold text-velocity hover:text-velocity-glow">{event.communityName}</Link></p>
          </header>
          {event.demo && <DemoNotice detail />}
          {!upcoming && <p role="status" className="rounded-lg border border-border-strong bg-surface px-4 py-3 text-sm text-text-secondary">{event.status === "cancelled" ? "This gathering has been cancelled." : "This gathering has ended."} Check the host community for other sessions.</p>}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Date", formatDate(event.date)], ["Time · IST", `${event.startTime} – ${event.endTime}`], ["Cost", event.price], ["Level", event.level ?? "Ask the host"]].map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border border-border-subtle bg-surface p-4"><dt className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">{label}</dt><dd className="mt-2 break-words text-sm font-semibold">{value}</dd></div>)}
          </dl>
          <section aria-labelledby="event-about-heading"><h2 id="event-about-heading" className="text-xl font-bold">About this gathering</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-text-secondary">{event.description}</p></section>
          {event.routeOverview && <section aria-labelledby="route-heading"><h2 id="route-heading" className="text-xl font-bold">Route &amp; meeting notes</h2><p className="mt-3 leading-relaxed text-text-secondary">{event.routeOverview}</p></section>}
          {!!event.whatToBring?.length && <section aria-labelledby="bring-heading"><h2 id="bring-heading" className="text-xl font-bold">What to bring</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">{event.whatToBring.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        </div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="event-actions-heading" className="rounded-xl border border-border-strong bg-surface p-5">
            <h2 id="event-actions-heading" className="eyebrow mb-4">{event.demo ? "Try participation" : "Your next step"}</h2>
            {event.demo && <p className="mb-4 text-xs leading-relaxed text-text-secondary">Saving or RSVPing stores a real account record for this demo. It does not book a real session or take a payment.</p>}
            {upcoming ? <EventActions eventId={event.id} eventSlug={event.slug} title={event.title} date={event.date} startTime={event.startTime} endTime={event.endTime} venueName={event.venueName} communityName={event.communityName} /> : <div className="flex flex-wrap gap-2"><SaveButton itemType="event" itemId={event.id} /><ShareButton title={event.title} /></div>}
          </section>
          <section aria-labelledby="meeting-heading" className="rounded-xl border border-border-subtle bg-surface p-5">
            <h2 id="meeting-heading" className="eyebrow">Meeting point</h2><p className="mt-3 font-bold">{event.venueName}</p><p className="mt-1 text-sm text-text-secondary">{event.sector}</p>
            <Link href={`/place/${event.venueSlug}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-velocity">See the place details →</Link>
            {!event.demo && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueName}, ${event.sector}, Noida`)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center text-sm text-text-secondary hover:text-white">Open directions ↗</a>}
          </section>
          <Link href={`/community/${event.communitySlug}`} className="block rounded-xl border border-border-subtle bg-surface p-5 hover:border-border-strong"><p className="eyebrow">Host community</p><p className="mt-2 font-bold">{event.communityName}</p><p className="mt-1 text-sm text-velocity">View schedule →</p></Link>
        </aside>
      </div>
    </div>
  );
}
