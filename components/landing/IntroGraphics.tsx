export function IntroTrack() {
  return (
    <svg className="intro-track-svg" viewBox="0 0 240 240" fill="none" aria-hidden="true" focusable="false">
      <g transform="rotate(-28 120 120)" stroke="currentColor" strokeWidth="2">
        <rect x="31" y="57" width="178" height="126" rx="63" />
        <rect x="41" y="67" width="158" height="106" rx="53" />
        <rect x="51" y="77" width="138" height="86" rx="43" />
        <rect x="61" y="87" width="118" height="66" rx="33" />
        <path d="M113 57v30m10-30v30m10-30v30" />
      </g>
      <circle cx="51" cy="157" r="7" fill="currentColor" />
      <path d="m157 167 20-7-7 20m7-20-27 27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IntroNetwork() {
  return (
    <svg className="intro-network-svg" viewBox="0 0 640 240" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="1.5">
        <path d="M52 173C146 173 112 51 216 51s81 138 190 138 94-110 181-110" />
        <path d="M52 173c131 0 191-80 284-80s134-14 251-14" strokeDasharray="4 7" />
        <path d="M216 51c0 105 42 161 120 161s0-119 0-119" />
        <circle cx="216" cy="51" r="24" />
        <circle cx="336" cy="93" r="36" />
        <circle cx="406" cy="189" r="24" />
      </g>
      <g fill="currentColor">
        <circle cx="52" cy="173" r="8" />
        <circle cx="216" cy="51" r="5" />
        <circle cx="336" cy="93" r="8" />
        <circle cx="406" cy="189" r="5" />
        <circle cx="587" cy="79" r="8" />
      </g>
      <path d="m569 60 18 19-18 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MovementBurst() {
  return <svg viewBox="0 0 180 180" fill="none" aria-hidden="true" focusable="false">
    {Array.from({ length: 12 }, (_, index) => <rect key={index} x="81" y="5" width="18" height="57" rx="9" fill="currentColor" transform={`rotate(${index * 30} 90 90)`} />)}
    <circle cx="90" cy="90" r="18" fill="currentColor" />
  </svg>;
}

export function StoryLoop() {
  return <svg className="kinetic-story-loop" viewBox="0 0 440 440" fill="none" aria-hidden="true" focusable="false">
    <g stroke="currentColor">
      <circle cx="220" cy="220" r="204" strokeWidth="1" opacity=".35" />
      <circle cx="220" cy="220" r="181" strokeWidth="1" strokeDasharray="3 8" opacity=".5" />
      <path d="M91 87c84-69 208-49 262 42m-1 183c-83 69-207 49-262-42" strokeWidth="12" strokeLinecap="round" />
      <path d="m325 127 31 8 7-31m-253 169-29-11-8 31" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="220" cy="220" r="147" strokeWidth="1" opacity=".35" />
    </g>
    <g fill="currentColor"><circle cx="32" cy="220" r="9" /><circle cx="408" cy="220" r="9" /></g>
  </svg>;
}
