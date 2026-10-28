"use client";

import { useEffect, useRef, useState } from "react";

const sections = [
  { id: "overview", label: ".fit ID" },
  { id: "plans", label: "Your plans" },
  { id: "passport", label: "Passport" },
  { id: "settings", label: "Profile & privacy", block: true },
] as const;

/** Section tabs that follow the scroll position, like an app's segmented control. */
export function AccountSectionNav() {
  const [active, setActive] = useState<string>(sections[0].id);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const targets = () => sections.map(section => {
      const node = document.getElementById(section.id);
      // The settings anchor is a heading inside its block; track the whole block.
      return { id: section.id, node: "block" in section ? node?.closest<HTMLElement>(".member-block") ?? node : node };
    });
    function update() {
      frame = 0;
      const nav = navRef.current?.getBoundingClientRect();
      const line = (nav ? nav.bottom : 0) + 24;
      let current: string = sections[0].id;
      for (const { id, node } of targets()) if (node && node.getBoundingClientRect().top <= line) current = id;
      // At the very bottom the last block may never reach the line.
      if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1].id;
      setActive(current);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    // Keep the active tab visible when the bar scrolls horizontally on phones.
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;
    const navBox = nav.getBoundingClientRect(), linkBox = link.getBoundingClientRect();
    const left = nav.scrollLeft + linkBox.left - navBox.left - (navBox.width - linkBox.width) / 2;
    nav.scrollTo({ left, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active]);

  return <nav ref={navRef} className="member-section-nav" aria-label="Account sections">
    {sections.map(section => <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "true" : undefined}>{section.label}</a>)}
  </nav>;
}
