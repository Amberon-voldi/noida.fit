"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

export interface LandingMotionProps { children: ReactNode; }

/** Scroll-linked graphics only: no render loop, scroll hijacking or hidden content. */
export function LandingMotion({ children }: LandingMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.motionReady = "true";
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scenes = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax-scene]"));
    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]")).map(node => ({
      node, scene: node.closest<HTMLElement>("[data-parallax-scene]"),
      distance: Number(node.dataset.parallax) || 0,
      turn: Number(node.dataset.parallaxTurn) || 0,
    }));
    const visible = new Set<Element>();
    let frame = 0;
    const enabled = () => !paused && !preference.matches && document.visibilityState === "visible";
    const reset = () => layers.forEach(({ node }) => {
      node.style.removeProperty("--landing-shift");
      node.style.removeProperty("--landing-turn");
    });
    const update = () => {
      frame = 0;
      if (!enabled()) return;
      const positions = new Map<Element, number>();
      for (const scene of visible) {
        const rect = scene.getBoundingClientRect();
        positions.set(scene, Math.max(-.5, Math.min(.5, (innerHeight - rect.top) / (innerHeight + rect.height) - .5)));
      }
      const mobileScale = innerWidth < 768 ? .5 : 1;
      layers.forEach(({ node, scene, distance, turn }) => {
        if (!scene || !positions.has(scene)) return;
        const progress = positions.get(scene)!;
        node.style.setProperty("--landing-shift", `${(progress * distance * mobileScale).toFixed(2)}px`);
        node.style.setProperty("--landing-turn", `${(progress * turn * mobileScale).toFixed(2)}deg`);
      });
    };
    const schedule = () => { if (!frame && enabled() && visible.size) frame = requestAnimationFrame(update); };
    const preferenceChanged = () => {
      root.dataset.motion = preference.matches ? "reduced" : paused ? "paused" : "active";
      if (!enabled()) { cancelAnimationFrame(frame); frame = 0; reset(); }
      else schedule();
    };
    const observer = window.IntersectionObserver ? new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); });
      schedule();
    }) : null;
    scenes.forEach(scene => observer?.observe(scene));
    preferenceChanged();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("visibilitychange", preferenceChanged);
    preference.addEventListener("change", preferenceChanged);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", preferenceChanged);
      preference.removeEventListener("change", preferenceChanged);
      delete root.dataset.motionReady;
      reset();
    };
  }, [paused]);

  return <div ref={rootRef} className="landing-page" data-motion={paused ? "paused" : "active"}>
    {children}
    <button type="button" className="landing-motion-toggle" aria-label={paused ? "Resume parallax motion" : "Pause parallax motion"} title={paused ? "Resume parallax motion" : "Pause parallax motion"} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>
    <span role="status" className="sr-only">{paused ? "Scroll motion paused." : ""}</span>
  </div>;
}
