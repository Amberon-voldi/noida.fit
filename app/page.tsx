import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EventCard } from "@/components/cards/EventCard";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LandingMotion } from "@/components/home/LandingMotion";
import { LandingHero } from "@/components/home/LandingHero";
import { LandingActivities } from "@/components/home/LandingActivities";
import { LandingStory } from "@/components/home/LandingStory";
import { LandingPlaces } from "@/components/home/LandingCollection";
import { LandingDeparture } from "@/components/home/LandingDeparture";
import { LandingTrack } from "@/components/home/LandingGraphics";
import { getDirectory } from "@/lib/data";
import { filterDirectory, readFilters } from "@/components/discovery/filter";
import "@/components/home/landing.css";
import "@/components/home/landing-refinement.css";

export const metadata: Metadata = {
  title: { absolute: "NOIDA.FIT — Discover Fitness Communities & Events in Noida" },
  description: "Find your people. Discover running clubs, group rides, track sessions and open workouts across Noida and Greater Noida. Show up and move together.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const directory = await getDirectory();
  const events = filterDirectory(directory, readFilters({ date: "week", type: "events" })).events.slice(0, 2);
  const communities = directory.communities.filter(item => item.featured).slice(0, 2);
  const places = directory.places.slice(0, 3);
  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://noida.fit").origin;
  const website = { "@context": "https://schema.org", "@type": "WebSite", name: "NOIDA.FIT", url: siteUrl, description: metadata.description, potentialAction: { "@type": "SearchAction", target: `${siteUrl}/discover?q={search_term_string}`, "query-input": "required name=search_term_string" } };

  return <>
    <Navbar />
    <main id="main-content" tabIndex={-1} className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
      <LandingMotion>
        <LandingHero />
        <div className="landing-container landing-content">
          <section id="week" className="landing-section landing-week-scene" aria-labelledby="week-heading" data-parallax-scene>
            <div className="landing-week-intro"><p data-reveal-item className="landing-kicker"><span aria-hidden="true">01 /</span>Make a plan</p><h2 id="week-heading"><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line">Your next</span></span><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line" data-reveal-order="1">seven days.</span></span></h2><p data-reveal-item className="landing-section-intro">A couple of starting points.<br />The rest of the city is one tap away.</p><Link data-reveal-item href="/events" className="landing-text-link">All events<ArrowUpRight size={16} aria-hidden="true" /></Link><span className="landing-week-graphic landing-parallax-layer" data-parallax="-48" data-parallax-turn="16" aria-hidden="true">↗</span></div>
            {events.length ? <div className="landing-event-pair">{events.map((event, index) => <div key={event.id} className={`landing-event-position landing-event-position-${index + 1}`}><div data-reveal-item data-reveal-style={index === 0 ? "left" : "right"} data-reveal-order={index}><EventCard event={event} /></div></div>)}</div> : <div data-reveal-item className="landing-empty"><p>No sessions listed for the next seven days yet. Find a community with a regular rhythm.</p><Link href="/communities" className="landing-text-link">Find a community<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
          </section>

          <LandingActivities activities={directory.activities} />
          <LandingStory communities={communities} />

          <section id="places" className="landing-places-scene" aria-labelledby="places-heading" data-parallax-scene>
            <div className="landing-places-intro"><p data-reveal-item className="landing-kicker"><span aria-hidden="true">04 /</span>Closer than you think</p><h2 id="places-heading"><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line">Your city.</span></span><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line" data-reveal-order="1">Your playground.</span></span></h2><p data-reveal-item className="landing-section-intro">Find the track, park or court<br />that gets you out the door.</p><Link data-reveal-item href="/places" className="landing-text-link">All places<ArrowUpRight size={16} aria-hidden="true" /></Link><div className="landing-local-art landing-parallax-layer" data-parallax="-72" data-parallax-turn="-28" aria-hidden="true"><LandingTrack /></div></div>
            {places.length ? <LandingPlaces places={places} /> : <div data-reveal-item className="landing-empty"><p>Venue details are on the way.</p><Link href="/discover" className="landing-text-link">Explore the directory<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
          </section>

          <LandingDeparture />
        </div>
      </LandingMotion>
    </main>
    <Footer />
  </>;
}
