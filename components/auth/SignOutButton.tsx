"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

const VARIANTS = {
  default: { wrap: "space-y-2 text-right", button: "min-h-11 rounded-lg border border-border-strong px-4 text-sm text-text-secondary hover:text-white disabled:opacity-50" },
  pill: { wrap: "shrink-0 space-y-2 text-right", button: "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-border-strong bg-surface px-4 text-sm font-semibold text-white hover:border-rose-400/70 hover:text-rose-300 disabled:opacity-50" },
  menu: { wrap: "space-y-2", button: "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle text-sm font-semibold text-text-secondary hover:border-rose-400/60 hover:text-rose-300 disabled:opacity-50" },
} as const;

export function SignOutButton({ variant = "default" }: { variant?: keyof typeof VARIANTS }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign-out could not be completed. Please retry.");
      window.dispatchEvent(new Event("noidafit:session"));
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sign-out could not be completed. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={VARIANTS[variant].wrap}>
      <button type="button" onClick={signOut} disabled={loading} className={VARIANTS[variant].button}>
        {variant !== "default" && <LogOut size={16} aria-hidden="true" />}
        {loading ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
