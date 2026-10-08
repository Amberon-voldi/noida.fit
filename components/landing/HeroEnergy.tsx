import { ArrowUpRight, Bike, Dumbbell, Footprints, Zap } from "lucide-react";

/** Original decorative vectors, not a map, live activity feed or participant data. */
export function HeroBackdrop() {
  return <svg className="hero-vector-backdrop" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth="1">
      <path d="M-120 744C192 744 168 240 512 240s256 568 680 568 288-428 444-428" />
      <path d="M-120 768C216 768 192 264 512 264s256 568 680 568 288-428 444-428" />
      <path d="M-120 792C240 792 216 288 512 288s256 568 680 568 288-428 444-428" />
      <path d="M-120 816C264 816 240 312 512 312s256 568 680 568 288-428 444-428" />
      <path d="M888-80v168l-168 168v112m420-416v180l176 176v160" strokeDasharray="5 12" />
      <circle cx="1192" cy="456" r="348" /><circle cx="1192" cy="456" r="324" />
    </g>
    <g fill="currentColor"><circle cx="720" cy="368" r="4" /><circle cx="1316" cy="468" r="5" /><path d="M192 96v24m-12-12h24M1048 760v24m-12-12h24" stroke="currentColor" strokeWidth="2" /></g>
  </svg>;
}

export function HeroEnergy() {
  return <div className="hero-energy" data-hero-energy data-energy="still" role="group" aria-label="Interactive movement artwork">
    <div className="hero-energy-depth" data-depth="-48">
      <div className="hero-energy-plane">
        <svg className="hero-energy-svg" viewBox="0 0 640 640" fill="none" aria-hidden="true" focusable="false">
          <g className="hero-energy-guides" stroke="currentColor">
            <circle cx="320" cy="320" r="272" opacity=".15" />
            <path d="M320 24v44m0 504v44M24 320h44m504 0h44" opacity=".4" />
            <path d="M94 94l32 32m388 388 32 32M94 546l32-32m388-388 32-32" opacity=".25" />
          </g>
          <g className="hero-energy-orbit" stroke="currentColor">
            <circle cx="320" cy="320" r="248" strokeDasharray="2 14" strokeWidth="3" opacity=".55" />
            <path d="M320 72a248 248 0 0 1 248 248" strokeWidth="3" />
            <circle cx="568" cy="320" r="7" fill="currentColor" stroke="none" />
          </g>
          <g className="hero-energy-track" transform="rotate(-32 320 320)">
            <rect x="72" y="164" width="496" height="312" rx="156" className="hero-track-wide" strokeWidth="22" />
            <rect x="96" y="188" width="448" height="264" rx="132" stroke="currentColor" strokeWidth="2" />
            <rect x="112" y="204" width="416" height="232" rx="116" stroke="currentColor" strokeWidth="2" opacity=".45" />
            <path d="M294 164v62m14-62v62m14-62v62" stroke="var(--background)" strokeWidth="3" />
            <path d="M488 385a132 132 0 0 1-120 67" stroke="var(--foreground)" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g stroke="currentColor" strokeWidth="1.5" opacity=".35">
            <path d="M126 248C206 248 248 278 320 320s138 64 198 106M320 320c0-94 40-156 114-188M320 320c-82 0-108 96-138 170" strokeDasharray="4 9" />
          </g>
          <circle className="hero-energy-breath" cx="320" cy="320" r="106" stroke="currentColor" strokeWidth="2" opacity=".25" />
          <circle className="hero-energy-burst" cx="320" cy="320" r="102" stroke="currentColor" strokeWidth="3" opacity="0" />
          <circle className="hero-energy-burst" cx="320" cy="320" r="120" stroke="currentColor" strokeWidth="1.5" opacity="0" />
          <circle cx="320" cy="320" r="92" fill="var(--background)" stroke="currentColor" strokeWidth="1" />
          <circle cx="320" cy="320" r="80" fill="currentColor" />
          <text x="320" y="325" textAnchor="middle" className="hero-energy-word">GO.</text>
          <g className="hero-energy-node hero-energy-node-lift" transform="translate(122 246)">
            <circle r="36" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
            <Dumbbell x="-17" y="-17" width="34" height="34" strokeWidth="1.8" />
            <text x="0" y="58" textAnchor="middle" className="hero-energy-label">LIFT</text>
          </g>
          <g className="hero-energy-node hero-energy-node-run" transform="translate(434 132)">
            <circle r="40" fill="var(--foreground)" /><Footprints x="-19" y="-19" width="38" height="38" stroke="var(--background)" strokeWidth="1.8" />
            <text x="0" y="-58" textAnchor="middle" className="hero-energy-label">RUN</text>
          </g>
          <g className="hero-energy-node hero-energy-node-ride" transform="translate(518 426)">
            <circle r="42" fill="var(--accent-energy)" /><Bike x="-21" y="-21" width="42" height="42" stroke="var(--background)" strokeWidth="1.8" />
            <text x="0" y="66" textAnchor="middle" className="hero-energy-label">RIDE</text>
          </g>
          <g className="hero-energy-node hero-energy-node-play" transform="translate(182 490)">
            <circle r="38" fill="var(--surface)" stroke="currentColor" strokeWidth="2" /><Zap x="-18" y="-18" width="36" height="36" fill="currentColor" strokeWidth="1.5" />
            <text x="0" y="62" textAnchor="middle" className="hero-energy-label">PLAY</text>
          </g>
          <g className="hero-energy-spark" transform="translate(520 116)" stroke="var(--accent-energy)" strokeWidth="3"><path d="M-16 0h32M0-16v32M-11-11l22 22M-11 11l22-22" /></g>
          <g fill="currentColor"><circle cx="72" cy="414" r="5" /><circle cx="354" cy="566" r="4" /><circle cx="242" cy="92" r="4" /></g>
        </svg>
        <button type="button" className="hero-energy-control" data-hero-pulse disabled aria-label="Send a pulse"><ArrowUpRight size={24} aria-hidden="true" /></button>
      </div>
    </div>
  </div>;
}
