"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { curtainFrame, identityFrame, scrollEntryProgress, scrollSceneProgress, storyCardFrame, storyWheelFrame } from "./choreography";

/** Small client boundary: event-driven transforms; all copy, images and links arrive as server children. */
export function LandingChoreography({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const pauseRef = useRef(false);
  const syncMode = useRef<(() => void) | null>(null);
  const toggleMotion = () => {
    pauseRef.current = !pauseRef.current;
    syncMode.current?.();
    setPaused(pauseRef.current);
  };
  const revealed = useRef(new WeakSet<Element>());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scenes = Array.from(root.querySelectorAll<HTMLElement>("[data-scroll-scene]"));
    const parallax = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]"));
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-scroll-reveal]"));
    const communityCopy = root.querySelector<HTMLElement>(".kinetic-community-copy");
    const journey = root.querySelector<HTMLElement>('[data-scroll-scene="journey"]');
    const journeyCards = Array.from(root.querySelectorAll<HTMLElement>("[data-journey-card]"));
    const animations = new Map<Element, Animation>();
    const visible = new Set<Element>();
    let frame = 0;
    let flow = false;
    let sceneTop = 0;
    const enabled = () => !pauseRef.current && !preference.matches && !document.hidden;
    const reset = () => {
      scenes.forEach(node => node.removeAttribute("style"));
      journeyCards.forEach(node => node.removeAttribute("style"));
      parallax.forEach(node => node.style.removeProperty("--depth-shift"));
    };
    const cancelReveals = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
    const update = () => {
      frame = 0;
      if (!enabled()) return;
      const mobile = innerWidth < 768;
      // Geometry reads precede all writes. Scene work is bounded by visibility.
      const positions = scenes.filter(node => visible.has(node)).map(node => ({ node, rect: node.getBoundingClientRect() }));
      const depths = parallax.map(node => ({ node, top: node.closest("[data-depth-scene]")?.getBoundingClientRect().top ?? 0 }));
      const cards = !flow && journey && visible.has(journey) ? journeyCards.map(node => ({ node, top: node.getBoundingClientRect().top })) : [];
      for (const { node, rect } of positions) {
        const progress = node === journey ? scrollEntryProgress(rect.top, innerHeight) : scrollSceneProgress(rect.top, rect.height, innerHeight, sceneTop);
        if (flow) continue;
        if (node.dataset.scrollScene === "curtain") {
          // A focused link is never hidden by a decorative curtain.
          const values = curtainFrame(node.contains(document.activeElement) ? 1 : progress);
          node.style.setProperty("--curtain-open", values.open.toFixed(4));
          node.style.setProperty("--curtain-scale", values.photoScale.toFixed(4));
          node.style.setProperty("--curtain-title-shift", `${values.titleShift.toFixed(2)}px`);
        } else if (node.dataset.scrollScene === "identity") {
          const values = identityFrame(progress, mobile);
          node.style.setProperty("--id-reveal", values.reveal.toFixed(4));
          node.style.setProperty("--id-rotation", `${values.rotation.toFixed(2)}deg`);
          node.style.setProperty("--id-tilt", `${values.tilt.toFixed(2)}deg`);
          node.style.setProperty("--id-roll", `${values.roll.toFixed(2)}deg`);
          node.style.setProperty("--id-x", `${values.x.toFixed(2)}px`);
          node.style.setProperty("--id-y", `${values.y.toFixed(2)}px`);
          node.style.setProperty("--id-scale", values.scale.toFixed(4));
          node.style.setProperty("--id-handoff", values.handoff.toFixed(4));
        } else if (node === journey) {
          const values = storyWheelFrame(progress, mobile);
          node.style.setProperty("--story-wheel-rotation", `${values.rotation.toFixed(2)}deg`);
          node.style.setProperty("--story-wheel-x", `${values.x.toFixed(2)}px`);
          node.style.setProperty("--story-wheel-y", `${values.y.toFixed(2)}px`);
          node.style.setProperty("--story-wheel-scale", values.scale.toFixed(4));
        }
        node.dataset.progress = progress.toFixed(4);
      }
      for (const { node, top } of cards) {
        const index = Number(node.dataset.journeyCard) || 0;
        const progress = node.contains(document.activeElement) ? 1 : scrollEntryProgress(top + index * 18, innerHeight, .96, .36);
        const values = storyCardFrame(progress, index, mobile);
        node.style.setProperty("--fly-progress", values.progress.toFixed(4));
        node.style.setProperty("--fly-x", `${values.x.toFixed(2)}px`);
        node.style.setProperty("--fly-y", `${values.y.toFixed(2)}px`);
        node.style.setProperty("--fly-rotation", `${values.rotation.toFixed(2)}deg`);
        node.style.setProperty("--fly-tilt", `${values.tilt.toFixed(2)}deg`);
        node.style.setProperty("--fly-scale", values.scale.toFixed(4));
      }
      for (const { node, top } of depths) {
        const depth = Number(node.dataset.depth) || 0;
        const shift = Math.max(-1, Math.min(1, top / innerHeight)) * depth * (mobile ? .5 : 1);
        node.style.setProperty("--depth-shift", `${shift.toFixed(2)}px`);
      }
    };
    const schedule = () => { if (!frame && enabled()) frame = requestAnimationFrame(update); };
    let revealObserver: IntersectionObserver | null = null;
    if (window.IntersectionObserver) revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !enabled() || revealed.current.has(entry.target)) continue;
        revealed.current.add(entry.target); revealObserver?.unobserve(entry.target);
        const target = entry.target as HTMLElement;
        if (target.contains(document.activeElement) || typeof target.animate !== "function") continue;
        const side = target.dataset.scrollReveal;
        const start = side === "left" ? "translate3d(-24px,0,0)" : side === "right" ? "translate3d(24px,0,0)" : "translate3d(0,24px,0)";
        const animation = target.animate([{ opacity: .15, transform: start }, { opacity: 1, transform: "none" }], { duration: 300, delay: Math.min(2, Math.max(0, Number(target.dataset.revealOrder) || 0)) * 30, easing: "cubic-bezier(.25,1,.5,1)", fill: "backwards" });
        animations.set(target, animation);
        void animation.finished.then(() => animations.delete(target), () => animations.delete(target));
      }
    }, { threshold: .12 });
    const focused = (event: FocusEvent) => {
      for (const [target, animation] of animations) if (target.contains(event.target as Node)) { animation.cancel(); animations.delete(target); }
      const curtain = (event.target as Element).closest<HTMLElement>('[data-scroll-scene="curtain"]');
      if (curtain) { curtain.style.setProperty("--curtain-open", "1"); curtain.style.setProperty("--curtain-title-shift", "0px"); }
      schedule();
    };
    const sceneObserver = window.IntersectionObserver ? new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); });
      schedule();
    }, { rootMargin: "100px 0px" }) : null;
    if (sceneObserver) scenes.forEach(scene => sceneObserver.observe(scene)); else scenes.forEach(scene => visible.add(scene));
    const modeChanged = () => {
      const offset = parseFloat(getComputedStyle(root).getPropertyValue("--scene-top"));
      sceneTop = Number.isFinite(offset) ? offset : 0;
      const nextFlow = innerHeight < 620 || parseFloat(getComputedStyle(document.documentElement).fontSize) >= 24 || (communityCopy?.scrollHeight ?? 0) > innerHeight - sceneTop;
      if (flow !== nextFlow) { flow = nextFlow; reset(); }
      root.dataset.layout = flow ? "flow" : "scroll";
      root.dataset.motion = preference.matches ? "reduced" : pauseRef.current ? "paused" : "active";
      if (!enabled()) {
        cancelAnimationFrame(frame); frame = 0; reset(); cancelReveals(); revealObserver?.disconnect();
      } else {
        targets.filter(target => !revealed.current.has(target)).forEach(target => revealObserver?.observe(target));
        schedule();
      }
    };
    const resize = typeof ResizeObserver === "function" ? new ResizeObserver(modeChanged) : null;
    resize?.observe(root); resize?.observe(document.documentElement);
    if (communityCopy) resize?.observe(communityCopy);
    syncMode.current = modeChanged;
    root.addEventListener("focusin", focused);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", modeChanged, { passive: true });
    document.addEventListener("visibilitychange", modeChanged);
    preference.addEventListener("change", modeChanged);
    modeChanged();
    return () => {
      syncMode.current = null;
      cancelAnimationFrame(frame); cancelReveals(); reset(); resize?.disconnect();
      sceneObserver?.disconnect(); revealObserver?.disconnect();
      root.removeEventListener("focusin", focused);
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", modeChanged);
      document.removeEventListener("visibilitychange", modeChanged); preference.removeEventListener("change", modeChanged);
      scenes.forEach(node => delete node.dataset.progress);
      delete root.dataset.layout;
    };
  }, []);

  return <div ref={rootRef} className="kinetic-landing" data-motion="static">
    {children}
    <button type="button" className="kinetic-motion-toggle" onClick={toggleMotion} aria-label={paused ? "Resume landing motion" : "Pause landing motion"} aria-pressed={paused}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}<span>{paused ? "Resume motion" : "Pause motion"}</span></button>
    <span className="sr-only" role="status">{paused ? "Landing motion paused. Content and links remain available." : ""}</span>
  </div>;
}
