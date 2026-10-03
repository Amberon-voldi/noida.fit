"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface MobileAccountSectionProps {
  headingId: string;
  title: string;
  sectionId?: string;
  children: ReactNode;
}

export function MobileAccountSection({ headingId, title, sectionId, children }: MobileAccountSectionProps) {
  const [open, setOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentId = `${headingId}-content`;

  useEffect(() => {
    let frame = 0;
    const matchesHash = (hash: string) => hash === `#${headingId}` || Boolean(sectionId && hash === `#${sectionId}`);

    function reveal() {
      setOpen(true);
      cancelAnimationFrame(frame);
      // Wait for the panel to expand before scrolling, including near the page bottom.
      frame = requestAnimationFrame(() => {
        headingRef.current?.scrollIntoView({ block: "start" });
        const button = buttonRef.current;
        if (button && getComputedStyle(button).display !== "none") button.focus({ preventScroll: true });
      });
    }

    function onHashChange() {
      if (matchesHash(window.location.hash)) reveal();
    }

    function onAnchorClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search && matchesHash(url.hash)) {
        // A second click on the same hash does not emit hashchange. Keep native navigation intact.
        reveal();
      }
    }

    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onAnchorClick);
    frame = requestAnimationFrame(onHashChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onAnchorClick);
    };
  }, [headingId, sectionId]);

  return (
    <section id={sectionId} aria-labelledby={headingId} className={`scroll-mt-24 ${open ? "space-y-4" : "md:space-y-4"}`}>
      <h2 ref={headingRef} id={headingId} className="scroll-mt-24 text-lg font-semibold text-white">
        <span className="hidden md:inline">{title}</span>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-velocity md:hidden"
        >
          {title}
          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <div id={contentId} className={open ? "block" : "hidden md:block"}>{children}</div>
    </section>
  );
}
