"use client";

import { useEffect, useRef, useState } from "react";

/** Fired when a ticket summary opens (useEventBooking), for an event page's flourish to play. */
export const CHECKOUT_OPEN_EVENT = "noida:checkout-open";

const BEAMS = [
  { angle: -18, top: 22, color: "var(--accent-velocity)", delay: 0 },
  { angle: 14, top: 38, color: "#ff2bd6", delay: 70 },
  { angle: -8, top: 55, color: "#22e4ff", delay: 130 },
  { angle: 22, top: 68, color: "var(--accent-velocity)", delay: 190 },
  { angle: -26, top: 80, color: "#ff2bd6", delay: 240 },
];
const DURATION_MS = 1100;

/**
 * A laser-tag flourish for events tagged "laser-tag": neon beams sweep the screen and a target reticle
 * locks onto the tap as the ticket summary opens. It sits in the top layer (a manual popover shown after
 * the summary's dialog), never takes a tap, and doesn't play for people who prefer reduced motion.
 */
export function LaserBurst() {
  const ref = useRef<HTMLDivElement>(null);
  const tap = useRef({ x: 0, y: 0 });
  const [run, setRun] = useState({ count: 0, x: 0, y: 0 });

  useEffect(() => {
    const remember = (event: PointerEvent) => { tap.current = { x: event.clientX, y: event.clientY }; };
    const play = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setRun(value => ({ count: value.count + 1, ...tap.current }));
    };
    window.addEventListener("pointerdown", remember, { capture: true, passive: true });
    window.addEventListener(CHECKOUT_OPEN_EVENT, play);
    return () => {
      window.removeEventListener("pointerdown", remember, { capture: true });
      window.removeEventListener(CHECKOUT_OPEN_EVENT, play);
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!run.count || !element || typeof element.showPopover !== "function") return;
    // After the summary's dialog has opened, so the beams layer above it.
    const frame = requestAnimationFrame(() => { try { element.showPopover(); } catch { /* Already shown. */ } });
    const done = window.setTimeout(() => { try { element.hidePopover(); } catch { /* Already hidden. */ } }, DURATION_MS);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(done); };
  }, [run]);

  const { x, y } = run;
  return <div ref={ref} popover="manual" aria-hidden="true" className="laser-burst" key={run.count}>
    <div className="laser-burst-flash" />
    {BEAMS.map((beam, index) => <span key={index} className="laser-burst-beam" style={{ top: `${beam.top}%`, "--beam-angle": `${beam.angle}deg`, "--beam-color": beam.color, animationDelay: `${beam.delay}ms` } as React.CSSProperties} />)}
    {(x || y) ? <span className="laser-burst-reticle" style={{ left: x, top: y }} /> : null}
  </div>;
}
