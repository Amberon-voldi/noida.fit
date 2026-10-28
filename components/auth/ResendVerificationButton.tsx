"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResendVerificationButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function resend() {
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/auth/verification", { method: "POST" });
      const data = await response.json().catch(() => ({})) as { error?: string; verified?: boolean };
      if (!response.ok) throw new Error(data.error || "The email couldn't be sent. Please try again.");
      // Verified in another tab: refresh so the banner goes away.
      if (data.verified) { router.refresh(); return; }
      setStatus("sent");
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "The email couldn't be sent. Please try again.");
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-1">
      <button type="button" onClick={resend} disabled={status !== "idle"} className="button-secondary px-3 text-xs disabled:opacity-60">
        {status === "sending" ? "Sending…" : status === "sent" ? "Email sent" : "Resend email"}
      </button>
      <p role="status" className="text-xs text-text-secondary">{status === "sent" ? "Check your inbox and spam folder." : ""}</p>
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
