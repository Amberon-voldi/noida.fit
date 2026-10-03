import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { SearchForm } from "@/components/discovery/SearchForm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Reveal } from "@/components/ui/Reveal";
import { getDirectory } from "@/lib/data";
import { filterDirectory, readFilters } from "@/components/discovery/filter";
import { ListingImage } from "@/components/discovery/ListingImage";

export const metadata: Metadata = {
  title: { absolute: "NOIDA.FIT — Discover Fitness Communities & Events in Noida" },
  description: "Find running clubs, group rides, track sessions, and open workouts across Noida and Greater Noida. Discover your next place to show up.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const directory = await getDirectory();
  const { activities } = directory;
  const events = filterDirectory(directory, readFilters({ date: "week", type: "events" })).events.slice(0, 4);
  const weekend = filterDirectory(directory, readFilters({ date: "weekend", type: "events" })).events.slice(0, 3);
  const communities = directory.communities.filter((item) => item.featured).slice(0, 3);
  const featuredPlaces = directory.places.slice(0, 3);

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <section className="home-hero border-b border-border-subtle pb-8 pt-8 sm:py-16" aria-labelledby="hero-heading">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-8">
            <div className="hero-stagger min-w-0">
              <p className="eyebrow inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />Noida &amp; Greater Noida</p>
              <h1 id="hero-heading" className="mt-4 text-[clamp(2rem,9.3vw,4.5rem)] font-black leading-[1.05] tracking-[-.045em] text-white"><span className="md:hidden">Find your next move.</span><span className="hidden md:inline">Your fitness scene.<br /><span className="text-velocity">All in one place.</span></span></h1>
              <p className="home-intro mt-4 max-w-xl text-sm leading-relaxed text-text-secondary sm:mt-6 sm:text-lg"><span className="md:hidden">Local sessions. Good company.</span><span className="hidden md:inline">Find a run, a workout, or your people. Good things happen when you show up.</span></p>
              <SearchForm id="home-search" className="mt-6 max-w-2xl" action="/discover" placeholder="Try running, yoga, Sector 50…" />
              <nav className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Quick plans">
                <Link href="/events?date=today" className="filter-chip"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Today</Link>
                <Link href="/events?date=weekend" className="filter-chip">This weekend <span aria-hidden="true">↗</span></Link>
                <Link href="/events?price=free" className="filter-chip">Free sessions</Link>
              </nav>
            </div>
            <div className="hero-enter relative hidden overflow-hidden rounded-2xl border border-border-subtle lg:block">
              <div className="relative aspect-[4/3]"><ListingImage category="running" alt="" sizes="500px" hero /></div>
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
              <div className="absolute bottom-12 left-6 right-6"><p className="eyebrow">A little movement. A good crowd.</p><p className="mt-2 max-w-xs text-3xl font-bold leading-tight text-white">The best part?<br />You don’t go alone.</p></div>
            </div>
          </div>
        </section>

        <div className="home-sections mx-auto max-w-7xl space-y-10 px-4 py-6 sm:space-y-16 sm:px-6 sm:py-12 lg:px-8">
          <HomeSection id="week" eyebrow="Make a plan" title="The next seven days" href="/events" linkLabel="All events" emptyOnMobile={!events.length}>
            {events.length ? <div className="mobile-rail grid auto-cols-[88%] grid-flow-col gap-4 overflow-x-auto pb-4 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 lg:grid-cols-4">{events.map(event => <EventCard key={event.id} event={event} />)}</div> : <EmptyHome message="New sessions are being added. Find a community with a regular rhythm." href="/communities" label="Find a community" />}
          </HomeSection>

          <HomeSection id="activities" eyebrow="Find your thing" title="Choose your next move" href="/activities" linkLabel="All activities">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
              {activities.slice(0, 6).map(activity => <Link href={`/activities/${activity.slug}`} key={activity.id} className="motion-card motion-photo group relative aspect-[4/3] overflow-hidden rounded-xl border border-border-subtle sm:aspect-[4/5]">
                <ListingImage category={activity.slug} alt="" sizes="(max-width:640px) 45vw, 200px" />
                <span className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
                <span className="absolute bottom-10 left-3 right-3 flex items-center justify-between gap-2 text-sm font-semibold text-white sm:left-4 sm:text-base">{activity.name}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></span>
              </Link>)}
            </div>
          </HomeSection>

          <HomeSection id="community" eyebrow="Find your people" title="Better together" href="/communities" linkLabel="All groups">
            {communities.length ? <div className="mobile-rail grid auto-cols-[88%] grid-flow-col gap-4 overflow-x-auto pb-4 md:auto-cols-auto md:grid-flow-row md:grid-cols-3">{communities.map(community => <CommunityCard key={community.id} community={community} />)}</div> : <EmptyHome message="Find a local group to make movement a regular thing." href="/communities" label="Browse communities" />}
          </HomeSection>

          <HomeSection id="places" eyebrow="Your neighbourhood" title="A place to get moving" href="/places" linkLabel="All places">
            {featuredPlaces.length ? <div className="mobile-rail grid auto-cols-[88%] grid-flow-col gap-4 overflow-x-auto pb-4 md:auto-cols-auto md:grid-flow-row md:grid-cols-3">{featuredPlaces.map(place => <PlaceCard key={place.id} place={place} />)}</div> : <EmptyHome message="Venue details are on the way." href="/discover" label="Explore the directory" />}
          </HomeSection>

          <HomeSection id="weekend" eyebrow="Make time for you" title="Your weekend, sorted" href="/events?date=weekend" linkLabel="This weekend" emptyOnMobile={!weekend.length}>
            {weekend.length ? <div className="mobile-rail grid auto-cols-[88%] grid-flow-col gap-4 overflow-x-auto pb-4 md:auto-cols-auto md:grid-flow-row md:grid-cols-3">{weekend.map(event => <EventCard key={event.id} event={event} />)}</div> : <EmptyHome message="No weekend sessions listed yet. Explore another day or find a regular group." href="/events" label="Browse events" />}
          </HomeSection>

          <Reveal>
            <section className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8" aria-labelledby="organizer-heading">
              <div className="max-w-2xl"><p className="eyebrow">For organizers</p><h2 id="organizer-heading" className="mt-2 text-xl font-bold sm:text-2xl">You bring the group. We’ll help people find it.</h2><p className="mt-2 text-sm text-text-secondary">Share your regular run, ride, class, or game for a listing review.</p></div>
              <Link href="/for-organizers" className="button-primary">List your group <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
            </section>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

function HomeSection({ id, eyebrow, title, href, linkLabel, children, emptyOnMobile = false }: { id: string; eyebrow: string; title: string; href: string; linkLabel: string; children: ReactNode; emptyOnMobile?: boolean }) {
  return <Reveal className={emptyOnMobile ? "empty-home-section" : ""}><section aria-labelledby={`${id}-heading`}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 sm:mb-6"><div><p className="eyebrow">{eyebrow}</p><h2 id={`${id}-heading`} className="mt-1 text-xl font-bold tracking-tight sm:text-3xl">{title}</h2></div><Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-velocity sm:text-sm">{linkLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    {children}
  </section></Reveal>;
}

function EmptyHome({ message, href, label }: { message: string; href: string; label: string }) {
  return <div className="rounded-xl border border-dashed border-border-strong px-5 py-8 text-center"><p className="text-sm text-text-secondary">{message}</p><Link href={href} className="button-secondary mt-4 text-velocity">{label}</Link></div>;
}
