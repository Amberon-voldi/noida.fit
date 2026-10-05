import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Activity } from "@/types/activity";
import { LandingTrack } from "./LandingGraphics";

export interface LandingActivitiesProps { activities: Activity[]; }

/** A typographic explorer, not another row of six photo cards. */
export function LandingActivities({ activities }: LandingActivitiesProps) {
  return <section id="activities" className="landing-activities-scene" aria-labelledby="activities-heading" data-parallax-scene>
    <header className="landing-section-heading"><div><p data-reveal-item className="landing-kicker"><span aria-hidden="true">02 /</span>Find your thing</p><h2 id="activities-heading"><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line">More than one</span></span><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line" data-reveal-order="1">way to move.</span></span></h2></div><Link data-reveal-item href="/activities" className="landing-text-link">All activities<ArrowUpRight size={16} aria-hidden="true" /></Link></header>
    <div className="landing-activities-layout">
      <figure className="landing-activity-editorial" data-reveal-item data-reveal-style="image">
        <div className="landing-activity-editorial-photo landing-parallax-layer" data-parallax="96" data-parallax-zoom=".08"><Image src="/images/landing/running.webp" fill sizes="(max-width: 767px) 100vw, 50vw" alt="" className="landing-photo" /></div>
        <div className="landing-activity-editorial-art landing-parallax-layer" data-parallax="-70" data-parallax-turn="28" aria-hidden="true"><LandingTrack /></div>
        <span className="landing-activity-editorial-word" aria-hidden="true">MOVE.</span>
        <figcaption className="landing-photo-credit">Illustrative photo · Pexels</figcaption>
      </figure>
      <nav className="landing-activity-menu" aria-label="Explore activities">
        {activities.slice(0, 6).map((activity, index) => <Link key={activity.id} href={`/activities/${activity.slug}`} data-reveal-item data-reveal-style="right" data-reveal-order={index % 3}><span className="landing-activity-number" aria-hidden="true">0{index + 1}</span><span>{activity.name}</span><ArrowUpRight size={22} aria-hidden="true" /></Link>)}
        {!activities.length && <p className="landing-empty">Activity guides are being added. <Link href="/discover" className="landing-text-link">Explore the directory<ArrowUpRight size={16} aria-hidden="true" /></Link></p>}
      </nav>
    </div>
  </section>;
}
