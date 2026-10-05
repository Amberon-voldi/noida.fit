"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

export interface LandingMotionProps { children: ReactNode; }

/** Landing-only choreography. Content is visible by default; scrolling stays native. */
export function LandingMotion({ children }: LandingMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const revealedRef = useRef(new WeakSet<Element>());

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
      zoom: Number(node.dataset.parallaxZoom) || 0,
    }));
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal-item]"));
    const animations = new Map<Element, Animation>();
    const visible = new Set<Element>();
    let frame = 0;
    const enabled = () => !paused && !preference.matches && document.visibilityState === "visible";
    const reset = () => layers.forEach(({ node }) => {
      ["--landing-shift", "--landing-turn", "--landing-scale", "--landing-progress"].forEach(property => node.style.removeProperty(property));
    });
    const cancelReveals = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
    const update = () => {
      frame = 0;
      if (!enabled()) return;
      // Read scene geometry once, then write transforms; never set React state on scroll.
      const positions = new Map<Element, number>();
      for (const scene of visible) {
        const rect = scene.getBoundingClientRect();
        positions.set(scene, Math.max(-.5, Math.min(.5, (innerHeight - rect.top) / (innerHeight + rect.height) - .5)));
      }
      const mobileScale = innerWidth < 768 ? .5 : 1;
      layers.forEach(({ node, scene, distance, turn, zoom }) => {
        if (!scene || !positions.has(scene)) return;
        const progress = positions.get(scene)!;
        node.style.setProperty("--landing-shift", `${(progress * distance * mobileScale).toFixed(2)}px`);
        node.style.setProperty("--landing-turn", `${(progress * turn * mobileScale).toFixed(2)}deg`);
        node.style.setProperty("--landing-scale", (1 + (progress + .5) * zoom * mobileScale).toFixed(4));
        node.style.setProperty("--landing-progress", (progress + .5).toFixed(4));
      });
    };
    const schedule = () => { if (!frame && enabled() && visible.size) frame = requestAnimationFrame(update); };
    let revealObserver: IntersectionObserver | null = null;
    if (window.IntersectionObserver) revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !enabled()) continue;
        revealObserver?.unobserve(entry.target);
        if (revealedRef.current.has(entry.target)) continue;
        revealedRef.current.add(entry.target);
        const target = entry.target as HTMLElement;
        // Keyboard users never have to wait for a focused control to appear.
        if (target.contains(document.activeElement)) continue;
        const style = target.dataset.revealStyle;
        const start: Keyframe = style === "image" ? { opacity: .5, clipPath: "inset(18% 0 18% 0)", transform: "scale(.96)" }
          : style === "line" ? { opacity: 0, transform: "translate3d(0, 108%, 0)" }
          : style === "left" ? { opacity: 0, transform: "translateX(-28px)" }
          : style === "right" ? { opacity: 0, transform: "translateX(28px)" }
          : { opacity: 0, transform: "translateY(28px) scale(.975)" };
        const end: Keyframe = { opacity: 1, transform: "none", ...(style === "image" ? { clipPath: "inset(0% 0 0% 0)" } : {}) };
        const delay = Math.max(0, Math.min(2, Number(target.dataset.revealOrder) || 0)) * 30;
        const animation = target.animate([start, end], { duration: 300, delay, easing: "cubic-bezier(.25,1,.5,1)", fill: "backwards" });
        animation.id = "noidafit-landing-reveal";
        animations.set(target, animation);
        void animation.finished.then(() => animations.delete(target), () => animations.delete(target));
      }
    }, { threshold: .12 });
    const preferenceChanged = () => {
      root.dataset.motion = preference.matches ? "reduced" : paused ? "paused" : "active";
      if (!enabled()) {
        cancelAnimationFrame(frame); frame = 0; reset(); cancelReveals(); revealObserver?.disconnect();
      } else {
        targets.filter(target => !revealedRef.current.has(target)).forEach(target => revealObserver?.observe(target));
        schedule();
      }
    };
    const focused = (event: FocusEvent) => {
      for (const [target, animation] of animations) if (target.contains(event.target as Node)) { animation.cancel(); animations.delete(target); }
    };
    const sceneObserver = window.IntersectionObserver ? new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); });
      schedule();
    }) : null;
    scenes.forEach(scene => sceneObserver?.observe(scene));
    preferenceChanged();
    root.addEventListener("focusin", focused);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("visibilitychange", preferenceChanged);
    preference.addEventListener("change", preferenceChanged);
    return () => {
      cancelAnimationFrame(frame); cancelReveals();
      sceneObserver?.disconnect(); revealObserver?.disconnect();
      root.removeEventListener("focusin", focused);
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
    <button type="button" className="landing-motion-toggle" aria-label={paused ? "Resume parallax motion" : "Pause parallax motion"} title={paused ? "Resume scroll motion" : "Pause scroll motion"} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>
    <span role="status" className="sr-only">{paused ? "Landing scroll motion and reveals paused." : ""}</span>
  </div>;
}
