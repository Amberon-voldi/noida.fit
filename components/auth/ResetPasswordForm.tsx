"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { AuthSubmitButton, type AuthSubmitStatus } from "./AuthSubmitButton";

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-white";

export function ResetPasswordForm({ userId, secret }: { userId: string; secret: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [status, setStatus] = useState<AuthSubmitStatus>("idle");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "idle") return;
    setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { setError("Use at least 8 characters, including a letter and number."); return; }
    setStatus("submitting");
    try {
      const response = await fetch("/api/auth/recovery/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, secret, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string; code?: string };
        setExpired(data.code === "RECOVERY_LINK_INVALID");
        setError(data.error || "Your password couldn't be reset. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Your password couldn't be reset. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  if (done) {
    return <div className="text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-velocity/40 text-velocity"><CircleCheck size={22} aria-hidden="true" /></span>
      <h1 className="mb-3 text-2xl font-bold text-white">Password updated</h1>
      <p role="status" className="text-sm text-text-secondary">Sign in with your new password to pick up where you left off.</p>
      <Link href="/login" className="button-primary mt-6 w-full">Sign in</Link>
    </div>;
  }

  return (
    <>
      <h1 className="mb-3 text-center text-2xl font-bold text-white">Set a new password</h1>
      <p className="mb-6 text-center text-sm text-text-secondary">Choose a password you haven&apos;t used here before.</p>
      <form onSubmit={handleSubmit} aria-busy={status !== "idle"} className="space-y-4">
        {error && <p id="reset-error" role="alert" className="text-sm text-rose-400">{error}{expired && <> <Link href="/forgot-password" className="text-white underline hover:text-velocity">Send a new link</Link></>}</p>}
        <div>
          <label htmlFor="new-password" className="text-sm text-text-secondary">New password</label>
          <input id="new-password" name="password" type="password" required minLength={8} maxLength={256} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "new-password-help reset-error" : "new-password-help"} className={inputClass} />
          <p id="new-password-help" className="mt-1 text-xs text-text-secondary">At least 8 characters, including a letter and number.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="text-sm text-text-secondary">Confirm new password</label>
          <input id="confirm-password" name="confirm" type="password" required minLength={8} maxLength={256} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "reset-error" : undefined} className={inputClass} />
        </div>
        <AuthSubmitButton status={status} label="Update password" submittingLabel="Updating…" />
      </form>
    </>
  );
}
