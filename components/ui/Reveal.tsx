"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: content is visible even without JS or motion support. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || preference.matches || !window.IntersectionObserver || !element.animate) return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        if (!preference.matches) animation = element.animate(
          [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 400, easing: "cubic-bezier(.16,1,.3,1)" },
        );
        observer.disconnect();
      }
    }, { threshold: 0.05 });
    const reduce = () => { if (preference.matches) { animation?.cancel(); observer.disconnect(); } };
    preference.addEventListener("change", reduce);
    observer.observe(element);
    return () => { observer.disconnect(); animation?.cancel(); preference.removeEventListener("change", reduce); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
