import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { SearchForm } from "@/components/discovery/SearchForm";
import { Reveal } from "@/components/ui/Reveal";
import { LandingTrack } from "./LandingGraphics";

export function LandingHero() {
  return <>
    <section className="landing-hero" aria-labelledby="hero-heading" data-parallax-scene>
      <div className="landing-hero-art" aria-hidden="true">
        <div className="landing-hero-photo landing-parallax-layer" data-parallax="84"><Image src="/images/landing/running.webp" alt="" fill sizes="(max-width: 767px) 100vw, 65vw" preload className="landing-photo" /></div>
        <div className="landing-hero-photo-shade" />
        <div className="landing-hero-track landing-parallax-layer" data-parallax="-64" data-parallax-turn="20"><LandingTrack /></div>
        <span className="landing-hero-stamp landing-parallax-layer" data-parallax="48">MOVE<br />TOGETHER.</span>
      </div>
      <div className="landing-container landing-hero-inner">
        <Reveal className="landing-hero-copy">
          <p data-reveal-item className="landing-kicker"><MapPin size={14} aria-hidden="true" />Noida &amp; Greater Noida</p>
          <h1 data-reveal-item id="hero-heading">FIND YOUR<br /><span>PEOPLE.</span></h1>
          <p data-reveal-item className="landing-hero-intro">A morning run. A game after work.<br />Good company, just around the corner.</p>
          <div data-reveal-item className="landing-hero-actions"><Link href="/discover" className="button-primary">Explore Noida fitness<ArrowUpRight size={18} aria-hidden="true" /></Link><Link href="/communities" className="landing-text-link">Find a community<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        </Reveal>
        <div className="landing-hero-bottom"><a href="#week" className="landing-scroll-link"><ArrowDown size={16} aria-hidden="true" />Find your next move</a><span className="landing-photo-credit">Illustrative photo · Pexels</span></div>
      </div>
    </section>
    <div className="landing-container landing-search-dock">
      <SearchForm id="home-search" action="/discover" placeholder="Running, yoga, Sector 50…" />
      <nav className="landing-quick-plans" aria-label="Quick plans"><Link href="/events?date=today"><CalendarDays size={14} aria-hidden="true" />Today</Link><Link href="/events?date=weekend">This weekend<ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/events?price=free">Free sessions<ArrowUpRight size={14} aria-hidden="true" /></Link></nav>
    </div>
    <div className="landing-kinetic-band" aria-hidden="true" data-parallax-scene><div className="landing-kinetic-track" data-parallax="-220">RUN <span>↗</span> RIDE <span>↗</span> PLAY <span>↗</span> REPEAT <span>↗</span> RUN <span>↗</span> RIDE <span>↗</span> PLAY</div></div>
  </>;
}
