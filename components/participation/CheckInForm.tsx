"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { refreshParticipation } from "./useParticipation";

interface CheckInFormProps {
  initialToken?: string;
}

export function CheckInForm({ initialToken = "" }: CheckInFormProps) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function checkIn(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(false);
    try {
      let signedToken = token.trim();
      try {
        const parsed = new URL(signedToken);
        signedToken = parsed.searchParams.get("token") || signedToken;
      } catch {
        // The field may contain the token itself rather than a full URL.
      }
      const response = await fetch("/api/check-in", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: signedToken }),
      });
      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const data = await response.json().catch(() => null) as { eventId?: string; repaired?: boolean; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Check-in could not be completed");
      setMessage(data?.repaired ? "You're already checked in. Your Fitness ID is up to date." : "You're checked in. Your participation is now recorded on your Fitness ID.");
      await refreshParticipation();
      router.refresh();
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Check-in could not be completed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={checkIn} className="space-y-4">
      <div>
        <label htmlFor="check-in-token" className="block text-xs font-semibold text-text-secondary">Signed check-in link or token</label>
        <textarea id="check-in-token" value={token} onChange={(event) => setToken(event.target.value)} required rows={4} maxLength={4096} className="mt-2 w-full resize-y rounded-xl border border-border-strong bg-surface-elevated px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-velocity" placeholder="Paste the QR link or signed token" />
      </div>
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-velocity px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">{pending ? "Checking in…" : "Verify my check-in"}</button>
      {message && <p className={error ? "text-sm text-rose-300" : "text-sm text-velocity"} role={error ? "alert" : "status"} aria-live="polite">{message}</p>}
      {message && !error && <Link href="/account#activity" className="block text-sm underline">View my Fitness ID and activity</Link>}
    </form>
  );
}
