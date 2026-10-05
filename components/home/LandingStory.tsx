import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { LandingTrack } from "./LandingGraphics";

export function LandingStory() {
  return <section className="landing-story" aria-labelledby="together-heading" data-parallax-scene>
    <Reveal className="landing-story-grid">
      <figure data-reveal-item className="landing-story-photo">
        <div className="landing-story-image landing-parallax-layer" data-parallax="72"><Image src="/images/landing/community.webp" alt="Five adults stretching together outdoors on a sunny lawn" fill sizes="(max-width: 767px) 100vw, 50vw" className="landing-photo" /></div>
        <div className="landing-story-track landing-parallax-layer" data-parallax="-40" data-parallax-turn="-18"><LandingTrack /></div>
        <figcaption className="landing-photo-credit">Illustrative photo · Pexels</figcaption>
      </figure>
      <div className="landing-story-copy">
        <p data-reveal-item className="landing-kicker">A little movement. A good crowd.</p>
        <h2 data-reveal-item id="together-heading">THE PLAN<br />IS BETTER<br /><span>TOGETHER.</span></h2>
        <p data-reveal-item>Find a group. Pick a session. Make showing up part of your week. From the first hello to the post-run chai, it starts with your people.</p>
        <Link data-reveal-item href="/communities" className="landing-text-link">Meet your people<ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
    </Reveal>
  </section>;
}
