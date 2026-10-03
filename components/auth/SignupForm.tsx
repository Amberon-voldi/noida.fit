"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeCallbackUrl, signupSchema, USERNAME_PATTERN } from "@/components/auth/validation";
import { AuthSubmitButton, type AuthSubmitStatus } from "./AuthSubmitButton";

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-white";

export function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AuthSubmitStatus>("idle");
  const loading = status !== "idle";

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (!signupSchema.safeParse({ ...form, callbackUrl }).success) {
      setError("Check your details. Your username must start and end with a letter or number. Your password needs at least 8 characters, a letter and a number.");
      return;
    }
    setStatus("submitting");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, callbackUrl }),
      });
      const data = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(data.error || "Unable to create your account.");
        setStatus("idle");
        return;
      }
      // Keep the spinner through the route transition, not just the API request.
      setStatus("redirecting");
      window.dispatchEvent(new Event("noidafit:session"));
      router.replace(safeCallbackUrl(data.redirectTo));
      router.refresh();
    } catch {
      setError("Unable to create your account right now. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <>
      <h1 className="mb-3 text-center text-2xl font-bold text-white">Create your Fitness ID</h1>
      <p className="mb-6 text-center text-sm text-text-secondary">Save plans and follow local communities. Your profile starts private.</p>
      <form onSubmit={handleSubmit} aria-busy={loading} aria-describedby={error ? "signup-error" : undefined} className="space-y-4">
        {error && <p id="signup-error" role="alert" className="text-sm text-rose-400">{error}</p>}
        <div>
          <label htmlFor="name" className="text-sm text-text-secondary">Display name</label>
          <input id="name" name="name" type="text" required minLength={2} maxLength={128} autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="username" className="text-sm text-text-secondary">Username</label>
          <input id="username" name="username" type="text" required minLength={3} maxLength={40} pattern={USERNAME_PATTERN} aria-describedby="username-help" autoComplete="username" autoCapitalize="none" spellCheck={false} value={form.username} onChange={(e) => update("username", e.target.value.toLowerCase())} placeholder="your-handle" className={inputClass} />
          <p id="username-help" className="mt-1 text-xs text-text-secondary">3–40 characters. Start and end with a letter or number; dots, hyphens and underscores are allowed inside.</p>
        </div>
        <div>
          <label htmlFor="signup-email" className="text-sm text-text-secondary">Email</label>
          <input id="signup-email" name="email" type="email" required maxLength={320} autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="signup-password" className="text-sm text-text-secondary">Password</label>
          <input id="signup-password" name="password" type="password" required minLength={8} maxLength={256} aria-describedby="password-help" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className={inputClass} />
          <p id="password-help" className="mt-1 text-xs text-text-secondary">At least 8 characters, including a letter and number.</p>
        </div>
        <AuthSubmitButton status={status} label="Create Fitness ID" submittingLabel="Creating your Fitness ID…" />
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">Already registered? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-white underline hover:text-velocity">Sign in</Link></p>
      <p className="mt-4 text-center text-sm"><Link href="/discover" className="text-text-secondary underline">Keep exploring without an account</Link></p>
    </>
  );
}
