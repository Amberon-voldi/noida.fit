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

export interface SettleEvent { id: string; title: string; priceRupees: number; ticketTypes: { id: string; name: string; price: number }[] }

const field = "min-h-11 min-w-0 rounded-lg border border-border-strong bg-surface-elevated px-3 text-white";

/**
 * Issues the ticket for a PayU payment whose buyer never came back to the site: by its ID when PayU can look it
 * up, else from what the PayU dashboard shows (the buyer's email, the event and ticket type, the amount).
 */
export function SettlePaymentForm({ events }: { events: SettleEvent[] }) {
  const router = useRouter();
  const [payment, setPayment] = useState("");
  const [manual, setManual] = useState(false);
  const [email, setEmail] = useState("");
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const event = events.find(item => item.id === eventId);
  const [tier, setTier] = useState("");
  const type = event?.ticketTypes.find(item => item.id === tier) ?? event?.ticketTypes[0];
  const rupees = type ? type.price : event?.priceRupees ?? 0;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function settle(form: React.FormEvent) {
    form.preventDefault();
    if (!payment.trim() || pending) return;
    setPending(true); setMessage(null);
    const body = manual
      ? { payment: payment.trim(), email: email.trim(), eventId, ...(type ? { tier: type.id } : {}), rupees, reason: `Paid on PayU (${payment.trim()}) but no ticket was issued` }
      : { payment: payment.trim() };
    try {
      const response = await fetch("/api/admin/payments", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => null) as { outcome?: string; error?: string; code?: string; name?: string; seatNumber?: number } | null;
      if (!response.ok || !data?.outcome) {
        if (data?.code === "PAYMENT_NOT_FOUND") setManual(true);
        throw new Error(data?.error || "Could not settle it.");
      }
      setMessage({ ok: data.outcome === "paid", text: `${OUTCOMES[data.outcome] ?? data.outcome}${data.name ? ` ${data.name}, spot #${data.seatNumber}.` : ""}` });
      if (data.outcome === "paid") router.refresh();
    } catch (reason) {
      setMessage({ ok: false, text: reason instanceof Error ? reason.message : "Could not settle it." });
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={settle} className="admin-panel" style={{ display: "grid", gap: 10 }}>
    <label className="admin-note" htmlFor="settle-payment">PayU ID (or transaction ID) of a payment that has no ticket</label>
    <input id="settle-payment" value={payment} onChange={change => setPayment(change.target.value)} autoComplete="off" placeholder="32047411203" className={`${field} font-mono`} />
    {manual && <>
      <p className="admin-note">Issue it from the PayU dashboard: check the payment there shows Success first.</p>
      <input type="email" required value={email} onChange={change => setEmail(change.target.value)} placeholder="Buyer’s account email (as on PayU)" aria-label="Buyer’s account email" className={field} />
      <select value={eventId} onChange={change => { setEventId(change.target.value); setTier(""); }} aria-label="Event" className={field}>{events.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      {event && event.ticketTypes.length > 0 && <select value={type?.id ?? ""} onChange={change => setTier(change.target.value)} aria-label="Ticket type" className={field}>{event.ticketTypes.map(item => <option key={item.id} value={item.id}>{item.name} · ₹{item.price}</option>)}</select>}
      <p className="admin-note">Amount: ₹{rupees}. It must match what PayU shows.</p>
    </>}
    <button type="submit" disabled={pending || !payment.trim() || (manual && !email.trim())} className="button-primary inline-flex items-center justify-center gap-2" style={{ justifySelf: "start" }}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}Issue ticket</button>
    {message && <p role="status" className={message.ok ? "admin-note" : "admin-error"}>{message.text}</p>}
  </form>;
}
