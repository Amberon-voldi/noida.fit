export interface LandingTrackProps { className?: string; }

/** Original track artwork; decorative, never a map or live activity indicator. */
export function LandingTrack({ className = "" }: LandingTrackProps) {
  return <svg viewBox="0 0 600 680" fill="none" className={className} aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth="1.5">
      <rect x="24" y="24" width="552" height="632" rx="276" />
      <rect x="48" y="48" width="504" height="584" rx="252" />
      <rect x="72" y="72" width="456" height="536" rx="228" />
      <rect x="96" y="96" width="408" height="488" rx="204" />
      <rect x="120" y="120" width="360" height="440" rx="180" />
      <path d="M24 340h96m360 0h96M300 24v96m0 440v96" strokeDasharray="3 6" />
    </g>
    <circle cx="517" cy="143" r="7" fill="currentColor" />
    <circle cx="96" cy="460" r="5" fill="currentColor" />
  </svg>;
}
