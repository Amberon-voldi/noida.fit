"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

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
    <aside
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[1200] rounded-xl border border-border-strong bg-surface p-4 shadow-[var(--shadow-card-hover)] sm:bottom-4 sm:left-auto sm:w-[min(36rem,calc(100vw-2rem))]"
    >
      <div className="flex items-start gap-4">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-text-secondary">
          NOIDA.FIT uses an essential session cookie to keep signed-in accounts working. We do not use advertising or analytics cookies. <Link href="/privacy" className="font-semibold text-velocity underline hover:text-velocity-glow">Read our Privacy Policy</Link>.
        </p>
        <button type="button" onClick={dismiss} className="button-secondary shrink-0 px-3 text-xs">
          Got it
        </button>
      </div>
    </aside>
  );
}
