import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { SearchForm } from "@/components/discovery/SearchForm";
import type { HomeHighlights } from "@/lib/home";
import "./home-hub.css";

export interface HomeHubProps {
  highlights: HomeHighlights | null;
  memberName?: string;
}

function SectionHeading({ id, title, note, href, link }: { id: string; title: string; note?: string; href: string; link: string }) {
  return <div className="hub-section-heading"><div><h2 id={id}>{title}</h2>{note && <p>{note}</p>}</div><Link href={href} className="hub-link">{link}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>;
}

export function HomeHub({ highlights, memberName }: HomeHubProps) {
  return <div className="home-hub">
    <header className="hub-header">
      <h1 id="home-heading">{memberName ? `Hi, ${memberName}.` : "Welcome."}</h1>
      <div className="hub-search">
        <SearchForm action="/discover" id="home-search" placeholder="Search an activity, club or sector" />
        <nav aria-label="Quick plans" className="hub-quick-plans">
          <Link href="/events?date=today"><CalendarDays size={15} aria-hidden="true" />Today</Link>
          <Link href="/events?date=weekend">This weekend</Link>
          <Link href="/events?price=free">Free sessions</Link>
          <Link href="/discover">Discover<ArrowUpRight size={14} aria-hidden="true" /></Link>
        </nav>
      </div>
    </header>

    <nav aria-label="Explore by activity" className="hub-activities">
      {highlights?.activities.map(activity => <Link href={`/discover?activity=${encodeURIComponent(activity.slug)}`} key={activity.id}><span aria-hidden="true">{activity.emoji}</span>{activity.name}</Link>)}
      <Link className="hub-all-activities" href="/activities">All activities<ArrowUpRight size={14} aria-hidden="true" /></Link>
    </nav>
    {!highlights && <div className="hub-notice" role="alert"><h2>Directory temporarily unavailable</h2><p>We couldn’t load the latest listings. Try again before making a plan.</p><a href="/home" className="hub-link">Retry directory<ArrowUpRight size={16} aria-hidden="true" /></a></div>}
    {highlights?.hasDemo && <p className="hub-demo-note">Some listings shown are <strong>illustrative</strong>, not confirmed sessions, clubs or venues. Check listing details before making plans.</p>}

    <section className="hub-section" aria-labelledby="hub-events-heading">
      <SectionHeading id="hub-events-heading" title="Upcoming events" note={highlights ? highlights.eventWindow === "week" ? "Next seven days · IST" : "Next upcoming sessions · IST" : undefined} href="/events" link="All events" />
      {highlights?.events.length ? <div className="hub-cards hub-events">{highlights.events.map(event => <EventCard key={event.id} event={event} compact showDemoBadge={false} />)}</div> : <div className="hub-empty"><CalendarDays size={24} aria-hidden="true" /><div><h3>{highlights ? "No upcoming sessions listed yet." : "Sessions could not be loaded."}</h3><p>{highlights ? "Explore a club’s regular schedule, or check back for new dates." : "Retry the directory before making a plan."}</p><Link href="/communities" className="hub-link">Explore clubs<ArrowUpRight size={16} aria-hidden="true" /></Link></div></div>}
    </section>

    <section className="hub-section" aria-labelledby="hub-clubs-heading">
      <SectionHeading id="hub-clubs-heading" title="Communities" href="/communities" link="All communities" />
      {highlights?.communities.length ? <div className="hub-cards hub-communities">{highlights.communities.map(community => <CommunityCard key={community.id} community={community} compact showDemoBadge={false} />)}</div> : <p className="hub-empty-text">{highlights ? "No published clubs yet. Check back for community listings." : "Community listings are unavailable for this request."}</p>}
    </section>

    <section className="hub-section" aria-labelledby="hub-places-heading">
      <SectionHeading id="hub-places-heading" title="Places" href="/places" link="All places" />
      {highlights?.places.length ? <div className="hub-cards hub-places">{highlights.places.map(place => <PlaceCard key={place.id} place={place} compact showDemoBadge={false} />)}</div> : <p className="hub-empty-text">{highlights ? "No published places yet. Venue details are on the way." : "Venue listings are unavailable for this request."}</p>}
    </section>
    <footer className="hub-footnote"><Link href="/" className="hub-link">Meet NOIDA.FIT<ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
  </div>;
}
