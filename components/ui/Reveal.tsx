"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** One-shot choreography. Content stays visible without JS or animation support. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || preference.matches || !window.IntersectionObserver || !element.animate) return;
    const items = element.querySelectorAll<HTMLElement>("[data-reveal-item]");
    const targets = items.length ? Array.from(items) : [element];
    const animations = new Set<Animation>();
    const targetOrder = new Map(targets.map((target, index) => [target, index]));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (preference.matches || document.visibilityState !== "visible") continue;
        const animation = entry.target.animate(
          [{ opacity: 0, transform: "translateY(12px) scale(.985)" }, { opacity: 1, transform: "none" }],
          { duration: 300, delay: Math.min(targetOrder.get(entry.target as HTMLElement) ?? 0, 3) * 30, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" },
        );
        animation.id = "noidafit-reveal";
        animations.add(animation);
        void animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      }
    }, { threshold: 0.08 });
    const reduce = () => {
      if (!preference.matches) return;
      animations.forEach(animation => animation.cancel());
      observer.disconnect();
    };
    preference.addEventListener("change", reduce);
    targets.forEach(target => observer.observe(target));
    return () => {
      observer.disconnect();
      animations.forEach(animation => animation.cancel());
      preference.removeEventListener("change", reduce);
    };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
