import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Place } from "@/types/place";
import { LandingTrack } from "./LandingGraphics";

export interface LandingPlaygroundProps { places: Place[]; }

/** The city is the final canvas: real places, one expressive closing frame. */
export function LandingPlayground({ places }: LandingPlaygroundProps) {
  return <section id="places" className="landing-playground" aria-labelledby="places-heading" data-parallax-scene>
    <div className="landing-playground-glow landing-parallax-layer" data-parallax="-64" data-parallax-turn="-20" aria-hidden="true"><LandingTrack /></div>
    <div className="landing-container landing-playground-inner">
      <div className="landing-playground-copy">
        <p data-reveal-item className="landing-kicker"><span aria-hidden="true">04 /</span>Closer than you think</p>
        <h2 id="places-heading"><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line">YOUR CITY.</span></span><span className="landing-reveal-line landing-line-accent"><span data-reveal-item data-reveal-style="line" data-reveal-order="1">YOUR <span className="landing-playground-word">PLAYGROUND.</span></span></span></h2>
        <p data-reveal-item className="landing-playground-lead">The track, park or court that gets you out the door is already part of your route.</p>
        <Link data-reveal-item href="/places" className="landing-playground-cta">Explore all places<ArrowUpRight size={18} aria-hidden="true" /></Link>
        <div data-reveal-item className="landing-playground-coordinate"><MapPin size={14} aria-hidden="true" />Noida / Greater Noida <span aria-hidden="true">·</span> 28 sectors in motion</div>
      </div>
      {places.length ? <div className="landing-playground-list">{places.slice(0, 3).map((place, index) => <Link href={`/place/${place.slug}`} key={place.id} className="landing-playground-place" data-reveal-item data-reveal-style={index % 2 ? "right" : "left"} data-reveal-order={index}><span className="landing-playground-place-number" aria-hidden="true">0{index + 1}</span><span className="landing-playground-place-copy"><strong>{place.name}</strong><span>{place.sector} · {place.category}{place.demo && " · Demo listing"}</span></span><ArrowUpRight className="landing-playground-place-arrow" size={22} aria-hidden="true" /></Link>)}</div> : <div data-reveal-item className="landing-empty"><p>Venue details are on the way.</p><Link href="/discover" className="landing-text-link">Explore the directory<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
    </div>
  </section>;
}
