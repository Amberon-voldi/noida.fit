"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { emailLookupSchema, signupSchema } from "@/components/auth/validation";
import { navigateAfterAuth } from "./navigation";
import { AuthSubmitButton, type AuthSubmitStatus } from "./AuthSubmitButton";

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-white";

/** "email" asks who they are; an email with an account goes on to "signin", any other to "signup". */
type Step = "email" | "signin" | "signup";

const COPY: Record<Step, { title: string; lede: string; label: string; submittingLabel: string }> = {
  email: { title: "Sign in or join NOIDA.FIT", lede: "Enter your email. New here? We’ll set up your .fit ID next.", label: "Continue", submittingLabel: "Checking…" },
  signin: { title: "Welcome back", lede: "Enter your password to pick up your plans.", label: "Sign in", submittingLabel: "Signing in…" },
  signup: { title: "Create your .fit ID", lede: "Save plans and follow local communities. Your profile starts private.", label: "Create .fit ID", submittingLabel: "Creating your .fit ID…" },
};

/** One form for both: the email first, then the password to sign in, or the details to create an account. */
export function AuthForm({ callbackUrl, googleError = false }: { callbackUrl: string; googleError?: boolean }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Both start unchecked; members opt in to each separately.
  const [consent, setConsent] = useState({ acceptTerms: false, acceptPrivacy: false });
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AuthSubmitStatus>("idle");
  const emailRef = useRef<HTMLInputElement>(null);
  const loading = status !== "idle";
  const copy = COPY[step];

  function changeEmail() {
    flushSync(() => { setStep("email"); setPassword(""); setError(""); });
    emailRef.current?.focus();
  }

  async function lookUp() {
    const parsed = emailLookupSchema.safeParse({ email });
    if (!parsed.success) { setError("Enter a valid email address."); return; }
    setStatus("submitting");
    try {
      const response = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email }),
      });
      const data = await response.json() as { exists?: unknown; error?: string };
      if (!response.ok || typeof data.exists !== "boolean") { setError(data.error || "Unable to continue right now. Please try again."); return; }
      setEmail(parsed.data.email);
      setStep(data.exists ? "signin" : "signup");
    } catch {
      setError("Unable to continue right now. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  async function authenticate(path: string, body: Record<string, unknown>, failed: string, offline: string) {
    setStatus("submitting");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(data.error || failed);
        setStatus("idle");
        return;
      }
      // Stay busy until the new page replaces this one.
      // Show "Opening your page…" before the browser starts loading the next page.
      flushSync(() => setStatus("redirecting"));
      window.dispatchEvent(new Event("noidafit:session"));
      navigateAfterAuth(data.redirectTo);
    } catch {
      setError(offline);
      setStatus("idle");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (step === "email") return lookUp();
    if (step === "signin") return authenticate("/api/auth/login", { email, password, callbackUrl }, "Invalid email or password.", "Unable to sign in right now. Please try again.");
    if (!consent.acceptTerms || !consent.acceptPrivacy) {
      setError("Agree to the Terms and Conditions and the Privacy Policy to create your .fit ID.");
      return;
    }
    const details = { name, email, password };
    if (!signupSchema.safeParse({ ...details, ...consent, callbackUrl }).success) {
      setError("Check your details. Use your name, and a password with at least 8 characters including a letter and a number.");
      return;
    }
    return authenticate("/api/auth/signup", { ...details, ...consent, callbackUrl }, "Unable to create your account.", "Unable to create your account right now. Please try again.");
  }

  const describedBy = (...ids: Array<string | false>) => [...ids, error && "auth-error"].filter(Boolean).join(" ") || undefined;

  return (
    <>
      <h1 className="mb-3 text-center text-2xl font-bold text-white">{copy.title}</h1>
      <p className="mb-6 text-center text-sm text-text-secondary">{copy.lede}</p>
      {step === "email" && <>
        {googleError && <p role="alert" className="mb-4 text-sm text-rose-400">Google sign-in didn’t finish. Try again, or use your email.</p>}
        <a href={`/api/auth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
          <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</a>
        <p className="mt-2 text-center text-xs text-text-secondary">By continuing with Google, you agree to the <Link href="/terms" target="_blank" className="underline hover:text-white">Terms</Link> and <Link href="/privacy" target="_blank" className="underline hover:text-white">Privacy Policy</Link>.</p>
        <div className="my-5 flex items-center gap-3 text-xs text-text-secondary"><span className="h-px flex-1 bg-border-subtle" />or use your email<span className="h-px flex-1 bg-border-subtle" /></div>
      </>}
      <form onSubmit={handleSubmit} aria-busy={loading} aria-describedby={describedBy()} className="space-y-4">
        {error && <p id="auth-error" role="alert" className="text-sm text-rose-400">{error}</p>}
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="email" className="text-sm text-text-secondary">Email</label>
            {step !== "email" && <button type="button" onClick={changeEmail} disabled={loading} className="inline-flex min-h-11 items-center text-xs font-semibold text-velocity hover:text-velocity-glow hover:underline">Change</button>}
          </div>
          <input ref={emailRef} id="email" name="email" type="email" inputMode="email" required maxLength={320} autoComplete="email" autoCapitalize="none" spellCheck={false} readOnly={step !== "email"} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={step === "email" && Boolean(error)} aria-describedby={describedBy()} className={`${inputClass.replace("mt-1 ", "")} read-only:border-border-subtle read-only:text-text-secondary`} />
        </div>
        {step === "signup" && <div>
          <label htmlFor="name" className="text-sm text-text-secondary">Your name</label>
          <input id="name" name="name" type="text" required minLength={2} maxLength={128} autoComplete="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy("name-help")} className={inputClass} />
          <p id="name-help" className="mt-1 text-xs text-text-secondary">We’ll make your username from this. You can change it any time in Settings.</p>
        </div>}
        {step !== "email" && <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm text-text-secondary">Password</label>
            {step === "signin" && <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-xs font-semibold text-velocity hover:text-velocity-glow hover:underline">Forgot password?</Link>}
          </div>
          <div className="relative">
            <input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={8} maxLength={256} autoComplete={step === "signin" ? "current-password" : "new-password"} autoFocus={step === "signin"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy(step === "signup" && "password-help")} className={`${inputClass.replace("mt-1 ", "")} pr-12`} />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword} aria-controls="password" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-text-secondary hover:text-white focus-visible:outline-2 focus-visible:outline-velocity">
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          {step === "signup" && <p id="password-help" className="mt-1 text-xs text-text-secondary">At least 8 characters, including a letter and number.</p>}
        </div>}
        {step === "signup" && <fieldset className="space-y-3">
          <legend className="sr-only">Agreements</legend>
          <label className="flex items-start gap-3 text-sm text-text-secondary">
            <input type="checkbox" name="acceptTerms" required checked={consent.acceptTerms} onChange={(e) => setConsent((current) => ({ ...current, acceptTerms: e.target.checked }))} className="size-5 shrink-0 accent-velocity" />
            <span>I agree to the <Link href="/terms" target="_blank" className="text-white underline hover:text-velocity">Terms and Conditions</Link></span>
          </label>
          <label className="flex items-start gap-3 text-sm text-text-secondary">
            <input type="checkbox" name="acceptPrivacy" required checked={consent.acceptPrivacy} onChange={(e) => setConsent((current) => ({ ...current, acceptPrivacy: e.target.checked }))} className="size-5 shrink-0 accent-velocity" />
            <span>I have read and agree to the <Link href="/privacy" target="_blank" className="text-white underline hover:text-velocity">Privacy Policy</Link></span>
          </label>
        </fieldset>}
        <AuthSubmitButton status={status} label={copy.label} submittingLabel={copy.submittingLabel} />
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/discover" className="text-text-secondary underline">Keep exploring without an account</Link></p>
    </>
  );
}
