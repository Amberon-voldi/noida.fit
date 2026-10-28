"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CheckInPass { token: string; expiresAt: string; }
export type CheckInPassState =
  | { status: "idle" | "loading" | "expired" | "unverified" }
  | { status: "ready"; pass: CheckInPass }
  | { status: "error"; message: string };

// Memory only, so reopening the card does not spend a rate-limited request.
// A sign-in or sign-out in this tab drops it: a pass belongs to one session owner.
let cached: CheckInPass | null = null;
if (typeof window !== "undefined") window.addEventListener("noidafit:session", () => { cached = null; });

const usable = (pass: CheckInPass | null): pass is CheckInPass => Boolean(pass && Date.parse(pass.expiresAt) - Date.now() > 30_000);

/** Loads the owner's short-lived check-in pass the first time `active` becomes true. */
export function useCheckInPass(active: boolean) {
  const [state, setState] = useState<CheckInPassState>(() => usable(cached) ? { status: "ready", pass: cached } : { status: "idle" });
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/check-in/pass", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json().catch(() => null) as (Partial<CheckInPass> & { code?: string; error?: string }) | null;
      if (response.status === 403 && data?.code === "EMAIL_UNVERIFIED") { setState({ status: "unverified" }); return; }
      if (response.status === 401) { setState({ status: "error", message: "Sign in again to show your check-in QR." }); return; }
      if (response.status === 429) { setState({ status: "error", message: "Too many refreshes. Try again in a few minutes." }); return; }
      if (!response.ok || !data?.token || !data.expiresAt || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error();
      cached = { token: data.token, expiresAt: data.expiresAt };
      setState({ status: "ready", pass: cached });
    } catch {
      setState({ status: "error", message: "Your check-in QR could not be loaded. Try again." });
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active || state.status !== "idle") return;
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [active, state.status, load]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const timeout = window.setTimeout(() => { cached = null; setState({ status: "expired" }); }, Math.max(0, Date.parse(state.pass.expiresAt) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [state]);

  return { state, refresh: load };
}
