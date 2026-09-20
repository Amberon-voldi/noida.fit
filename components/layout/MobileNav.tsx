"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS } from "@/lib/config";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  // Detect client-side mount for portal rendering
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    },
    [open]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const close = () => setOpen(false);

  const panel = (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={close}
        />
      )}

      {/* Slide-out Panel */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal={open}
        aria-label="Navigation menu"
        className={`fixed top-0 right-0 z-[9999] h-full w-72 bg-[#11141d] border-l border-border-subtle flex flex-col md:hidden transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <Logo size="sm" />
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={close}
            className="flex items-center justify-center h-9 w-9 rounded-md text-text-secondary hover:text-white hover:bg-[#22293c] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col p-4 gap-1 flex-1 overflow-y-auto" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#22293c] transition-colors"
            >
              {link.label}
            </Link>
          ))}

          <div className="my-2 border-t border-border-subtle" />

          <Link
            href="/@demo-user"
            onClick={close}
            className="flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold text-[#9ddc2e] hover:bg-[#22293c] transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#9ddc2e]" />
              Fitness ID
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#9ddc2e]/10 border border-[#9ddc2e]/20">
              PASSPORT
            </span>
          </Link>
          <Link
            href="/for-organizers"
            onClick={close}
            className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#22293c] transition-colors"
          >
            For Organizers
          </Link>
          <Link
            href="/login"
            onClick={close}
            className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#22293c] transition-colors"
          >
            Sign In
          </Link>
        </nav>

        {/* Bottom CTA */}
        <div className="p-5 border-t border-border-subtle">
          <Link
            href="/discover"
            onClick={close}
            className="flex w-full items-center justify-center rounded-lg bg-[#9ddc2e] px-4 py-3 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors"
          >
            Explore Noida Fitness
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger Button — always in DOM for mobile */}
      <button
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((o) => !o)}
        className="md:hidden flex items-center justify-center h-10 w-10 rounded-md text-[#94a3b8] hover:text-white hover:bg-[#22293c] transition-colors"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Render panel via Portal to escape Navbar stacking context */}
      {mounted && createPortal(panel, document.body)}
    </>
  );
}
