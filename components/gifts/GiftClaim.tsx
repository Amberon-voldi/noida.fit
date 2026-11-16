"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, LoaderCircle } from "lucide-react";
import type { GiftState } from "@/lib/services/gifts";

const closedCopy: Record<Exclude<GiftState, "open" | "yours">, string> = {
  going: "You already have a spot at this session, so this gift stays free for someone else.",
  used: "This gift has already been claimed.",
  full: "This session is full right now, so the gift can’t be claimed.",
  closed: "This session has started, ended or been cancelled, so the gift can’t be claimed.",
  revoked: "The organizer has switched off this gift link.",
};

/** Claim a gift link's free spot: one tap once signed in. */
export function GiftClaim({ giftId, initialState, signedIn }: { giftId: string; initialState: GiftState; signedIn: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [seat, setSeat] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const back = encodeURIComponent(`/gift/${giftId}`);

  async function claim(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/gifts/${encodeURIComponent(giftId)}/claim`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
      if (response.status === 401) { router.push(`/login?callbackUrl=${back}`); return; }
      const data = await response.json().catch(() => null) as { seatNumber?: number; error?: string; code?: string } | null;
      if (!response.ok) {
        const settled = ({ ALREADY_GOING: "going", GIFT_USED: "used", EVENT_FULL: "full", EVENT_STARTED: "closed", GIFT_REVOKED: "revoked" } as const)[data?.code ?? ""];
        if (settled) setState(settled);
        else setError(data?.error || "The gift could not be claimed. Try again.");
        return;
      }
      setSeat(data?.seatNumber ?? null);
      setState("yours");
      router.refresh();
    } catch {
      setError("The gift could not be claimed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (state === "yours") return <div role="status" className="mt-6 rounded-xl border border-velocity/60 bg-velocity/10 p-5">
    <p className="flex items-center gap-2 text-lg font-bold text-velocity"><Check className="h-5 w-5" aria-hidden="true" />It’s yours{seat ? `: spot #${seat}` : ""}</p>
    <p className="mt-1 text-sm text-text-secondary">You’re on the guest list. On the day, show the check-in QR on the back of your .fit ID.</p>
    <Link href="/account" className="button-primary mt-4 inline-flex">Show my .fit ID</Link>
  </div>;
  if (state !== "open") return <p role="status" className="mt-6 rounded-xl border border-border-strong bg-surface-elevated p-4 text-sm text-text-secondary">{closedCopy[state]}</p>;
  if (!signedIn) return <div className="mt-6">
    <Link href={`/login?callbackUrl=${back}`} className="button-primary inline-flex w-full justify-center sm:w-auto"><Gift className="h-4 w-4" aria-hidden="true" />Sign in to claim your spot</Link>
    <p className="mt-3 text-sm text-text-secondary">New to NOIDA.FIT? <Link href={`/signup?callbackUrl=${back}`} className="font-semibold text-velocity hover:text-velocity-glow">Create a free account</Link>, then come back to this link.</p>
  </div>;
  return <div className="mt-6">
    <button type="button" onClick={claim} disabled={pending} className="button-primary w-full sm:w-auto">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Gift className="h-4 w-4" aria-hidden="true" />}
      Claim my free spot
    </button>
    <p className="mt-3 text-xs text-text-secondary">No payment needed. One spot per account.</p>
    {error && <p role="alert" className="mt-3 rounded-lg border border-rose-400/60 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
  </div>;
}
