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
    // In normal flow, not fixed: a floating notice covers whatever sits under it at every
    // scroll offset, so a link beneath it can take keyboard focus while invisible (WCAG 2.2 2.4.11).
    <aside
      data-cookie-notice
      aria-label="Cookie notice"
      className="border-b border-border-subtle bg-surface px-4 py-3"
    >
      <div className="mx-auto flex w-full max-w-[1280px] items-start gap-4">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-text-secondary">
          {COOKIE_DISCLOSURE} <Link href="/privacy" className="font-semibold text-velocity underline hover:text-velocity-glow">Read our Privacy Policy</Link>.
        </p>
        <button type="button" onClick={dismiss} className="button-secondary shrink-0 px-3 text-xs">
          Got it
        </button>
      </div>
    </aside>
  );
}
