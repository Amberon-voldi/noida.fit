"use client";

import { useRef, useState } from "react";
import type { AdminAttendanceEntry } from "@/lib/admin/attendance";

interface AttendanceData { event: { id: string; title: string; status: string }; total: number; confirmed: number; checkins: number; needsRepair: number; entries: AdminAttendanceEntry[] }
export interface AdminAttendanceProps { events: Array<{ id: string; title: string; status?: string }>; writesEnabled: boolean }

function csvCell(value: string) { return `"${(/^[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`; }

export function AdminAttendance({ events, writesEnabled }: AdminAttendanceProps) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [data, setData] = useState<AttendanceData | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<AdminAttendanceEntry | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const generation = useRef(0);

  async function load(start = 0) {
    const version = ++generation.current;
    setLoading(true); setError(""); setSelected(null);
    try {
      const response = await fetch(`/api/admin/attendance?eventId=${encodeURIComponent(eventId)}&offset=${start}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Attendance unavailable");
      if (version === generation.current) { setData(payload); setOffset(start); }
    } catch (error) { if (version === generation.current) setError(error instanceof Error ? error.message : "Attendance unavailable"); }
    finally { if (version === generation.current) setLoading(false); }
  }

  async function repair(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, userId: selected.userId, reason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Repair failed");
      setMessage("Verified participation repaired from the existing attendance record."); setReason(""); setSelected(null); await load(offset);
    } catch (error) { setError(error instanceof Error ? error.message : "Repair failed"); }
    finally { setPending(false); }
  }

  function exportPage() {
    if (!data) return;
    const csv = [["Display name", "RSVP", "Check-in time", "Verified participation"], ...data.entries.map(entry => [entry.displayName, entry.confirmed ? "Confirmed" : "No current RSVP", entry.checkedInAt ?? "", entry.verified ? "Verified" : "Not verified"])].map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "attendance-current-page.csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <div className="admin-module"><form className="admin-actions" onSubmit={event => { event.preventDefault(); void load(); }}><label className="flex-1">Event<select className="admin-field" value={eventId} disabled={pending} onChange={event => { generation.current++; setLoading(false); setEventId(event.target.value); setData(null); setSelected(null); }}>{events.map(event => <option key={event.id} value={event.id}>{event.title} · {event.status}</option>)}</select></label><button className="button-primary" disabled={loading || pending || !eventId}>{loading ? "Loading…" : "Load attendance"}</button></form>
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p role="status" className="text-velocity">{message}</p>}
    {!writesEnabled && <p className="admin-warning">Repairs are locked until the private audit store is configured. Roster review and CSV export remain available.</p>}
    {!events.length && <p className="admin-panel">No event records yet. Create an event in the Events module.</p>}
    {data && <><div className="admin-attendance-summary"><div><h2>{data.event.title}</h2><p>{data.confirmed} confirmed RSVPs · {data.checkins} trusted check-ins · {data.needsRepair} passport records need repair</p></div><div className="admin-actions"><button className="button-secondary" type="button" onClick={exportPage}>Export current page CSV</button><button className="button-secondary" type="button" disabled={loading || pending} onClick={() => void load(offset)}>Refresh attendance</button></div></div><div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Attendance roster, scroll for all columns"><table className="admin-table"><caption>Attendance and intent are distinct. No contact details are included.</caption><thead><tr><th scope="col">Member</th><th scope="col">RSVP</th><th scope="col">Attendance</th><th scope="col">Passport</th><th scope="col">Recovery</th></tr></thead><tbody>{data.entries.map(entry => <tr key={entry.userId}><th scope="row">{entry.displayName}</th><td>{entry.confirmed ? "Confirmed" : "No current RSVP"}</td><td>{entry.checkedInAt ? new Date(entry.checkedInAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "Not checked in"}</td><td>{entry.verified ? "Verified" : entry.checkedInAt ? "Repair needed" : "No attendance"}</td><td><button className="button-secondary" disabled={!writesEnabled || pending || !entry.checkedInAt} onClick={() => { setSelected(entry); setReason(""); }}>Repair derived record</button></td></tr>)}{!data.entries.length && <tr><td colSpan={5}>No RSVP or check-in records for this event.</td></tr>}</tbody></table></div><nav className="admin-actions" aria-label="Attendance pagination"><button className="button-secondary" disabled={loading || pending || !offset} onClick={() => void load(Math.max(0, offset - 50))}>Previous</button><span className="text-sm text-text-secondary">Showing {data.entries.length} of {data.total}</span><button className="button-secondary" disabled={loading || pending || offset + 50 >= data.total} onClick={() => void load(offset + 50)}>Next</button></nav></>}
    {selected && <form className="admin-panel" onSubmit={repair}><h2>Repair {selected.displayName}’s passport</h2><p className="admin-note mt-2">Only an existing trusted check-in can be repaired. This does not create attendance or change its original timestamp.</p><label className="block mt-3">Operational reason<input className="admin-field" required minLength={5} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="admin-actions mt-3"><button className="button-primary" disabled={pending}>{pending ? "Repairing…" : "Confirm audited repair"}</button><button type="button" className="button-secondary" disabled={pending} onClick={() => setSelected(null)}>Cancel</button></div></form>}
  </div>;
}
