"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

/** Creates the page metrics tables, then reloads the page to show them. */
export function MetricsSetupButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function setup() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/metrics", { method: "POST", credentials: "include" });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not switch it on.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not switch it on.");
    } finally {
      setPending(false);
    }
  }
  return <div>
    <button type="button" onClick={setup} disabled={pending} className="button-primary inline-flex items-center gap-2">{pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}Turn on page analytics</button>
    {error && <p role="alert" className="admin-error" style={{ marginTop: 8 }}>{error}</p>}
  </div>;
}
