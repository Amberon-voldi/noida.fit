"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, IndianRupee, LoaderCircle, UserX } from "lucide-react";
import type { CheckInWindowState } from "@/types/organizer";
import { checkInCodeFromQr } from "@/lib/check-in-qr";
import { formatInr } from "@/lib/pricing";
import { CheckInScanner } from "./CheckInScanner";
import { scanCue, unlockScanSound } from "./scan-feedback";

export interface OperatorEvent { id: string; title: string; checkInWindow: CheckInWindowState; checkedIn?: number; confirmedRsvps?: number; }
type Outcome = "checked-in" | "already" | "not-on-list" | "unpaid" | "expired" | "error";
type CheckInCode = ReturnType<typeof checkInCodeFromQr>;
/** What the desk sends: the scanned code, and what it did in hand (registered a walk-in, collected a payment). */
type Submission = CheckInCode & { register?: true; collected?: number };
/** A one-tap next step on a result: collect a due payment, or register a walk-in, and check them in. */
interface DeskAction { label: string; submission: Submission }
interface ScanResult { id: number; outcome: Outcome; title: string; detail: string; at: string; action?: DeskAction }

/** A result stays up this long, then the desk shows it's ready: a past person's name never stands in for the next. */
const RESULT_SHOWN_MS = 6_000;
/** The guest list behind the desk reloads once scanning goes quiet, not after every person. */
const REFRESH_AFTER_MS = 10_000;

const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });

const outcomeStyle: Record<Outcome, { box: string; text: string; label: string; Icon: typeof CheckCircle2 }> = {
  "checked-in": { box: "border-velocity bg-velocity/10", text: "text-velocity", label: "Checked in", Icon: CheckCircle2 },
  already: { box: "border-sky-400/60 bg-sky-400/10", text: "text-sky-300", label: "Already in", Icon: CheckCircle2 },
  "not-on-list": { box: "border-rose-400/70 bg-rose-400/10", text: "text-rose-300", label: "Not on list", Icon: UserX },
  unpaid: { box: "border-amber-400/70 bg-amber-400/10", text: "text-amber-300", label: "Not paid", Icon: IndianRupee },
  expired: { box: "border-amber-400/60 bg-amber-400/10", text: "text-amber-300", label: "QR expired", Icon: Clock3 },
  error: { box: "border-rose-400/70 bg-rose-400/10", text: "text-rose-300", label: "Failed", Icon: AlertTriangle },
};

/** Maps the server's stable error codes to what the person at the desk should do next. */
function failure(code: string | undefined, message: string, details: { amountDue?: number; price?: number } | undefined, scanned: CheckInCode): Pick<ScanResult, "outcome" | "title" | "detail" | "action"> {
  switch (code) {
    case "RSVP_REQUIRED": return { outcome: "not-on-list", title: "Not on the RSVP list", detail: message };
    // A walk-in on a session that takes late sign-ups: register them here, collecting the price first if it has one.
    case "NOT_REGISTERED": {
      const price = details?.price ?? 0;
      return { outcome: "not-on-list", title: "Not registered", detail: message, action: price > 0
        ? { label: `Collected ${formatInr(price)} · Register & check in`, submission: { ...scanned, register: true, collected: price } }
        : { label: "Register & check in", submission: { ...scanned, register: true } } };
    }
    // Their ticket is unpaid: take it in hand and check them in with one tap.
    case "PAYMENT_DUE": return { outcome: "unpaid", title: "Not paid yet", detail: message, ...(details?.amountDue ? { action: { label: `Collected ${formatInr(details.amountDue)} · Check in`, submission: { ...scanned, collected: details.amountDue } } } : {}) };
    case "PAYMENT_PENDING": return { outcome: "unpaid", title: "Payment not finished", detail: message };
    case "CHECKIN_TOKEN_EXPIRED": return { outcome: "expired", title: "QR expired", detail: "Ask them to refresh the check-in QR on their .fit ID, then scan again." };
    case "CHECKIN_TOKEN_INVALID": return { outcome: "error", title: "Not a valid check-in QR", detail: "Ask them to open their .fit ID and show the check-in side of the card, or open their guest pass." };
    case "CHECKIN_CLOSED": return { outcome: "error", title: "Check-in is closed", detail: "New check-ins open 30 minutes before the start and close an hour after the end." };
    default: return { outcome: "error", title: "Could not check in", detail: message };
  }
}

