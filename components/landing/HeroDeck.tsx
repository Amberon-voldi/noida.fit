import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bike, Dumbbell, Footprints, PersonStanding, Trophy, type LucideIcon } from "lucide-react";

type Tone = "lime" | "energy" | "paper" | "ink" | "olive";
const CARDS: { slug: string; word: string; label: string; line: string; icon: LucideIcon; tone: Tone }[] = [
  { slug: "running", word: "RUN.", label: "running", line: "Early miles with people who wait at the finish.", icon: Footprints, tone: "lime" },
  { slug: "cycling", word: "RIDE.", label: "cycling", line: "Dawn loops and weekend cruises, rolling together.", icon: Bike, tone: "energy" },
  { slug: "strength", word: "LIFT.", label: "strength", line: "Park bars, circuits and someone to spot you.", icon: Dumbbell, tone: "paper" },
  { slug: "yoga", word: "FLOW.", label: "yoga", line: "Slow mornings, open lawns, deep breaths.", icon: PersonStanding, tone: "ink" },
  { slug: "sports", word: "PLAY.", label: "sports", line: "Courts, pitches and a spot on the team.", icon: Trophy, tone: "olive" },
];

// Lane arcs of an athletics-track bend, painted flat. Decorative; not a map.
const CX = 1240, CY = 1180;
const RADII = [460, 540, 620, 700, 780, 860, 940];
const point = (r: number, deg: number) => [CX + r * Math.cos(deg * Math.PI / 180), CY + r * Math.sin(deg * Math.PI / 180)].map(value => Math.round(value * 10) / 10);
const START = 205;

export function HeroBackdrop() {
  return <svg className="hero-vector-backdrop" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">
    <g className="hero-track-lanes" stroke="currentColor" strokeWidth="3">
      {RADII.map(r => { const [x1, y1] = point(r, 180); const [x2, y2] = point(r, 300); return <path key={r} d={`M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}`} />; })}
    </g>
    <g className="hero-track-marks" stroke="currentColor">
      {(() => { const [x1, y1] = point(RADII[0], START); const [x2, y2] = point(RADII[RADII.length - 1], START); return <path d={`M${x1} ${y1}L${x2} ${y2}`} strokeWidth="6" />; })()}
      {RADII.slice(0, -1).map((r, index) => { const [x1, y1] = point(r, START + 9 + index * 2.4); const [x2, y2] = point(r + 80, START + 9 + index * 2.4); return <path key={r} d={`M${x1} ${y1}L${x2} ${y2}`} strokeWidth="3" />; })}
    </g>
    <g className="hero-track-numbers" fill="currentColor">
      {RADII.slice(0, -1).map((r, index) => { const [x, y] = point(r + 40, START - 5); return <text key={r} x={x} y={y} textAnchor="middle" dominantBaseline="central" transform={`rotate(${START - 5 + 90} ${x} ${y})`}>{index + 1}</text>; })}
    </g>
  </svg>;
}

/** A shuffleable deck of activity posters. Content control first; the pointer tilt is decorative and bounded. */
export function HeroDeck() {
  return <div className="hero-deck" data-hero-deck data-tilt="still" role="group" aria-label="Ways to move" aria-roledescription="card deck">
    <div className="hero-deck-depth" data-depth="-48">
      <div className="hero-deck-plane">
        {CARDS.map(({ slug, word, label, line, icon: Icon, tone }, index) => <div key={slug} className="hero-card" data-deck-card data-deck-label={word.replace(".", "")} data-tone={tone} data-pos={index} inert={index > 0 || undefined} aria-hidden={index > 0 || undefined}>
          <span className="hero-card-stripes" aria-hidden="true" />
          <Icon className="hero-card-watermark" aria-hidden="true" strokeWidth={1.25} />
          <div className="hero-card-top"><span>{String(index + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}</span><span className="hero-card-icon"><Icon size={20} aria-hidden="true" /></span></div>
          <div className="hero-card-body">
            <p className="hero-card-word">{word}</p>
            <p className="hero-card-line">{line}</p>
            <Link href={`/activities/${slug}`} className="hero-card-link">Explore {label}<ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>)}
      </div>
    </div>
    <button type="button" className="hero-deck-next" data-hero-next aria-label="Next move"><span aria-hidden="true">Next move</span><ArrowRight size={18} aria-hidden="true" /></button>
    <span className="sr-only" role="status" data-deck-status />
  </div>;
}
