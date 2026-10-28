"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, LoaderCircle } from "lucide-react";

type Status = "verifying" | "done" | "expired" | "failed";

export function VerifyEmail({ userId, secret }: { userId: string; secret: string }) {
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState("");
  const started = useRef(false);

  async function verify() {
    setStatus("verifying");
    setError("");
    try {
      const response = await fetch("/api/auth/verification/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, secret }),
      });
      if (response.ok) { setStatus("done"); return; }
      const data = await response.json().catch(() => ({})) as { error?: string; code?: string };
      setStatus(data.code === "VERIFICATION_LINK_INVALID" ? "expired" : "failed");
      setError(data.error || "Your email couldn't be verified. Please try again.");
    } catch {
      setStatus("failed");
      setError("Your email couldn't be verified. Please try again.");
    }
  }

  // The link is single-use: confirm once, even when effects run twice in development.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "verifying") {
    return <div className="text-center" aria-busy="true">
      <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-velocity" aria-hidden="true" />
      <h1 role="status" className="text-2xl font-bold text-white">Verifying your email…</h1>
    </div>;
  }

  if (status === "done") {
    return <div className="text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-velocity/40 text-velocity"><CircleCheck size={22} aria-hidden="true" /></span>
      <h1 className="mb-3 text-2xl font-bold text-white">Email verified</h1>
      <p role="status" className="text-sm text-text-secondary">You can now RSVP, save, follow and check in.</p>
      <Link href="/account" className="button-primary mt-6 w-full">Go to my account</Link>
    </div>;
  }

  return <div className="text-center">
    <h1 className="mb-3 text-2xl font-bold text-white">{status === "expired" ? "This link has expired" : "Verification failed"}</h1>
    <p role="alert" className="text-sm text-text-secondary">{error}</p>
    {status === "expired"
      ? <Link href="/account" className="button-primary mt-6 w-full">Send a new link from my account</Link>
      : <button type="button" onClick={() => void verify()} className="button-primary mt-6 w-full">Try again</button>}
  </div>;
}
