"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export function OrganizerTokenForm({events}: {events: Array<{id:string;title:string;date:string}>}) {
  const router = useRouter();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [code, setCode] = useState<{token:string;expiresAt:string;eventId:string} | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function createCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(""); setCode(null);
    try {
      const response = await fetch("/api/check-in/organizer", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({eventId}) });
      if (response.status === 401) {router.push("/login?callbackUrl=/organizer");return;}
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create a code. Try again.");
      setCode({...data,eventId});
    } catch(error) {setMessage(error instanceof Error ? error.message : "Could not create code.");}
    finally {setPending(false);}
  }
  const link = code && typeof window !== "undefined" ? `${window.location.origin}/check-in?token=${encodeURIComponent(code.token)}` : "";
  return <div className="space-y-5">
    <form onSubmit={createCode} className="space-y-3">
      <label htmlFor="organizer-event" className="block text-sm font-semibold">Your event</label>
      <select id="organizer-event" value={eventId} onChange={event => {setEventId(event.target.value);setCode(null);}} required className="w-full rounded-lg border border-border-strong bg-surface-elevated px-3 py-3 text-sm">
        {events.map(event => <option value={event.id} key={event.id}>{event.date} · {event.title}</option>)}
      </select>
      <button disabled={pending} className="min-h-11 rounded-lg bg-velocity px-4 text-sm font-bold text-black disabled:opacity-60">{pending ? "Creating…" : "Create event check-in QR"}</button>
    </form>
    {message && <p className="text-sm text-text-secondary" role="status">{message}</p>}
    {code && <section className="rounded-xl bg-white p-5 text-center text-slate-950" aria-labelledby="check-in-code-heading">
      <h2 id="check-in-code-heading" className="font-semibold">Show this QR at the event</h2>
      <p className="mt-2 text-xs">Expires {new Date(code.expiresAt).toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"numeric",minute:"2-digit"})} IST. Generate a fresh code after expiry.</p>
      <QRCodeSVG value={link} size={220} marginSize={4} title="Scan to check in with your RSVP" className="mx-auto my-4 h-auto max-w-full"/>
      <button type="button" onClick={async()=>{try {await navigator.clipboard.writeText(link);setMessage("Check-in link copied.");}catch{setMessage("Copy the link from the text field below.");}}} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">Copy check-in link</button>
      <label className="mt-3 block text-xs">Signed check-in link<input readOnly value={link} className="mt-1 w-full rounded border border-slate-300 p-2 text-xs" onFocus={event=>event.target.select()}/></label>
    </section>}
  </div>;
}
