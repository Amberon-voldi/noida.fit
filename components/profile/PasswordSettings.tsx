"use client";

import { useState } from "react";

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-white";

/** Set a password (joined with Google) or change it, so email sign-in works too. */
export function PasswordSettings({ hasPassword }: { hasPassword: boolean }) {
  const [has, setHas] = useState(hasPassword);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<{ busy: boolean; message: string; error: boolean }>({ busy: false, message: "", error: false });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState({ busy: true, message: "", error: false });
    const response = await fetch("/api/profile/password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...(has ? { currentPassword: current } : {}) }) }).catch(() => null);
    const data = await response?.json().catch(() => null) as { error?: string } | null;
    if (!response?.ok) { setState({ busy: false, message: data?.error ?? "Your password couldn’t be saved. Try again.", error: true }); return; }
    setHas(true); setCurrent(""); setPassword("");
    setState({ busy: false, message: has ? "Password changed." : "Password set. You can now also sign in with your email.", error: false });
  }

  return <form onSubmit={submit} className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4">
    <div>
      <h3 className="text-base font-semibold text-white">{has ? "Change password" : "Set a password"}</h3>
      <p className="mt-1 text-sm text-text-secondary">{has ? "Use your current password to choose a new one." : "You joined with Google. Add a password to also sign in with your email."}</p>
    </div>
    {has && <label className="block text-sm text-text-secondary">Current password
      <input type="password" autoComplete="current-password" required value={current} onChange={event => setCurrent(event.target.value)} className={inputClass} /></label>}
    <label className="block text-sm text-text-secondary">{has ? "New password" : "Password"}
      <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} className={inputClass} /></label>
    <p className="text-xs text-text-secondary">At least 8 characters, including a letter and a number.</p>
    {state.message && <p role="status" className={`text-sm ${state.error ? "text-rose-400" : "text-velocity"}`}>{state.message}</p>}
    <button type="submit" disabled={state.busy} className="min-h-11 rounded-full bg-velocity px-5 text-sm font-bold text-slate-950 disabled:opacity-60">{state.busy ? "Saving…" : has ? "Change password" : "Set password"}</button>
  </form>;
}
