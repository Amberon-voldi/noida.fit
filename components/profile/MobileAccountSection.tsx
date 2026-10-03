"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface MobileAccountSectionProps {
  headingId: string;
  title: string;
  description?: string;
  sectionId?: string;
  children: ReactNode;
}

/** Account disclosure used at every breakpoint so secondary controls do not compete with the main plans. */
export function MobileAccountSection({ headingId, title, description, sectionId, children }: MobileAccountSectionProps) {
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
        buttonRef.current?.focus({ preventScroll: true });
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
    <section id={sectionId} aria-labelledby={headingId} className={`account-disclosure scroll-mt-28 ${open ? "account-disclosure-open" : ""}`}>
      <h2 ref={headingRef} id={headingId} className="account-disclosure-heading">
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(value => !value)}
          className="account-disclosure-trigger"
        >
          <span className="min-w-0">
            <span className="block text-base font-bold text-white">{title}</span>
            {description && <span className="mt-1 block text-xs font-normal leading-relaxed text-text-secondary">{description}</span>}
          </span>
          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-text-secondary transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180 text-velocity" : ""}`} />
        </button>
      </h2>
      <div id={contentId} hidden={!open} className="account-disclosure-content">{children}</div>
    </section>
  );
}
