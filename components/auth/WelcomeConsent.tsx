"use client";

import { useState } from "react";
import Link from "next/link";

/** The last step for someone new with Google: two separate agreements, then their .fit ID. */
export function WelcomeConsent({ next }: { next: string }) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!terms || !privacy) { setError("Agree to the Terms and Conditions and the Privacy Policy to create your .fit ID."); return; }
    setBusy(true); setError("");
    const response = await fetch("/api/auth/google/consent", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true, callbackUrl: next }) }).catch(() => null);
    const data = await response?.json().catch(() => null) as { redirectTo?: string; error?: string } | null;
    if (!response?.ok) { setBusy(false); setError(data?.error ?? "Your .fit ID couldn’t be created right now. Please try again."); return; }
    window.location.assign(data?.redirectTo ?? "/");
  }

  return <>
    <h1 className="mb-3 text-center text-2xl font-bold text-white">One last step</h1>
    <p className="mb-6 text-center text-sm text-text-secondary">You’re in with Google. Agree to these and we’ll create your .fit ID.</p>
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
      <label className="flex items-start gap-3 text-sm text-white"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} className="mt-1 size-4 accent-[var(--accent-velocity)]" />
        <span>I agree to the <Link href="/terms" className="font-semibold text-velocity underline">Terms and Conditions</Link></span></label>
      <label className="flex items-start gap-3 text-sm text-white"><input type="checkbox" checked={privacy} onChange={event => setPrivacy(event.target.checked)} className="mt-1 size-4 accent-[var(--accent-velocity)]" />
        <span>I agree to the <Link href="/privacy" className="font-semibold text-velocity underline">Privacy Policy</Link></span></label>
      <button type="submit" disabled={busy} className="flex min-h-11 w-full items-center justify-center rounded-full bg-velocity px-4 text-sm font-bold text-slate-950 disabled:opacity-60">{busy ? "Creating your .fit ID…" : "Create my .fit ID"}</button>
    </form>
  </>;
}
