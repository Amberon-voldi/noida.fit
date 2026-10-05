import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Community } from "@/types/community";
import { LandingTrack } from "./LandingGraphics";
import { LandingCommunities } from "./LandingCollection";

export interface LandingStoryProps { communities: Community[]; }

export function LandingStory({ communities }: LandingStoryProps) {
  return <section id="community" className="landing-story" aria-labelledby="together-heading" data-parallax-scene>
    <div className="landing-story-grid">
      <figure data-reveal-item data-reveal-style="image" className="landing-story-photo">
        <div className="landing-story-image landing-parallax-layer" data-parallax="96" data-parallax-zoom=".08"><Image src="/images/landing/community.webp" alt="Five adults stretching together outdoors on a sunny lawn" fill sizes="(max-width: 767px) 100vw, 50vw" className="landing-photo" /></div>
        <div className="landing-story-track landing-parallax-layer" data-parallax="-64" data-parallax-turn="-24"><LandingTrack /></div>
        <figcaption className="landing-photo-credit">Illustrative photo · Pexels</figcaption>
      </figure>
      <div className="landing-story-copy">
        <p data-reveal-item className="landing-kicker"><span aria-hidden="true">03 /</span>A little movement. A good crowd.</p>
        <h2 id="together-heading"><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line">THE PLAN</span></span><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line" data-reveal-order="1">IS BETTER</span></span><span className="landing-reveal-line landing-line-accent"><span data-reveal-item data-reveal-style="line" data-reveal-order="2">TOGETHER.</span></span></h2>
        <p data-reveal-item>From the first hello to the post-run chai. Find a group that makes showing up feel easy.</p>
        <LandingCommunities communities={communities} />
        {!communities.length && <p data-reveal-item>No featured groups listed yet. Explore the community directory.</p>}
        <Link data-reveal-item href="/communities" className="landing-text-link">Meet your people<ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
    </div>
  </section>;
}
