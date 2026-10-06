"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { participantQrValue } from "@/lib/check-in-qr";

export interface ParticipantPass { token: string; expiresAt: string; }
interface Props { initialPass: ParticipantPass | null; displayName: string; fitnessId: string; initialError?: string; }

/** Participants SHOW a short-lived QR. Camera/attendance writes belong only to authorized operators. */
export function CheckInForm({ initialPass, displayName, fitnessId, initialError = "" }: Props) {
  const router = useRouter();
  const [pass, setPass] = useState(initialPass);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!pass) return;
    const timeout = window.setTimeout(() => setExpired(true), Math.max(0, Date.parse(pass.expiresAt) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [pass]);

  async function refresh() {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/check-in/pass", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (response.status === 401) { router.push("/login?callbackUrl=/check-in"); return; }
      const data = await response.json().catch(() => null) as (ParticipantPass & { error?: string }) | null;
      if (!response.ok || !data?.token || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error(data?.error || "Your check-in QR could not be refreshed. Try again.");
      setPass({ token: data.token, expiresAt: data.expiresAt }); setExpired(false);
      setMessage("New check-in QR ready. Show it to the club or venue operator.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your QR could not be refreshed."); }
    finally { setPending(false); }
  }

  return <section className="min-w-0 space-y-4" aria-label="Your participant check-in QR">
    <div><h2 className="break-words text-xl font-bold text-white">{displayName}</h2><p className="mt-1 font-mono text-xs text-text-secondary">Fitness ID · {fitnessId}</p></div>
    {pass && !expired ? <>
      <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-4"><QRCodeSVG value={participantQrValue(pass.token)} size={240} marginSize={4} bgColor="#ffffff" fgColor="#090a0f" className="h-auto max-w-full" role="img" aria-label="Your participant check-in QR code" /></div>
      <p className="text-sm text-text-secondary">Valid until <time dateTime={pass.expiresAt}>{new Date(pass.expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time>.</p>
      <details className="rounded-lg border border-border-subtle px-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-velocity">Operator camera unavailable?</summary><p className="mb-3 text-xs leading-relaxed text-text-secondary">The operator can paste this code into their attendance desk. Do not post it publicly.</p><label className="block pb-3 text-sm">Participant check-in code<textarea readOnly rows={4} value={participantQrValue(pass.token)} onFocus={event => event.target.select()} className="mt-2 w-full min-w-0 rounded-lg border border-border-strong bg-surface-elevated p-3 font-mono text-xs text-white" /></label></details>
    </> : <p className="rounded-lg border border-border-strong p-4 text-sm text-text-secondary" role="status">{expired ? "Your QR has expired. Refresh it before the operator scans." : "Your check-in QR is not available yet."}</p>}
    <button type="button" onClick={() => void refresh()} disabled={pending} className="button-primary min-h-11 px-4">{pending ? "Refreshing…" : pass ? "Refresh my check-in QR" : "Create my check-in QR"}</button>
    {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}{message && <p className="text-sm text-velocity" role="status">{message}</p>}
    <p className="text-sm leading-relaxed text-text-secondary">The club or venue operator scans this QR for the selected event. You still need a confirmed RSVP. Showing a QR alone does not record attendance or make your profile public.</p>
    <Link href="/account#passport" className="inline-flex min-h-11 items-center text-sm font-semibold text-velocity">View my participation</Link>
  </section>;
}
