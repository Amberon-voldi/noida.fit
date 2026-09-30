"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
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
    <div className="space-y-2 text-right">
      <button type="button" onClick={signOut} disabled={loading} className="min-h-11 rounded-lg border border-border-strong px-4 text-sm text-text-secondary hover:text-white disabled:opacity-50">
        {loading ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
