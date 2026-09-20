import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EventCard } from "@/components/cards/EventCard";
import { CommunityCard } from "@/components/cards/CommunityCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { FitnessCard } from "@/components/cards/FitnessCard";
import {
  getFeaturedEvents,
  getFeaturedCommunities,
  getPlaces,
  getUserBySlug,
} from "@/lib/data";

export const metadata: Metadata = {
  title: {
    absolute: "NOIDA.FIT — Discover Fitness Communities, Events & Fitness ID in Noida",
  },
  description:
    "Find running clubs, cycling rides, group workouts, and claim your verified Noida Fitness ID. 100% free community platform for Noida & Greater Noida.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const featuredEvents = getFeaturedEvents();
  const featuredCommunities = getFeaturedCommunities();
  const places = getPlaces().slice(0, 4);
  const sampleMember = getUserBySlug("kabir-singh") || getUserBySlug("demo-user");

  return (
    <>
      <Navbar />

      <main id="main-content" tabIndex={-1} className="overflow-x-hidden">

        {/* ── HERO SECTION ─────────────────────────────────── */}
        <section
          className="relative isolate pt-16 pb-24 sm:pt-24 sm:pb-32 lg:pt-32 lg:pb-36 px-4 sm:px-6 lg:px-8 border-b border-border-subtle"
          aria-labelledby="hero-heading"
        >
          {/* Ambient Lighting Orbs */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[600px] sm:w-[900px] h-[400px] bg-gradient-to-tr from-[#9ddc2e]/10 via-[#06b6d4]/5 to-transparent blur-[140px] pointer-events-none rounded-full"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-5xl text-center">
            {/* Live Ticker Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-white/[0.04] border border-white/10 text-white/90 mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#9ddc2e] animate-pulse" />
              <span>28+ Group Sessions This Week</span>
              <span className="text-white/20">·</span>
              <span className="text-[#9ddc2e]">1,400+ Active Members</span>
              <span className="text-white/20 hidden sm:inline">·</span>
              <span className="text-[#94a3b8] hidden sm:inline">100% Free</span>
            </div>

            {/* Main Headline */}
            <h1
              id="hero-heading"
              className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.04] mb-6"
              style={{ letterSpacing: "-0.04em" }}
            >
              FIND YOUR PEOPLE.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#9ddc2e]">
                MOVE TOGETHER.
              </span>
              <br />
              OWN NOIDA.
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-xl text-text-secondary leading-relaxed mb-10 max-w-2xl mx-auto">
              From 5 AM stadium intervals in Sector 21A to 100km Sunday centuries down the Expressway.
              Discover authentic fitness tribes meeting across Noida every week.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <Link
                href="/events"
                id="hero-cta-events"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#9ddc2e] px-7 py-3.5 text-sm font-bold text-black hover:bg-[#b5f043] transition-all shadow-[0_0_20px_rgba(157,220,46,0.3)] active:scale-95"
              >
                <span>Find a Workout</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/signup"
                id="hero-cta-fitness-id"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-elevated/80 px-7 py-3.5 text-sm font-semibold text-white hover:bg-surface-hover hover:border-white/30 transition-all active:scale-95"
              >
                <span>Claim Fitness ID</span>
              </Link>
            </div>

            {/* Quick Turf Badges */}
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#94a3b8]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ddc2e]" />
                Sector 21A Noida Stadium
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ddc2e]" />
                Expressway Cycling Corridor
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ddc2e]" />
                Biodiversity Park Trails
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ddc2e]" />
                All Paces Welcome
              </span>
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE FITNESS ID FEATURE SHOWCASE ──────── */}
        {sampleMember && (
          <section
            className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-border-subtle bg-gradient-to-b from-[#090a0f] via-[#0d101a] to-[#090a0f]"
            aria-labelledby="fitness-id-feature-heading"
          >
            <div className="mx-auto max-w-7xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                
                {/* Left Pitch */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#9ddc2e]/10 text-[#9ddc2e] border border-[#9ddc2e]/20">
                    <span className="w-2 h-2 rounded-full bg-[#9ddc2e] animate-pulse" />
                    <span>YOUR OFFICIAL DIGITAL PASSPORT</span>
                  </div>

                  <h2
                    id="fitness-id-feature-heading"
                    className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1]"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    One Fitness Card.
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9ddc2e] to-emerald-400">
                      Every Noida Tribe.
                    </span>
                  </h2>

                  <p className="text-base text-text-secondary leading-relaxed">
                    Stop tracking workouts in 5 different WhatsApp groups. Your NOIDA.FIT ID gives you a single verified identity across all running clubs, cycling crews, and turf groups in the city.
                  </p>

                  {/* Feature Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="rounded-xl p-4 bg-surface/60 border border-border-subtle">
                      <div className="text-xl mb-1">💳</div>
                      <h3 className="text-sm font-bold text-white">Interactive Card</h3>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        Physical card aesthetic with dynamic 3D flip, QR verification & NFC chip design.
                      </p>
                    </div>

                    <div className="rounded-xl p-4 bg-surface/60 border border-border-subtle">
                      <div className="text-xl mb-1">🔗</div>
                      <h3 className="text-sm font-bold text-white">noida.fit/@handle</h3>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        Claim your unique @handle URL to showcase badges, streak, and community milestones.
                      </p>
                    </div>

                    <div className="rounded-xl p-4 bg-surface/60 border border-border-subtle">
                      <div className="text-xl mb-1">🏅</div>
                      <h3 className="text-sm font-bold text-white">Verified Badges</h3>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        Earn &ldquo;Stadium Dawn Regular&rdquo; and &ldquo;Expressway Century&rdquo; at morning meetups.
                      </p>
                    </div>

                    <div className="rounded-xl p-4 bg-surface/60 border border-border-subtle">
                      <div className="text-xl mb-1">⚡</div>
                      <h3 className="text-sm font-bold text-white">100% Free Forever</h3>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        Built for the community. Zero subscription fees, zero lock-in.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#9ddc2e] px-6 py-3 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors"
                    >
                      <span>Get Your Free Fitness ID</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      href={`/@${sampleMember.slug}`}
                      className="text-xs font-mono text-[#94a3b8] hover:text-white transition-colors"
                    >
                      Preview @{sampleMember.slug}&apos;s profile ↗
                    </Link>
                  </div>
                </div>

                {/* Right Interactive Card Preview */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center">
                  <div className="relative p-6 sm:p-8 rounded-3xl bg-surface/40 border border-white/10 backdrop-blur-md w-full max-w-[560px]">
                    <div className="text-center mb-4">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
                        ⚡ LIVE INTERACTIVE DEMO · CLICK OR SWIPE TO FLIP
                      </span>
                    </div>

                    {/* 3D Flipping Card */}
                    <FitnessCard user={sampleMember} showControls={true} />

                    <div className="mt-4 pt-3 border-t border-white/10 text-center">
                      <p className="text-xs text-[#64748b]">
                        Tap or click card to flip between front identity and verified stats on back.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* ── PLATFORM STATS ───────────────────────────────── */}
        <section className="border-b border-border-subtle bg-surface/30" aria-label="Platform statistics">
          <div className="mx-auto max-w-7xl">
            <dl className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border-subtle">
              {[
                { value: "12+", label: "Active Clubs", sub: "Running, cycling & HIIT" },
                { value: "28+", label: "Weekly Sessions", sub: "Mornings & weekends" },
                { value: "1,400+", label: "Active Members", sub: "Noida & Greater Noida" },
                { value: "8+", label: "Training Venues", sub: "Tracks, corridors & parks" },
              ].map((stat) => (
                <div key={stat.label} className="py-8 px-6 text-center">
                  <dt className="text-2xl sm:text-3xl font-black text-white font-mono">{stat.value}</dt>
                  <dd className="mt-1 text-xs font-bold text-white">{stat.label}</dd>
                  <dd className="text-[11px] text-[#64748b] mt-0.5">{stat.sub}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── UPCOMING EVENTS ──────────────────────────────── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-border-subtle" aria-labelledby="events-heading">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
                  COMMUNITY CALENDAR
                </span>
                <h2
                  id="events-heading"
                  className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Happening This Week
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Open community sessions. Free to join — simply show up in gear.
                </p>
              </div>
              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-[#9ddc2e] transition-colors"
              >
                <span>View all 28 events</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredEvents.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>

        {/* ── ACTIVE COMMUNITIES ───────────────────────────── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-border-subtle" aria-labelledby="communities-heading">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
                  NOIDA TRIBES
                </span>
                <h2
                  id="communities-heading"
                  className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Featured Squads & Clubs
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Find a group that matches your pace, schedule, and neighborhood.
                </p>
              </div>
              <Link
                href="/communities"
                className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-[#9ddc2e] transition-colors"
              >
                <span>Browse all clubs</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredCommunities.slice(0, 3).map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          </div>
        </section>

        {/* ── VENUES / PLACES ──────────────────────────────── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-border-subtle" aria-labelledby="places-heading">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
                  TRAINING GROUNDS
                </span>
                <h2
                  id="places-heading"
                  className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Where Noida Trains
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Top tracks, synthetic turf, and asphalt corridors vetted by the community.
                </p>
              </div>
              <Link
                href="/places"
                className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-[#9ddc2e] transition-colors"
              >
                <span>Explore all 8 venues</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {places.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </div>
        </section>

        {/* ── ORGANIZER CALLOUT ────────────────────────────── */}
        <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8" aria-labelledby="organizers-heading">
          <div className="mx-auto max-w-7xl">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-surface-elevated via-surface to-surface-elevated p-8 sm:p-14">
              <div
                className="absolute top-0 right-0 -z-10 w-[350px] h-[350px] bg-[#9ddc2e]/10 blur-[100px] pointer-events-none rounded-full"
                aria-hidden="true"
              />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="max-w-xl">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#9ddc2e] font-semibold">
                    FOR COMMUNITY LEADERS
                  </span>
                  <h2
                    id="organizers-heading"
                    className="mt-1 text-2xl sm:text-3xl font-black text-white"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    You organize. We amplify.
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
                    Lead a running club, cycling peloton, or weekend fitness meetup in Noida? List your squad on NOIDA.FIT for free and connect with hundreds of active local fitness enthusiasts every week.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 flex-shrink-0">
                  <Link
                    href="/for-organizers"
                    id="organizers-cta"
                    className="inline-flex items-center justify-center rounded-xl bg-[#9ddc2e] px-7 py-3.5 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors"
                  >
                    List Your Community
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                  >
                    Read Our Manifesto
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
