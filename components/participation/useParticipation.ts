"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RSVP, SavedItem, Membership } from "@/types/platform";

interface ParticipationSnapshot {
  loaded: boolean;
  observedAt: number;
  authenticated: boolean;
  error: string | null;
  rsvps: RSVP[];
  savedItems: SavedItem[];
  memberships: Membership[];
}
const empty: ParticipationSnapshot = { loaded: false, observedAt: 0, authenticated: false, error: null, rsvps: [], savedItems: [], memberships: [] };
let snapshot = empty;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();
let generation = 0;
const emit = (next: ParticipationSnapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
function resetSession() { generation += 1; request = null; emit(empty); void refreshParticipation(); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("noidafit:session", resetSession);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("noidafit:session", resetSession);
      generation += 1; request = null; snapshot = empty;
    }
  };
}

/** Deduplicate simultaneous card requests; never persist private state to browser storage. */
export function refreshParticipation(): Promise<void> {
  if (request) return request;
  const current = generation;
  request = fetch("/api/participation?view=controls", { credentials: "same-origin", cache: "no-store" })
    .then(async response => {
      if (current !== generation) return;
      if (response.status === 401) { emit({ ...empty, loaded: true, observedAt: Date.now() }); return; }
      if (!response.ok) throw new Error("Your saved items couldn't be loaded. Try again.");
      const data = await response.json() as Pick<ParticipationSnapshot, "rsvps" | "savedItems" | "memberships">;
      if (current !== generation) return;
      emit({ rsvps: data.rsvps, savedItems: data.savedItems, memberships: data.memberships, authenticated: true, loaded: true, observedAt: Date.now(), error: null });
    })
    .catch(() => { if (current === generation) emit({ ...empty, loaded: true, observedAt: Date.now(), error: "Account status is temporarily unavailable. Try again." }); })
    .finally(() => { if (current === generation) request = null; });
  return request;
}

export function useParticipation(): ParticipationSnapshot {
  const value = useSyncExternalStore(subscribe, () => snapshot, () => empty);
  useEffect(() => {
    void refreshParticipation();
  }, []);
  return value;
}

export function loginUrl(): string {
  return `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}
