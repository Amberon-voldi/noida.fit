"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeCallbackUrl } from "@/components/auth/validation";

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-white";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, callbackUrl }),
      });
      const data = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }
      window.dispatchEvent(new Event("noidafit:session"));
      router.replace(safeCallbackUrl(data.redirectTo));
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-3 text-center text-2xl font-bold text-white">Sign in to NOIDA.FIT</h1>
      <p className="mb-6 text-center text-sm text-text-secondary">Pick up your plans and find your people.</p>
      <form onSubmit={handleSubmit} aria-busy={loading} aria-describedby={error ? "login-error" : undefined} className="space-y-4">
        {error && <p id="login-error" role="alert" className="text-sm text-rose-400">{error}</p>}
        <div>
          <label htmlFor="email" className="text-sm text-text-secondary">Email</label>
          <input id="email" name="email" type="email" required maxLength={320} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="text-sm text-text-secondary">Password</label>
          <input id="password" name="password" type="password" required minLength={8} maxLength={256} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <button type="submit" disabled={loading} className="min-h-11 w-full rounded-lg bg-velocity px-4 py-3 text-sm font-bold text-background disabled:opacity-50">{loading ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">New here? <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-white underline hover:text-velocity">Create your Fitness ID</Link></p>
      <p className="mt-4 text-center text-sm"><Link href="/discover" className="text-text-secondary underline">Keep exploring without an account</Link></p>
    </>
  );
}
