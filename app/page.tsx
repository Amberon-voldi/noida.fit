import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Reveal } from "@/components/ui/Reveal";
import { LandingMotion } from "@/components/home/LandingMotion";
import { LandingHero } from "@/components/home/LandingHero";
import { LandingStory } from "@/components/home/LandingStory";
import { getDirectory } from "@/lib/data";
import { filterDirectory, readFilters } from "@/components/discovery/filter";
import { ListingImage } from "@/components/discovery/ListingImage";
import "@/components/home/landing.css";

export const metadata: Metadata = {
  title: { absolute: "NOIDA.FIT — Discover Fitness Communities & Events in Noida" },
  description: "Find your people. Discover running clubs, group rides, track sessions and open workouts across Noida and Greater Noida. Show up and move together.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const directory = await getDirectory();
  const { activities } = directory;
  const events = filterDirectory(directory, readFilters({ date: "week", type: "events" })).events.slice(0, 4);
  const weekend = filterDirectory(directory, readFilters({ date: "weekend", type: "events" })).events.slice(0, 3);
  const communities = directory.communities.filter(item => item.featured).slice(0, 3);
  const featuredPlaces = directory.places.slice(0, 3);
  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://noida.fit").origin;
  const website = { "@context": "https://schema.org", "@type": "WebSite", name: "NOIDA.FIT", url: siteUrl, description: metadata.description, potentialAction: { "@type": "SearchAction", target: `${siteUrl}/discover?q={search_term_string}`, "query-input": "required name=search_term_string" } };

  return <>
    <Navbar />
    <main id="main-content" tabIndex={-1} className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
      <LandingMotion>
        <LandingHero />
        <div className="landing-container landing-content">
          <LandingSection id="week" number="01" eyebrow="Make a plan" title="Your next seven days." href="/events" linkLabel="All events">
            {events.length ? <div className="landing-card-rail landing-events-grid mobile-rail">{events.map(event => <EventCard key={event.id} event={event} />)}</div> : <EmptyHome message="No sessions listed for the next seven days yet. Find a community with a regular rhythm." href="/communities" label="Find a community" />}
          </LandingSection>

          <LandingSection id="activities" number="02" eyebrow="Find your thing" title="More than one way to move." href="/activities" linkLabel="All activities">
            {activities.length ? <div className="landing-activities-grid">{activities.slice(0, 6).map(activity => <Link href={`/activities/${activity.slug}`} key={activity.id} data-reveal-item className="landing-activity motion-card motion-photo">
              <ListingImage category={activity.slug} alt="" sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 200px" />
              <span className="landing-activity-shade" />
              <span className="landing-activity-name">{activity.name}<ArrowUpRight size={18} aria-hidden="true" /></span>
            </Link>)}</div> : <EmptyHome message="Activity guides are being added. Explore the directory in the meantime." href="/discover" label="Explore the directory" />}
          </LandingSection>

          <LandingStory />

          <LandingSection id="community" number="03" eyebrow="Find your people" title="Good company. Great energy." href="/communities" linkLabel="All groups">
            {communities.length ? <div className="landing-card-rail landing-three-grid mobile-rail">{communities.map(community => <CommunityCard key={community.id} community={community} />)}</div> : <EmptyHome message="Find a local group to make movement a regular thing." href="/communities" label="Browse communities" />}
          </LandingSection>

          <LandingSection id="places" number="04" eyebrow="Closer than you think" title="Your city is your playground." href="/places" linkLabel="All places">
            {featuredPlaces.length ? <div className="landing-card-rail landing-three-grid mobile-rail">{featuredPlaces.map(place => <PlaceCard key={place.id} place={place} />)}</div> : <EmptyHome message="Venue details are on the way." href="/discover" label="Explore the directory" />}
          </LandingSection>

          <LandingSection id="weekend" number="05" eyebrow="Make time for you" title="Your weekend, outside." href="/events?date=weekend" linkLabel="This weekend">
            {weekend.length ? <div className="landing-card-rail landing-three-grid mobile-rail">{weekend.map(event => <EventCard key={event.id} event={event} />)}</div> : <EmptyHome message="No weekend sessions listed yet. Explore another day or find a regular group." href="/events" label="Browse events" />}
          </LandingSection>

          <Reveal><section className="landing-organizers" aria-labelledby="organizer-heading"><div data-reveal-item><p className="landing-kicker">For the people who bring people together</p><h2 id="organizer-heading">You bring the group.<br />We’ll help people find it.</h2></div><div data-reveal-item><p>Share your regular run, ride, class or game for a listing review.</p><Link href="/for-organizers" className="landing-text-link">List your group<ArrowUpRight size={18} aria-hidden="true" /></Link></div></section></Reveal>
        </div>
        <Reveal><section className="landing-finale" aria-labelledby="finale-heading"><div className="landing-container landing-finale-inner"><div data-reveal-item><p>Find your people. Show up.</p><h2 id="finale-heading">YOUR NEXT MOVE<br />STARTS OUTSIDE.</h2></div><Link data-reveal-item href="/events" className="landing-finale-link">Find a session<ArrowUpRight size={24} aria-hidden="true" /></Link></div><span className="landing-finale-arrow" aria-hidden="true">↗</span></section></Reveal>
      </LandingMotion>
    </main>
    <Footer />
  </>;
}

interface LandingSectionProps {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
  children: ReactNode;
}
function LandingSection({ id, number, eyebrow, title, href, linkLabel, children }: LandingSectionProps) {
  return <Reveal><section id={id} className="landing-section" aria-labelledby={`${id}-heading`}>
    <header className="landing-section-heading"><div data-reveal-item><p className="landing-kicker"><span aria-hidden="true">{number} /</span>{eyebrow}</p><h2 id={`${id}-heading`}>{title}</h2></div><Link data-reveal-item href={href} className="landing-text-link">{linkLabel}<ArrowUpRight size={16} aria-hidden="true" /></Link></header>
    {children}
  </section></Reveal>;
}
function EmptyHome({ message, href, label }: { message: string; href: string; label: string }) {
  return <div className="landing-empty"><p>{message}</p><Link href={href} className="landing-text-link">{label}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>;
}
