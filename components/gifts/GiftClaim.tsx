"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, LoaderCircle, Ticket } from "lucide-react";
import { TicketConfirmation, type BookedTicket } from "@/components/participation/TicketConfirmation";
import { seeYouLabel } from "@/lib/calendar";
import { normalizeIndianMobile } from "@/lib/phone";
import type { GiftState } from "@/lib/services/gifts";

const closedCopy: Record<Exclude<GiftState, "open" | "yours">, string> = {
  going: "You already have a spot at this session, so this gift stays free for someone else.",
  used: "This gift has already been claimed.",
  full: "This session is full right now, so the gift can’t be claimed.",
  closed: "This session has started, ended or been cancelled, so the gift can’t be claimed.",
  revoked: "The organizer has switched off this gift link.",
};
/** Server codes that settle what the page should say instead of the claim form. */
const settledBy = { ALREADY_GOING: "going", GIFT_USED: "used", EVENT_FULL: "full", EVENT_STARTED: "closed", EVENT_UNAVAILABLE: "closed", GIFT_REVOKED: "revoked" } as const;
const field = "mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-[15px] text-white transition-colors hover:border-border-strong focus:border-velocity focus:outline-none";

/** The guest pass this device claimed from a gift link, so coming back to the link finds it again. */
const passKey = (giftId: string) => `noidafit:gift-pass:${giftId}`;
function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
function savedPass(giftId: string): string | null {
  try {
    const value = window.localStorage.getItem(passKey(giftId));
    return value && /^p[A-Za-z0-9_-]{24}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

interface Props {
  giftId: string;
  initialState: GiftState;
  signedIn: boolean;
  /** The organizer lets people claim with a mobile number instead of an account. */
  allowGuests: boolean;
  /** The guest the organizer named and gave a number for: they claim with one tap. */
  preset?: { name: string; phoneEnding: string };
  /** How many people the link admits: others may come along with the named guest. */
  spots: number;
  ticket: Omit<BookedTicket, "countdown" | "seatNumber">;
}

/** Claim a gift link's free spot: one tap once signed in, or a mobile number (one tap if the organizer gave it) where the organizer allows guests. */
export function GiftClaim({ giftId, initialState, signedIn, allowGuests, preset, spots, ticket }: Props) {
  const router = useRouter();
  const formId = useId();
  const [state, setState] = useState(initialState);
  const [seat, setSeat] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState<BookedTicket | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [ownNumber, setOwnNumber] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const pass = useSyncExternalStore(subscribeStorage, () => savedPass(giftId), () => null);
  const back = encodeURIComponent(`/gift/${giftId}`);

  /** Shared handling for both ways of claiming. Returns the parsed body on success. */
  async function post<T>(path: string, body?: unknown): Promise<T | null> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/gifts/${encodeURIComponent(giftId)}/${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (response.status === 401) { router.push(`/login?callbackUrl=${back}`); return null; }
      const data = await response.json().catch(() => null) as (T & { error?: string; code?: string }) | null;
      if (!response.ok) {
        const settled = settledBy[(data?.code ?? "") as keyof typeof settledBy];
        if (settled) setState(settled);
        else if (data?.code === "PHONE_INVALID") setPhoneError(data.error ?? "Enter a 10-digit Indian mobile number");
        else setError(data?.error || "The gift could not be claimed. Try again.");
        return null;
      }
      return data;
    } catch {
      setError("The gift could not be claimed. Check your connection and try again.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function claim(): Promise<void> {
    const data = await post<{ seatNumber?: number }>("claim");
    if (!data) return;
    setSeat(data.seatNumber ?? null);
    setState("yours");
    setCelebrate({ ...ticket, seatNumber: data.seatNumber, countdown: seeYouLabel(ticket.date, ticket.startTime) });
    router.refresh();
  }

  /** The pass is named from the link, so a guest only ever gives a number, and none when the organizer did. */
  async function claimAsGuest(form?: React.FormEvent): Promise<void> {
    form?.preventDefault();
    const typed = !preset || ownNumber;
    if (typed && !normalizeIndianMobile(phone)) { setPhoneError("Enter a 10-digit Indian mobile number"); return; }
    const data = await post<{ passId?: string }>("guest", typed ? { phone } : {});
    if (!data?.passId) return;
    try { window.localStorage.setItem(passKey(giftId), data.passId); } catch { /* The pass page is still the ticket. */ }
    router.push(`/pass/${data.passId}?claimed=1`);
  }

  if (state === "yours") return <>
    {celebrate && <TicketConfirmation ticket={celebrate} onClose={() => setCelebrate(null)} />}
    <div role="status" className="mt-6 rounded-xl border border-velocity/60 bg-velocity/10 p-5">
      <p className="flex items-center gap-2 text-lg font-bold text-velocity"><Check className="h-5 w-5" aria-hidden="true" />It’s yours{seat ? `: spot #${seat}` : ""}</p>
      <p className="mt-1 text-sm text-text-secondary">You’re on the guest list. On the day, show the check-in QR on the back of your .fit ID.</p>
      <Link href="/account" className="button-primary mt-4 inline-flex">Show my .fit ID</Link>
    </div>
  </>;
  // Claimed as a guest on this device earlier.
  if (!signedIn && pass) return <div role="status" className="mt-6 rounded-xl border border-velocity/60 bg-velocity/10 p-5">
    <p className="flex items-center gap-2 text-lg font-bold text-velocity"><Check className="h-5 w-5" aria-hidden="true" />You’ve claimed this gift</p>
    <p className="mt-1 text-sm text-text-secondary">Your guest pass has the QR to show at the door.</p>
    <Link href={`/pass/${pass}`} className="button-primary mt-4 inline-flex"><Ticket className="h-4 w-4" aria-hidden="true" />Open my guest pass</Link>
  </div>;
  if (state !== "open") return <p role="status" className="mt-6 rounded-xl border border-border-strong bg-surface-elevated p-4 text-sm text-text-secondary">{closedCopy[state]}</p>;
  const signInInstead = <p className="mt-3 text-sm text-text-secondary">On NOIDA.FIT? <Link href={`/login?callbackUrl=${back}`} className="font-semibold text-velocity hover:text-velocity-glow">Sign in</Link> to claim it on your .fit ID instead.</p>;
  const failed = error && <p role="alert" className="mt-3 rounded-lg border border-rose-400/60 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>;
  const claimButton = (type: "button" | "submit", disabled: boolean) => <button type={type} onClick={type === "button" ? () => void claimAsGuest() : undefined} disabled={disabled} className="button-primary w-full sm:w-auto">
    {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Gift className="h-4 w-4" aria-hidden="true" />}
    Claim my free spot
  </button>;
  // The organizer gave the guest's number: nothing to fill in.
  if (!signedIn && allowGuests && preset && !ownNumber) return <div className="mt-5 sm:mt-6">
    <p className="mb-3 text-sm text-text-secondary">Held for <span className="font-semibold text-white">{preset.name}</span> · mobile ending {preset.phoneEnding}</p>
    {claimButton("button", pending)}
    <p className="mt-3 text-xs text-text-secondary">One tap: no account, form or payment. You’ll get a guest pass with a QR for the door.</p>
    <p className="mt-3 text-sm text-text-secondary">{spots > 1 ? "Coming along, or on a different number?" : "Not your number?"} <button type="button" onClick={() => setOwnNumber(true)} className="min-h-11 font-semibold text-velocity hover:text-velocity-glow">Use your mobile number</button></p>
    {signInInstead}
    {failed}
  </div>;
  if (!signedIn && allowGuests) return <form onSubmit={claimAsGuest} noValidate className="mt-5 sm:mt-6">
    <label htmlFor={`${formId}-phone`} className="block text-sm font-semibold text-white">Your mobile number</label>
    <input id={`${formId}-phone`} type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={change => { setPhone(change.target.value); setPhoneError(null); }} readOnly={pending} placeholder="98XXXXXXX" aria-invalid={Boolean(phoneError)} aria-describedby={`${formId}-phone-hint`} className={`${field} sm:max-w-xs`} />
    <p id={`${formId}-phone-hint`} className={`mt-1.5 text-xs ${phoneError ? "text-rose-200" : "text-text-secondary"}`}>{phoneError ?? `Only ${ticket.communityName ?? "the organizer"} sees it.`}</p>
    <div className="mt-4">{claimButton("submit", pending || !phone.trim())}</div>
    <p className="mt-3 text-xs text-text-secondary">No account or payment needed. You’ll get a guest pass with a QR for the door.</p>
    {signInInstead}
    {failed}
  </form>;
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
