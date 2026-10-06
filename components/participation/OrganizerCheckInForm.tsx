"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckInWindowState } from "@/types/organizer";
import { participantTokenFromQr } from "@/lib/check-in-qr";
import { CheckInScanner } from "./CheckInScanner";

interface OperatorEvent { id: string; title: string; date?: string; startTime?: string; endTime?: string; venueName: string; sector: string; checkInWindow: CheckInWindowState; }
interface Result { displayName: string; checkedInAt: string; alreadyCheckedIn: boolean; }
export function OrganizerCheckInForm({ events }: { events: OperatorEvent[] }) {
  const router = useRouter();
  const [eventId, setEventId] = useState(events.find(event => event.checkInWindow === "open")?.id ?? events[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const selected = events.find(event => event.id === eventId);

  async function record(value: string) {
    if (busy.current || !eventId) return;
    busy.current = true; setPending(true); setError(""); setResult(null);
    try {
      const token = participantTokenFromQr(value);
      const response = await fetch("/api/check-in/organizer", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, token }) });
      if (response.status === 401) { router.push("/login?callbackUrl=/organizer"); return; }
      const data = await response.json().catch(() => null) as (Result & { error?: string; checkedIn?: boolean }) | null;
      if (!response.ok || !data?.checkedIn) throw new Error(data?.error || "Participant check-in could not be completed. Try again.");
      setResult({ displayName: data.displayName, checkedInAt: data.checkedInAt, alreadyCheckedIn: data.alreadyCheckedIn }); setInput("");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Participant check-in could not be completed."); }
    finally { busy.current = false; setPending(false); }
  }

  if (!events.length) return <p className="text-sm text-text-secondary">There are no assigned events to check in participants.</p>;
  const windowLabels: Record<CheckInWindowState, string> = { open: "Check-in open", "not-open": "Not open yet", closed: "Check-in closed", cancelled: "Event cancelled", unavailable: "Event not published", invalid: "Schedule needs review" };
  return <div className="min-w-0 space-y-4">
    <label className="block text-sm font-semibold text-white">Event at this attendance desk<select value={eventId} disabled={pending} onChange={event => { setEventId(event.target.value); setInput(""); setError(""); setResult(null); }} className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface-elevated px-3 text-base text-white">{events.map(event => <option key={event.id} value={event.id}>{event.title} · {event.date} · {event.venueName}</option>)}</select></label>
    {selected && <p className="text-sm text-text-secondary">{selected.venueName} · {selected.sector} · {selected.startTime}–{selected.endTime} · {windowLabels[selected.checkInWindow]}</p>}
    <p className="text-sm leading-relaxed text-text-secondary">Ask the participant to open <strong className="text-white">Show check-in QR</strong> in their account. Scan their participant QR—not a public-profile QR. Only confirmed RSVPs can be recorded during the event window.</p>
    {/* Remounting on event changes releases the camera and invalidates old scan callbacks. */}
    <CheckInScanner key={eventId} disabled={pending} onToken={value => { setInput(value); void record(value); }} />
    <form onSubmit={event => { event.preventDefault(); void record(input); }} className="space-y-3">
      <label className="block text-sm text-text-secondary">Participant check-in code (camera fallback)<textarea value={input} onChange={event => setInput(event.target.value)} required readOnly={pending} maxLength={2060} rows={3} aria-invalid={Boolean(error)} aria-describedby={error ? "operator-check-in-error" : undefined} className="mt-2 w-full min-w-0 rounded-lg border border-border-strong bg-surface-elevated p-3 font-mono text-xs text-white" placeholder="Paste the participant’s NF-CHECKIN code" /></label>
      <button type="submit" disabled={pending || !input.trim()} className="button-primary min-h-11 px-4">{pending ? "Recording attendance…" : "Check in participant"}</button>
    </form>
    {error && <p id="operator-check-in-error" className="text-sm text-rose-300" role="alert">{error}</p>}
    {result && <div className="rounded-lg border border-velocity/40 bg-velocity/5 p-4" role="status"><p className="break-words font-semibold text-velocity">{result.displayName} {result.alreadyCheckedIn ? "was already checked in. Passport is up to date." : "is checked in. Attendance and passport are recorded."}</p><p className="mt-1 text-xs text-text-secondary">{new Date(result.checkedInAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · {selected?.title}</p><p className="mt-2 text-sm text-text-secondary">Ready for the next participant. Start the scanner again.</p></div>}
  </div>;
}
