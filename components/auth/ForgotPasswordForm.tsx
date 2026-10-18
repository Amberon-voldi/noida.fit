"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthSubmitButton, type AuthSubmitStatus } from "./AuthSubmitButton";

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-white";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AuthSubmitStatus>("idle");
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "idle") return;
    setError("");
    setStatus("submitting");
    try {
      const response = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setError(data.error || "We couldn't send a reset link. Please try again.");
        return;
      }
      setSentTo(email.trim());
    } catch {
      setError("We couldn't send a reset link. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  if (sentTo) {
    return <div className="text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-velocity/40 text-velocity"><MailCheck size={22} aria-hidden="true" /></span>
      <h1 className="mb-3 text-2xl font-bold text-white">Check your inbox</h1>
      <p role="status" className="text-sm leading-relaxed text-text-secondary">If an account exists for <strong className="text-white">{sentTo}</strong>, we&apos;ve sent a link to reset your password. It works for 1 hour.</p>
      <p className="mt-4 text-xs text-text-secondary">Nothing there? Check spam, or <button type="button" onClick={() => setSentTo("")} className="inline-flex min-h-11 items-center text-white underline hover:text-velocity">try another email</button>.</p>
      <p className="mt-4 text-sm"><Link href="/login" className="inline-flex min-h-11 items-center text-white underline hover:text-velocity">Back to sign in</Link></p>
    </div>;
  }

  return (
    <>
      <h1 className="mb-3 text-center text-2xl font-bold text-white">Forgot your password?</h1>
      <p className="mb-6 text-center text-sm text-text-secondary">Enter the email you signed up with and we&apos;ll send you a reset link.</p>
      <form onSubmit={handleSubmit} aria-busy={status !== "idle"} className="space-y-4">
        {error && <p id="recovery-error" role="alert" className="text-sm text-rose-400">{error}</p>}
        <div>
          <label htmlFor="recovery-email" className="text-sm text-text-secondary">Email</label>
          <input id="recovery-email" name="email" type="email" required maxLength={320} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "recovery-error" : undefined} className={inputClass} />
        </div>
        <AuthSubmitButton status={status} label="Send reset link" submittingLabel="Sending…" />
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">Remembered it? <Link href="/login" className="text-white underline hover:text-velocity">Sign in</Link></p>
    </>
  );
}
