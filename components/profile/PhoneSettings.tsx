"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatIndianMobile, normalizeIndianMobile } from "@/lib/phone";

/** The member's own mobile number: kept privately on their account to fill in bookings and payments. */
export function PhoneSettings({ phone }: { phone?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(phone ?? "");
  const [value, setValue] = useState(phone ? formatIndianMobile(phone) : "");
  const [status, setStatus] = useState<"idle" | "saving" | "removing">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const busy = status !== "idle";

  async function send(method: "PUT" | "DELETE") {
    setMessage("");
    setError("");
    const next = method === "PUT" ? normalizeIndianMobile(value) : null;
    if (method === "PUT" && !next) { setError("Enter a 10-digit Indian mobile number."); return; }
    setStatus(method === "PUT" ? "saving" : "removing");
    try {
      const response = await fetch("/api/profile/phone", {
        method,
        headers: { "content-type": "application/json" },
        ...(method === "PUT" ? { body: JSON.stringify({ phone: next }) } : {}),
      });
      const data = await response.json().catch(() => null) as { phone?: string | null; ticketsUpdated?: number; error?: string } | null;
      if (!response.ok) {
        setError(response.status === 401 ? "Your session expired. Sign in again to save your number." : data?.error || "Your number could not be saved.");
        return;
      }
      setSaved(data?.phone ?? "");
      setValue(data?.phone ? formatIndianMobile(data.phone) : "");
      const moved = data?.ticketsUpdated ?? 0;
      setMessage(method === "DELETE" ? "Number removed." : moved ? `Number saved. Your payment link for ${moved === 1 ? "1 unpaid ticket" : `${moved} unpaid tickets`} will come to it on WhatsApp.` : "Number saved.");
      router.refresh();
    } catch {
      setError("Your number could not be saved right now. Please retry.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={event => { event.preventDefault(); if (!busy) void send("PUT"); }} aria-busy={busy} className="space-y-4">
      <fieldset disabled={busy} className="settings-group">
        <legend>Mobile number</legend>
        <div>
          <label htmlFor="settings-phone" className="settings-label">Mobile / WhatsApp number · private</label>
          <input id="settings-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={value} onChange={event => { setValue(event.target.value); setError(""); }} placeholder="98765 43210" aria-invalid={Boolean(error)} aria-describedby={error ? "settings-phone-help settings-phone-error" : "settings-phone-help"} className="settings-input" />
          <p id="settings-phone-help" className="settings-hint mt-1.5">{saved ? "We fill it in when you book or pay for a ticket." : "None saved yet. Add one and we’ll fill it in when you book or pay for a ticket."} Payment links for tickets you haven’t paid yet come to it on WhatsApp. The organizer of a session sees it only when you book a ticket to pay on WhatsApp.</p>
        </div>
      </fieldset>
      {error && <p id="settings-phone-error" role="alert" className="text-sm text-rose-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="settings-save">{status === "saving" ? "Saving…" : "Save number"}</button>
        {saved && <button type="button" onClick={() => { if (!busy) void send("DELETE"); }} disabled={busy} className="button-secondary min-h-11 rounded-full px-5">{status === "removing" ? "Removing…" : "Remove"}</button>}
        <p role="status" aria-live="polite" className="text-sm text-velocity">{message}</p>
      </div>
    </form>
  );
}
