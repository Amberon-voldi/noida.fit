import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { SearchForm } from "@/components/discovery/SearchForm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getDirectory } from "@/lib/data";
import { filterDirectory, readFilters } from "@/components/discovery/filter";
import { DemoNotice, ListingImage } from "@/components/discovery/ListingImage";

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
  const hasDemo = [...events, ...communities, ...featuredPlaces].some((item) => item.demo);

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1">
      <section className="border-b border-border-subtle bg-background px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8" aria-labelledby="hero-heading">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-velocity">THE CITY FITNESS DIRECTORY</p>
            <h1 id="hero-heading" className="mt-4 max-w-4xl text-4xl font-black leading-[1.03] tracking-[-.045em] text-white sm:text-6xl lg:text-7xl">Your fitness scene.<br /><span className="text-velocity">All in one place.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">Discover runs, workouts, sports and communities across Noida and Greater Noida. Find something nearby, make a plan, and get moving.</p>
            <SearchForm id="home-search" className="mt-8 max-w-2xl" action="/discover" placeholder="Search Sector 21A, running clubs, or weekend rides" />
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/discover" className="inline-flex min-h-11 items-center rounded-lg bg-velocity px-5 text-sm font-bold text-slate-950 hover:bg-velocity-glow">Explore Noida Fitness <span className="ml-2" aria-hidden="true">→</span></Link>
              <Link href="/communities" className="inline-flex min-h-11 items-center rounded-lg border border-border-strong px-5 text-sm font-semibold text-white hover:bg-surface-hover">Find your community</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
            <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-xl"><ListingImage category="running" alt="" sizes="(max-width: 1024px) 100vw, 500px" hero /></div>
            <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">A useful first step</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Choose the kind of movement that fits today.</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {activities.slice(0, 8).map((activity) => <Link key={activity.id} href={`/activities/${encodeURIComponent(activity.slug)}`} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-secondary hover:border-velocity hover:text-white"><span aria-hidden="true">{activity.emoji}</span> {activity.name}</Link>)}
            </div>
            <p className="mt-5 border-t border-border-subtle pt-4 text-xs leading-relaxed text-text-muted">No scores, no pressure. Just clear details on who meets, where, and when.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {hasDemo && <DemoNotice />}
        <section aria-labelledby="week-heading">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-velocity">OPEN SESSIONS</p><h2 id="week-heading" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">The next seven days</h2><p className="mt-1 text-sm text-text-secondary">Compare start times, meeting points and costs. Demo sessions are clearly labelled.</p></div><Link href="/events" className="text-sm font-semibold text-velocity hover:text-velocity-glow">See the full calendar →</Link></div>
          {events.length ? <div className="grid auto-cols-[85%] grid-flow-col gap-5 overflow-x-auto pb-4 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 lg:grid-cols-4">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <EmptyHome message="New sessions are being added. Browse all communities to find a regular rhythm." href="/communities" label="Find a community" />}
        </section>

        <section aria-labelledby="activities-heading">
          <div className="mb-7 flex items-end justify-between gap-4"><div><p className="eyebrow">Start with what you love</p><h2 id="activities-heading" className="mt-1 text-2xl font-bold sm:text-3xl">Choose your next move</h2></div><Link href="/activities" className="text-sm font-semibold text-velocity">All activities →</Link></div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{activities.slice(0,6).map(activity=><Link href={`/activities/${activity.slug}`} key={activity.id} className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border-subtle"><ListingImage category={activity.slug} alt={activity.name} sizes="(max-width:640px) 45vw, 200px"/><span className="absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-transparent"/><span className="absolute bottom-10 left-4 font-semibold text-white">{activity.name}</span></Link>)}</div>
        </section>

        <section aria-labelledby="community-heading">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-velocity">LOCAL GROUPS</p><h2 id="community-heading" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Communities with a weekly rhythm</h2></div><Link href="/communities" className="text-sm font-semibold text-velocity hover:text-velocity-glow">Browse all communities →</Link></div>
          {communities.length ? <div className="grid auto-cols-[85%] grid-flow-col gap-5 overflow-x-auto pb-4 md:auto-cols-auto md:grid-flow-row md:grid-cols-3">{communities.map((community) => <CommunityCard key={community.id} community={community} />)}</div> : <EmptyHome message="No featured communities yet. Start with the full directory." href="/communities" label="Browse communities" />}
        </section>

        <section aria-labelledby="places-heading">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-velocity">WHERE TO MEET</p><h2 id="places-heading" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Training grounds across the city</h2></div><Link href="/places" className="text-sm font-semibold text-velocity hover:text-velocity-glow">Explore places →</Link></div>
          {featuredPlaces.length ? <div className="grid auto-cols-[85%] grid-flow-col gap-5 overflow-x-auto pb-4 md:auto-cols-auto md:grid-flow-row md:grid-cols-3">{featuredPlaces.map((place) => <PlaceCard key={place.id} place={place} />)}</div> : <EmptyHome message="Venue details are on the way." href="/discover" label="Explore the directory" />}
        </section>

        <section aria-labelledby="weekend-heading">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Make room for movement</p><h2 id="weekend-heading" className="mt-1 text-2xl font-bold sm:text-3xl">Your weekend, sorted</h2></div><Link href="/events?date=weekend" className="text-sm font-semibold text-velocity">This weekend →</Link></div>
          {weekend.length ? <div className="grid auto-cols-[85%] grid-flow-col gap-5 overflow-x-auto pb-4 md:auto-cols-auto md:grid-flow-row md:grid-cols-3">{weekend.map(event=><EventCard key={event.id} event={event}/>)}</div> : <EmptyHome message="No weekend sessions listed yet. Explore another day or find a regular group." href="/events" label="Browse events"/>}
        </section>

        <section className="border-t border-border-subtle pt-12" aria-labelledby="organizer-heading"><div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-surface p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10"><div className="max-w-2xl"><p className="font-mono text-xs font-bold uppercase tracking-widest text-velocity">FOR ORGANIZERS</p><h2 id="organizer-heading" className="mt-2 text-2xl font-bold text-white">Your group already meets. Help others find it.</h2><p className="mt-2 text-sm leading-relaxed text-text-secondary">Send the details of your regular runs, rides, classes, or games for a listing review.</p></div><Link href="/for-organizers" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-velocity px-5 text-sm font-bold text-slate-950 hover:bg-velocity-glow">For organizers</Link></div></section>
      </div>
      </main>
      <Footer />
    </>
  );
}

function EmptyHome({ message, href, label }: { message: string; href: string; label: string }) {
  return <div className="rounded-xl border border-dashed border-border-strong px-6 py-10 text-center"><p className="text-sm text-text-secondary">{message}</p><Link href={href} className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-velocity px-4 text-sm font-semibold text-velocity hover:bg-velocity/10">{label}</Link></div>;
}
