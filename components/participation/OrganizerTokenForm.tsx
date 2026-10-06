"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { CheckInWindowState } from "@/types/organizer";

export interface OrganizerTokenEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  startsAt?: string;
  endsAt?: string;
  venueName: string;
  sector: string;
  status?: string;
  checkInWindow: CheckInWindowState;
}

function windowLabel(state: CheckInWindowState): string {
  return {
    open: "Check-in is open now",
    "not-open": "Check-in opens 30 minutes before the start",
    closed: "Check-in window has closed",
    cancelled: "This event is cancelled",
    unavailable: "This event is not published",
    invalid: "The event schedule needs review",
  }[state];
}

export function OrganizerTokenForm({ events }: { events: OrganizerTokenEvent[] }) {
  const router = useRouter();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [code, setCode] = useState<{ token: string; expiresAt: string; eventId: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const selectedEvent = events.find(event => event.id === eventId);

  async function createCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setCode(null);
    try {
      const response = await fetch("/api/check-in/organizer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (response.status === 401) {
        router.push("/login?callbackUrl=/organizer");
        return;
      }
      const data = await response.json().catch(() => null) as { token?: string; expiresAt?: string; error?: string } | null;
      if (!response.ok || !data?.token || !data.expiresAt) throw new Error(data?.error || "Could not create a code. Try again.");
      setCode({ token: data.token, expiresAt: data.expiresAt, eventId });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not create a code. Try again.", error: true });
    } finally {
      setPending(false);
    }
  }

  const link = code && typeof window !== "undefined" ? `${window.location.origin}/check-in?token=${encodeURIComponent(code.token)}` : "";
  if (!events.length) return <p className="text-sm text-text-secondary">There are no event records available for check-in.</p>;

  return <div className="space-y-5">
    <form onSubmit={createCode} className="space-y-3">
      <label htmlFor="organizer-event" className="block text-sm font-semibold text-white">Your event</label>
      <select id="organizer-event" value={eventId} onChange={event => { setEventId(event.target.value); setCode(null); setMessage(null); }} required className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-3 text-sm text-white focus:border-velocity focus:outline-none focus:ring-2 focus:ring-velocity/40">
        {events.map(event => <option value={event.id} key={event.id}>{event.date} · {event.title}</option>)}
      </select>
      {selectedEvent && <div className="rounded-lg border border-border-subtle bg-background/40 px-3 py-3 text-xs text-text-secondary"><p className="font-semibold text-white">{selectedEvent.venueName} · {selectedEvent.sector}</p><p className="mt-1">{selectedEvent.startTime && selectedEvent.endTime ? `${selectedEvent.startTime}–${selectedEvent.endTime}` : selectedEvent.startsAt ?? "Schedule pending"} · {windowLabel(selectedEvent.checkInWindow)}</p></div>}
      <button type="submit" disabled={pending || !eventId} className="min-h-11 rounded-lg bg-velocity px-4 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Creating…" : "Create event check-in QR"}</button>
    </form>
    {message && <p className={message.error ? "text-sm text-rose-300" : "text-sm text-velocity"} role={message.error ? "alert" : "status"} aria-live="polite">{message.text}</p>}
    {code && <section className="rounded-xl bg-white p-5 text-center text-slate-950" aria-labelledby="check-in-code-heading">
      <h2 id="check-in-code-heading" className="font-semibold">Show this QR at the event</h2>
      <p className="mt-2 text-xs">Expires {new Date(code.expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST. Generate a fresh code after expiry.</p>
      <QRCodeSVG value={link} size={220} marginSize={4} title="Scan to check in with your RSVP" className="mx-auto my-4 h-auto max-w-full" />
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage({ text: "Check-in link copied.", error: false }); } catch { setMessage({ text: "Copy the link from the text field below.", error: false }); } }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">Copy check-in link</button>
      <label className="mt-3 block text-left text-xs">Signed check-in link<input aria-label="Signed check-in link" readOnly value={link} className="mt-1 w-full rounded border border-slate-300 p-2 text-xs" onFocus={event => event.target.select()} /></label>
    </section>}
  </div>;
}
