import Link from "next/link";
import { ArrowUpRight, CalendarDays, Flag, UsersRound } from "lucide-react";
import { LandingTrack } from "./LandingGraphics";

/** A single, practical closing moment instead of two stacked promotional panels. */
export function LandingDeparture() {
  return <section id="departure" className="landing-departure" aria-labelledby="departure-heading" data-parallax-scene>
    <div className="landing-departure-art landing-parallax-layer" data-parallax="-80" data-parallax-turn="12" aria-hidden="true"><LandingTrack /></div>
    <div className="landing-container landing-departure-inner">
      <div className="landing-departure-copy">
        <p data-reveal-item className="landing-kicker"><span aria-hidden="true">05 /</span>Make it real</p>
        <h2 id="departure-heading"><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line">THE CITY</span></span><span className="landing-reveal-line"><span data-reveal-item data-reveal-style="line" data-reveal-order="1">IS WAITING.</span></span></h2>
        <p data-reveal-item className="landing-departure-lead">Choose a starting point. Leave the screen with a plan.</p>
        <p data-reveal-item className="landing-departure-note">No feed to keep up with. Just people, places and a time to show up.</p>
      </div>
      <nav className="landing-departure-actions" aria-label="Start moving">
        <Link data-reveal-item data-reveal-style="right" href="/events" className="landing-departure-action landing-departure-action-primary"><span className="landing-departure-action-icon"><CalendarDays size={20} aria-hidden="true" /></span><span><small>Next on the calendar</small><strong>Find a session</strong></span><ArrowUpRight size={20} aria-hidden="true" /></Link>
        <Link data-reveal-item data-reveal-style="right" data-reveal-order="1" href="/communities" className="landing-departure-action"><span className="landing-departure-action-icon"><UsersRound size={20} aria-hidden="true" /></span><span><small>Better together</small><strong>Meet a community</strong></span><ArrowUpRight size={20} aria-hidden="true" /></Link>
        <Link data-reveal-item data-reveal-style="right" data-reveal-order="2" href="/for-organizers" className="landing-departure-action"><span className="landing-departure-action-icon"><Flag size={20} aria-hidden="true" /></span><span><small>Bring your people</small><strong>List your group</strong></span><ArrowUpRight size={20} aria-hidden="true" /></Link>
      </nav>
    </div>
    <div className="landing-departure-footer"><span>NOIDA / GREATER NOIDA</span><span>FIND YOUR PEOPLE. SHOW UP.</span></div>
  </section>;
}
