"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { COOKIE_DISCLOSURE } from "@/lib/privacy";

const DISMISSAL_KEY = "noidafit:cookie-notice-dismissed";
const DISMISSAL_EVENT = "noidafit:cookie-notice-dismissed";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(DISMISSAL_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(DISMISSAL_EVENT, onStoreChange);
  };
}

function getDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function CookieNotice() {
  const [dismissedThisRender, setDismissedThisRender] = useState(false);
  const dismissed = useSyncExternalStore(subscribe, getDismissed, () => false);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSAL_KEY, "1");
    } catch {
      // The notice can still be dismissed for the current render.
    }
    setDismissedThisRender(true);
    window.dispatchEvent(new Event(DISMISSAL_EVENT));
  }

  if (dismissed || dismissedThisRender) return null;

  return (
    // Floating, so it never shifts the page layout. While it shows, globals.css reserves its
    // height as scroll padding, so a focused control is scrolled clear of it (WCAG 2.2 2.4.11).
    <aside data-cookie-notice aria-label="Cookie notice" className="cookie-notice">
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-text-secondary">
        {COOKIE_DISCLOSURE} <Link href="/privacy" className="font-semibold text-velocity underline hover:text-velocity-glow">Read our Privacy Policy</Link>.
      </p>
      <button type="button" onClick={dismiss} className="button-secondary min-h-11 shrink-0 self-center px-4 text-xs">
        Got it
      </button>
    </aside>
  );
}
