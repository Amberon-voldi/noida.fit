"use client";

import { useEffect } from "react";

export type BeaconKind = "event" | "community";
export type BeaconMetric = "view" | "cta" | "pay";

/** Sends one metric without holding anything up: a beacon the browser delivers in the background. */
export function trackMetric(kind: BeaconKind, target: string, metric: BeaconMetric): void {
  try {
    if (typeof navigator === "undefined" || navigator.doNotTrack === "1") return;
    const body = new Blob([JSON.stringify({ k: kind, t: target, m: metric })], { type: "text/plain" });
    if (!navigator.sendBeacon?.("/api/metrics", body)) void fetch("/api/metrics", { method: "POST", body, keepalive: true, credentials: "omit" }).catch(() => {});
  } catch { /* Metrics never break the page. */ }
}

/** Counts a view of this page once it has loaded and the browser is idle. Renders nothing. */
export function PageBeacon({ kind, target }: { kind: BeaconKind; target: string }) {
  useEffect(() => {
    const send = () => trackMetric(kind, target, "view");
    const idle = window.requestIdleCallback?.(send, { timeout: 4000 });
    const timer = idle === undefined ? window.setTimeout(send, 1500) : undefined;
    return () => { if (idle !== undefined) window.cancelIdleCallback?.(idle); if (timer !== undefined) window.clearTimeout(timer); };
  }, [kind, target]);
  return null;
}
