"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

const OUTCOMES: Record<string, string> = {
  paid: "Ticket issued: it’s on the guest list now.",
  pending: "PayU hasn’t captured this payment yet. Try again later.",
  failed: "PayU says this payment failed, so no ticket was issued.",
  refund: "The money came in but no ticket could take it (already paid, or the event is full). Refund it from PayU.",
};

/** Issues the ticket for a PayU payment whose buyer never came back to the site. */
export function SettlePaymentForm() {
  const router = useRouter();
  const [payment, setPayment] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function settle(form: React.FormEvent) {
    form.preventDefault();
    if (!payment.trim() || pending) return;
    setPending(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/payments", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payment: payment.trim() }) });
      const data = await response.json().catch(() => null) as { outcome?: string; error?: string } | null;
      if (!response.ok || !data?.outcome) throw new Error(data?.error || "Could not settle it.");
      setMessage({ ok: data.outcome === "paid", text: OUTCOMES[data.outcome] ?? data.outcome });
      if (data.outcome === "paid") router.refresh();
    } catch (reason) {
      setMessage({ ok: false, text: reason instanceof Error ? reason.message : "Could not settle it." });
    } finally {
      setPending(false);
    }
  }
  return <form onSubmit={settle} className="admin-panel" style={{ display: "grid", gap: 10 }}>
    <label className="admin-note" htmlFor="settle-payment">PayU ID (or transaction ID) of a payment that has no ticket</label>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input id="settle-payment" value={payment} onChange={change => setPayment(change.target.value)} inputMode="text" autoComplete="off" placeholder="32047411203" className="min-h-11 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-elevated px-3 font-mono text-white" />
      <button type="submit" disabled={pending || !payment.trim()} className="button-primary inline-flex items-center gap-2">{pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}Issue ticket</button>
    </div>
    {message && <p role="status" className={message.ok ? "admin-note" : "admin-error"}>{message.text}</p>}
  </form>;
}