/** The one tap after collecting a payment or deciding to register a walk-in. */
function DeskActionButton({ action, disabled, onRun }: { action: DeskAction; disabled: boolean; onRun: (action: DeskAction) => void }) {
  return <button type="button" onClick={() => onRun(action)} disabled={disabled}
    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-velocity px-4 text-sm font-bold text-slate-950 disabled:opacity-60">{action.label}</button>;
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
  const [cameraOn, setCameraOn] = useState(false);
  const [shownUntil, setShownUntil] = useState<{ id: number; expired: boolean }>({ id: 0, expired: false });
  // Check-ins made at this desk since the page last loaded its count: the count moves at once, without a reload.
  const [added, setAdded] = useState<{ base?: number; count: number }>({ base: event.checkedIn, count: 0 });
  const refreshTimer = useRef<number | undefined>(undefined);
  const latest = results[0];
  const current = latest && !(shownUntil.id === latest.id && shownUntil.expired) ? latest : undefined;

  useEffect(() => {
    // A result waiting on the desk (collect, register) stays until it's done or the next person is scanned.
    if (!latest || latest.action) return;
    const timer = window.setTimeout(() => setShownUntil({ id: latest.id, expired: true }), RESULT_SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [latest]);
  useEffect(() => () => window.clearTimeout(refreshTimer.current), []);

  function push(result: Omit<ScanResult, "id" | "at">) {
    counter.current += 1;
    const entry = { ...result, id: counter.current, at: new Date().toISOString() };
    setResults(current => [entry, ...current].slice(0, 8));
    scanCue(result.outcome === "checked-in" || result.outcome === "already" ? "ok" : "problem");
  }

  const runAction = (action: DeskAction) => { void submit(action.submission); };

  /** A scanned or pasted code. */
  function record(value: string) {
    if (busy.current) return;
    let code: CheckInCode;
    try { code = checkInCodeFromQr(value); } catch (reason) {
      push({ outcome: "error", title: "Not a check-in QR", detail: reason instanceof Error ? reason.message : "Scan the check-in side of their .fit ID, or their guest pass." });
      return;
    }
    // Heard and felt the moment the QR is read, before the server answers.
    scanCue("read");
    void submit(code);
  }

  async function submit(submission: Submission) {
    if (busy.current) return;
    busy.current = true; setPending(true);
    try {
      const response = await fetch("/api/check-in/organizer", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: event.id, ...submission }) });
      if (response.status === 401) { router.push(`/login?callbackUrl=/organizer/events/${encodeURIComponent(event.id)}`); return; }
      const data = await response.json().catch(() => null) as { checkedIn?: boolean; displayName?: string; checkedInAt?: string; alreadyCheckedIn?: boolean; guest?: boolean; registered?: boolean; collected?: number; error?: string; code?: string; details?: { amountDue?: number; price?: number } } | null;
      if (!response.ok || !data?.checkedIn || !data.displayName) {
        const scanned: CheckInCode = "guestPass" in submission ? { guestPass: submission.guestPass } : { token: submission.token };
        push(failure(data?.code, data?.error || "Participant check-in could not be completed. Try again.", data?.details, scanned));
        return;
      }
      const paidHere = data.collected ? ` ${formatInr(data.collected)} collected.` : "";
      push(data.alreadyCheckedIn
        ? { outcome: "already", title: data.displayName, detail: `Already checked in at ${data.checkedInAt ? timeFormatter.format(new Date(data.checkedInAt)) : "an earlier scan"}.` }
        : { outcome: "checked-in", title: data.displayName, detail: data.registered ? `Registered and checked in.${paidHere}` : data.guest ? `Checked in with their guest pass.${paidHere}` : `Checked in.${paidHere || " Attendance is on their .fit ID."}` });
      setInput("");
      if (!data.alreadyCheckedIn) setAdded(current => ({ base: event.checkedIn, count: (current.base === event.checkedIn ? current.count : 0) + 1 }));
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), REFRESH_AFTER_MS);
    } catch {
      push({ outcome: "error", title: "Connection problem", detail: "Nothing was recorded. Check the connection and scan again." });
    } finally { busy.current = false; setPending(false); }
  }

  const style = current ? outcomeStyle[current.outcome] : null;
  const resultCard = (large: boolean) => current && style && <div key={current.id} className={`flex items-start gap-3 rounded-xl border p-4 ${style.box} ${large ? "bg-black/70 backdrop-blur-md" : ""}`} data-outcome={current.outcome}>
    <style.Icon className={`mt-0.5 shrink-0 ${large ? "size-8" : "size-6"} ${style.text}`} aria-hidden="true" />
    <div className="min-w-0">
      {large && <p className={`text-xs font-semibold uppercase tracking-widest ${style.text}`}>{style.label} · {timeFormatter.format(new Date(current.at))}</p>}
      <p className={`break-words font-bold ${large ? "mt-0.5 text-2xl" : "text-lg"} ${style.text}`}>{current.title}</p>
      <p className={`mt-1 text-sm ${large ? "text-white/85" : "text-text-secondary"}`}>{current.detail}</p>
      {current.action && <DeskActionButton action={current.action} disabled={pending} onRun={runAction} />}
    </div>
  </div>;
  // Replaces the last result the instant a QR is read, so the person in front of the desk never sees someone else's.
  const checkingCard = (large: boolean) => <div className={`flex items-center gap-3 rounded-xl border border-sky-400/70 p-4 ${large ? "bg-black/75 backdrop-blur-md" : "bg-sky-400/10"}`} data-outcome="checking" role="status">
    <LoaderCircle className={`shrink-0 animate-spin text-sky-300 ${large ? "size-8" : "size-6"}`} aria-hidden="true" />
    <div className="min-w-0">
      <p className={`font-bold text-sky-200 ${large ? "text-2xl" : "text-lg"}`}>QR read · Checking…</p>
      <p className={`mt-0.5 text-sm ${large ? "text-white/85" : "text-text-secondary"}`}>Keep this person here until their name shows.</p>
    </div>
  </div>;
  const checkedIn = typeof event.checkedIn === "number" ? event.checkedIn + (added.base === event.checkedIn ? added.count : 0) : undefined;
  const recent = current ? results.slice(1) : results;
  const attendance = typeof checkedIn === "number"
    ? `${checkedIn}${typeof event.confirmedRsvps === "number" ? ` of ${event.confirmedRsvps}` : ""} checked in`
    : "Hold each QR inside the frame";
  const windowNote = event.checkInWindow === "not-open" ? "Check-in has not opened yet. Scans are refused until 30 minutes before the start."
    : event.checkInWindow === "closed" ? "Check-in has closed. Scans can only confirm people already checked in."
    : event.checkInWindow !== "open" ? "This event is not taking check-ins." : "";
  const overlay = <div className="mx-auto w-full max-w-xl space-y-2" aria-live="polite" aria-atomic="true">
    {windowNote && <p className="rounded-xl border border-amber-400/60 bg-black/70 p-3 text-center text-sm text-amber-200 backdrop-blur-md" role="note">{windowNote}</p>}
    {pending && checkingCard(true)}
    {!pending && resultCard(true)}
    {!pending && !current && <p className="rounded-xl bg-black/60 p-4 text-center text-sm text-white/85 backdrop-blur-md">{latest ? "Ready for the next person. Hold their QR inside the frame." : "Point the camera at a .fit ID check-in QR or a guest pass. Their details appear here."}</p>}
    {recent.length > 0 && <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Recent scans">
      {recent.slice(0, 4).map(result => <li key={result.id} className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs backdrop-blur-md">
        <span className="max-w-32 truncate text-white">{result.title}</span>
        <span className={outcomeStyle[result.outcome].text}>{outcomeStyle[result.outcome].label}</span>
      </li>)}
    </ul>}
  </div>;
  // The first tap (starting the camera) lets the desk play its scan sounds.
  return <div className="min-w-0 space-y-4" onPointerDownCapture={unlockScanSound}>
    {event.checkInWindow !== "open" && <p className="rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-200" role="note">
      {event.checkInWindow === "not-open" ? "Check-in opens 30 minutes before the start. You can test the scanner now; new check-ins are refused until then."
        : event.checkInWindow === "closed" ? "Check-in has closed for this event. Scans can only confirm people already checked in."
        : "This event is not taking check-ins."}
    </p>}
    <CheckInScanner continuous fullscreen title={event.title} subtitle={attendance} overlay={overlay} onActiveChange={setCameraOn} disabled={pending} onToken={value => void record(value)} />
    {/* While the full-screen camera is up, the result is shown over it instead. */}
    {!cameraOn && <div aria-live="polite" aria-atomic="true">{pending ? checkingCard(false) : resultCard(false)}</div>}
    {recent.length > 0 && <section aria-label="Recent scans">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Recent scans</p>
      <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-subtle">
        {recent.map(result => <li key={result.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm">
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
