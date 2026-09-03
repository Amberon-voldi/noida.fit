import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import {
  getFeaturedEvents,
  getFeaturedCommunities,
  getPlaces,
} from "@/lib/data";

export const metadata: Metadata = {
  title: {
    absolute: "NOIDA.FIT — Discover Fitness Communities & Events in Noida",
  },
  description:
    "Find running clubs, cycling rides, group workouts, and fitness events happening this week in Noida & Greater Noida.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const featuredEvents = getFeaturedEvents();
  const featuredCommunities = getFeaturedCommunities();
  const places = getPlaces().slice(0, 4);

  return (
    <>
      <Navbar />

      <main id="main-content" tabIndex={-1}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-8" aria-labelledby="hero-heading">
          <div className="mx-auto max-w-3xl text-center">
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05] mb-5"
              style={{ letterSpacing: "-0.035em" }}
            >
              Find your people.
              <br />
              Show up. Move together.
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed mb-10 max-w-xl mx-auto">
              Running clubs, cycling crews, and sports groups meeting across Noida every week.
              All free to join.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/discover"
                id="hero-cta-explore"
                className="inline-flex items-center gap-2 rounded-lg bg-[#9ddc2e] px-7 py-3 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors"
              >
                Explore Noida Fitness
              </Link>
              <Link
                href="/events"
                id="hero-cta-events"
                className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-7 py-3 text-sm font-medium text-white hover:bg-surface transition-colors"
              >
                This Week&apos;s Events
              </Link>
            </div>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────── */}
        <section className="border-y border-border-subtle" aria-label="Platform statistics">
          <div className="mx-auto max-w-7xl">
            <dl className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border-subtle">
              {[
                { value: "12", label: "Communities" },
                { value: "28+", label: "Weekly events" },
                { value: "1,400+", label: "Active members" },
                { value: "8", label: "Venues" },
              ].map((stat) => (
                <div key={stat.label} className="py-8 px-6 text-center">
                  <dt className="text-2xl font-bold text-white">{stat.value}</dt>
                  <dd className="mt-1 text-xs text-text-muted">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── EVENTS ───────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="events-heading">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-baseline justify-between mb-8">
              <h2
                id="events-heading"
                className="text-xl font-bold text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                Happening this week
              </h2>
              <Link href="/events" className="text-sm text-text-muted hover:text-white transition-colors">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredEvents.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>

        {/* ── COMMUNITIES ──────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border-subtle" aria-labelledby="communities-heading">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-baseline justify-between mb-8">
              <h2
                id="communities-heading"
                className="text-xl font-bold text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                Active communities
              </h2>
              <Link href="/communities" className="text-sm text-text-muted hover:text-white transition-colors">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredCommunities.slice(0, 3).map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          </div>
        </section>

        {/* ── PLACES ───────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border-subtle" aria-labelledby="places-heading">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-baseline justify-between mb-8">
              <h2
                id="places-heading"
                className="text-xl font-bold text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                Where Noida trains
              </h2>
              <Link href="/places" className="text-sm text-text-muted hover:text-white transition-colors">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {places.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </div>
        </section>

        {/* ── ORGANISER CTA ────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border-subtle" aria-labelledby="organizers-heading">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-xl border border-border-strong p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
              <div>
                <h2
                  id="organizers-heading"
                  className="text-xl font-bold text-white mb-2"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  You organise, we amplify.
                </h2>
                <p className="text-sm text-text-secondary max-w-md leading-relaxed">
                  List your club or event on NOIDA.FIT for free and reach hundreds of active fitness seekers across the city.
                </p>
              </div>
              <Link
                href="/for-organizers"
                id="organizers-cta"
                className="inline-flex items-center rounded-lg bg-[#9ddc2e] px-6 py-3 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors flex-shrink-0"
              >
                List Your Community
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
