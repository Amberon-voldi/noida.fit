"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS } from "@/lib/config";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger Button */}
      <button
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((o) => !o)}
        className="md:hidden flex items-center justify-center h-10 w-10 rounded-md text-text-secondary hover:text-white hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-velocity"
      >
        {open ? (
          // X icon
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Menu icon
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[800] bg-black/70 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out Panel */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-label="Navigation menu"
        className={`fixed top-0 right-0 z-[900] h-full w-72 bg-surface-elevated border-l border-border-subtle flex flex-col md:hidden transition-transform duration-250 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <Logo size="sm" />
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center h-9 w-9 rounded-md text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col p-4 gap-1" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/for-organizers"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
          >
            For Organizers
          </Link>
        </nav>

        <div className="p-5 border-t border-border-subtle mt-auto">
          <Link
            href="/discover"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center rounded-md bg-velocity px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-velocity-glow transition-colors"
          >
            Explore Noida Fitness
          </Link>
        </div>
      </div>
    </>
  );
}
