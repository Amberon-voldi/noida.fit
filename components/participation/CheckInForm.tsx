"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { refreshParticipation } from "./useParticipation";
import { CheckInScanner } from "./CheckInScanner";

interface CheckInFormProps {
  initialToken?: string;
}

function tokenFromInput(value: string): string {
  const input = value.trim();
  if (!input) return "";
  try {
    const parsed = new URL(input);
    if (parsed.pathname !== "/check-in" || parsed.origin !== window.location.origin) throw new Error("Use the signed link from this NOIDA.FIT event.");
    return parsed.searchParams.get("token")?.trim() || "";
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Use the signed")) throw error;
    return input;
  }
}

export function CheckInForm({ initialToken = "" }: CheckInFormProps) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function submitToken(value: string): Promise<void> {
    if (pending) return;
    setPending(true);
    setMessage(null);
    setError(false);
    try {
      const signedToken = tokenFromInput(value);
      if (!signedToken) throw new Error("Paste or scan a signed check-in link first.");
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
      if (!response.ok) throw new Error(data?.error || "Check-in could not be completed. Try again.");
      setMessage(data?.repaired ? "You’re already checked in. Your Fitness ID is up to date." : "You’re checked in. Your participation is now recorded on your Fitness ID.");
      setToken("");
      if (window.location.search) window.history.replaceState(null, "", "/check-in");
      await refreshParticipation();
      router.refresh();
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Check-in could not be completed. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function checkIn(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await submitToken(token);
  }

  return <form onSubmit={checkIn} className="space-y-4">
    <CheckInScanner onToken={value => { setToken(value); void submitToken(value); }} />
    <div>
      <label htmlFor="check-in-token" className="block text-xs font-semibold text-text-secondary">Signed check-in link or token</label>
      <textarea id="check-in-token" value={token} onChange={event => setToken(event.target.value)} required rows={4} maxLength={4096} aria-invalid={error} className="mt-2 w-full resize-y rounded-xl border border-border-strong bg-surface-elevated px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-velocity focus:ring-2 focus:ring-velocity/40" placeholder="Paste the QR link or signed token" />
    </div>
    <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-velocity px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">{pending ? "Checking in…" : "Verify my check-in"}</button>
    {message && <p className={error ? "text-sm text-rose-300" : "text-sm text-velocity"} role={error ? "alert" : "status"} aria-live="polite">{message}</p>}
    {message && !error && <Link href="/account#activity" className="block min-h-11 pt-3 text-sm underline">View my Fitness ID and activity</Link>}
  </form>;
}
