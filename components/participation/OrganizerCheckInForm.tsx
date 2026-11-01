"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, UserX } from "lucide-react";
import type { CheckInWindowState } from "@/types/organizer";
import { participantTokenFromQr } from "@/lib/check-in-qr";
import { CheckInScanner } from "./CheckInScanner";

export interface OperatorEvent { id: string; title: string; checkInWindow: CheckInWindowState; }
type Outcome = "checked-in" | "already" | "not-on-list" | "expired" | "error";
interface ScanResult { id: number; outcome: Outcome; title: string; detail: string; at: string; }

const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });

const outcomeStyle: Record<Outcome, { box: string; text: string; label: string; Icon: typeof CheckCircle2 }> = {
  "checked-in": { box: "border-velocity bg-velocity/10", text: "text-velocity", label: "Checked in", Icon: CheckCircle2 },
  already: { box: "border-sky-400/60 bg-sky-400/10", text: "text-sky-300", label: "Already in", Icon: CheckCircle2 },
  "not-on-list": { box: "border-rose-400/70 bg-rose-400/10", text: "text-rose-300", label: "Not on list", Icon: UserX },
  expired: { box: "border-amber-400/60 bg-amber-400/10", text: "text-amber-300", label: "QR expired", Icon: Clock3 },
  error: { box: "border-rose-400/70 bg-rose-400/10", text: "text-rose-300", label: "Failed", Icon: AlertTriangle },
};

/** Maps the server's stable error codes to what the person at the desk should do next. */
function failure(code: string | undefined, message: string): Pick<ScanResult, "outcome" | "title" | "detail"> {
  switch (code) {
    case "RSVP_REQUIRED": return { outcome: "not-on-list", title: "Not on the RSVP list", detail: message };
    case "CHECKIN_TOKEN_EXPIRED": return { outcome: "expired", title: "QR expired", detail: "Ask them to refresh the check-in QR on their .fit ID, then scan again." };
    case "CHECKIN_TOKEN_INVALID": return { outcome: "error", title: "Not a valid check-in QR", detail: "Ask them to open their .fit ID and show the check-in side of the card." };
    case "CHECKIN_CLOSED": return { outcome: "error", title: "Check-in is closed", detail: "New check-ins open 30 minutes before the start and close an hour after the end." };
    default: return { outcome: "error", title: "Could not check in", detail: message };
  }
}

/** One event's attendance desk. The scanner stays on so a queue moves without extra taps. */
export function OrganizerCheckInForm({ event }: { event: OperatorEvent }) {
  const router = useRouter();
  const codeId = useId();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const counter = useRef(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const latest = results[0];

  function push(result: Omit<ScanResult, "id" | "at">) {
    counter.current += 1;
    const entry = { ...result, id: counter.current, at: new Date().toISOString() };
    setResults(current => [entry, ...current].slice(0, 8));
  }

  async function record(value: string) {
    if (busy.current) return;
    busy.current = true; setPending(true);
    try {
      let token: string;
      try { token = participantTokenFromQr(value); } catch (reason) {
        push({ outcome: "error", title: "Not a check-in QR", detail: reason instanceof Error ? reason.message : "Scan the check-in side of their .fit ID." });
        return;
      }
      const response = await fetch("/api/check-in/organizer", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: event.id, token }) });
      if (response.status === 401) { router.push(`/login?callbackUrl=/organizer/events/${encodeURIComponent(event.id)}`); return; }
      const data = await response.json().catch(() => null) as { checkedIn?: boolean; displayName?: string; checkedInAt?: string; alreadyCheckedIn?: boolean; error?: string; code?: string } | null;
      if (!response.ok || !data?.checkedIn || !data.displayName) {
        push(failure(data?.code, data?.error || "Participant check-in could not be completed. Try again."));
        return;
      }
      push(data.alreadyCheckedIn
        ? { outcome: "already", title: data.displayName, detail: `Already checked in at ${data.checkedInAt ? timeFormatter.format(new Date(data.checkedInAt)) : "an earlier scan"}.` }
        : { outcome: "checked-in", title: data.displayName, detail: "Checked in. Attendance is on their .fit ID." });
      setInput("");
      router.refresh();
    } catch {
      push({ outcome: "error", title: "Connection problem", detail: "Nothing was recorded. Check the connection and scan again." });
    } finally { busy.current = false; setPending(false); }
  }

  const style = latest ? outcomeStyle[latest.outcome] : null;
  return <div className="min-w-0 space-y-4">
    {event.checkInWindow !== "open" && <p className="rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-200" role="note">
      {event.checkInWindow === "not-open" ? "Check-in opens 30 minutes before the start. You can test the scanner now; new check-ins are refused until then."
        : event.checkInWindow === "closed" ? "Check-in has closed for this event. Scans can only confirm people already checked in."
        : "This event is not taking check-ins."}
    </p>}
    <CheckInScanner continuous disabled={pending} onToken={value => void record(value)} />
    <div aria-live="polite" aria-atomic="true">
      {latest && style && <div key={latest.id} className={`flex items-start gap-3 rounded-xl border p-4 ${style.box}`} data-outcome={latest.outcome}>
        <style.Icon className={`mt-0.5 size-6 shrink-0 ${style.text}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className={`break-words text-lg font-bold ${style.text}`}>{latest.title}</p>
          <p className="mt-1 text-sm text-text-secondary">{latest.detail}</p>
        </div>
      </div>}
    </div>
    {results.length > 1 && <section aria-label="Recent scans">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Recent scans</p>
      <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-subtle">
        {results.slice(1).map(result => <li key={result.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm">
          <span className="min-w-0 truncate text-white">{result.title}</span>
          <span className={`shrink-0 text-xs ${outcomeStyle[result.outcome].text}`}>{outcomeStyle[result.outcome].label} · {timeFormatter.format(new Date(result.at))}</span>
        </li>)}
      </ul>
    </section>}
    <details className="rounded-lg border border-border-subtle px-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-velocity">Camera not working? Paste the code</summary>
      <form onSubmit={submit => { submit.preventDefault(); void record(input); }} className="space-y-3 pb-3">
        <div><label htmlFor={codeId} className="block text-sm text-text-secondary">Participant check-in code</label><textarea id={codeId} value={input} onChange={change => setInput(change.target.value)} required readOnly={pending} maxLength={2060} rows={3} className="mt-2 w-full min-w-0 rounded-lg border border-border-strong bg-surface-elevated p-3 font-mono text-xs text-white" placeholder="Paste the participant’s NF-CHECKIN code" /></div>
        <button type="submit" disabled={pending || !input.trim()} className="button-primary min-h-11 px-4">{pending ? "Recording attendance…" : "Check in participant"}</button>
      </form>
    </details>
  </div>;
}
