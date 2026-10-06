"use client";

import { useRef, useState } from "react";
import type { AdminMember } from "@/lib/admin/members";

type Action = "suspend" | "restore" | "revoke-sessions" | "grant-admin" | "remove-admin" | "hide-profile";
const labels: Record<Action, string> = { suspend: "Suspend account", restore: "Restore account", "revoke-sessions": "Revoke all sessions", "grant-admin": "Grant admin access", "remove-admin": "Remove admin access", "hide-profile": "Hide public profile" };

export function AdminMembers({ writesEnabled, initialData = { total: 0, members: [] }, initialError = "" }: { writesEnabled: boolean; initialData?: { total: number; members: AdminMember[] }; initialError?: string }) {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<{ member: AdminMember; action: Action } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const requestId = useRef(0);

  async function load(search = q, start = offset) {
    const id = ++requestId.current;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/members?q=${encodeURIComponent(search)}&offset=${start}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Members could not be loaded");
      if (id === requestId.current) setPage(data);
    } catch (error) { if (id === requestId.current) setError(error instanceof Error ? error.message : "Members could not be loaded"); }
    finally { if (id === requestId.current) setLoading(false); }
  }

  async function change(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.member.id, action: selected.action, reason, confirmation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");
      setMessage(`${labels[selected.action]} completed.`); setSelected(null); setReason(""); setConfirmation("");
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Action failed"); }
    finally { setPending(false); }
  }

  return <div className="admin-module">
    <form onSubmit={event => { event.preventDefault(); setOffset(0); void load(q, 0); }} className="admin-actions"><label className="flex-1">Search accounts<input className="admin-field" value={q} onChange={event => setQ(event.target.value)} maxLength={100} placeholder="Name or known account search term" /></label><button className="button-secondary" disabled={loading}>Search members</button></form>
    {!writesEnabled && <p className="admin-warning">Writes are locked until the private audit store is configured. Account browsing requires Appwrite users.read; access controls require users.write.</p>}
    {error && <div className="admin-error" role="alert">{error} <button type="button" className="button-secondary" onClick={() => void load()}>Retry read</button></div>}
    {message && <p role="status" className="text-velocity">{message}</p>}
    <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Member accounts, scroll for all columns"><table className="admin-table admin-member-table"><caption>{loading ? "Loading accounts…" : `${page.total} matching accounts · no emails, passwords or sessions displayed`}</caption><thead><tr><th scope="col">Name / operational ID</th><th scope="col">Access</th><th scope="col">Role</th><th scope="col">Joined</th><th scope="col">Options</th></tr></thead><tbody>{page.members.map(member => <tr key={member.id}><th scope="row">{member.name}<code className="block text-xs text-text-secondary">{member.id}</code></th><td>{member.enabled ? "Enabled" : "Suspended"}</td><td>{member.admin ? "Administrator" : "Member"}</td><td>{new Date(member.joinedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td><div className="admin-actions">{([member.enabled ? "suspend" : "restore", "revoke-sessions", member.admin ? "remove-admin" : "grant-admin", "hide-profile"] as Action[]).map(action => <button type="button" key={action} className="button-secondary" disabled={!writesEnabled || pending} onClick={() => { setSelected({ member, action }); setConfirmation(""); setReason(""); setError(""); }}>{labels[action]}</button>)}</div></td></tr>)}{!loading && !page.members.length && <tr><td colSpan={5}>No accounts match this search.</td></tr>}</tbody></table></div>
    <nav aria-label="Member pagination" className="admin-actions"><button className="button-secondary" disabled={loading || offset === 0} onClick={() => { const next = Math.max(0, offset - 25); setOffset(next); void load(q, next); }}>Previous</button><span className="text-sm text-text-secondary">{Math.min(offset + 1, page.total)}–{Math.min(offset + 25, page.total)} of {page.total}</span><button className="button-secondary" disabled={loading || offset + 25 >= page.total} onClick={() => { const next = offset + 25; setOffset(next); void load(q, next); }}>Next</button></nav>
    {selected && <section className="admin-panel" aria-labelledby="member-action-heading"><h2 id="member-action-heading">{labels[selected.action]}: {selected.member.name}</h2><p className="admin-note mt-2">This affects account access or public visibility, not recorded attendance. Self-actions are blocked. Do not enter credentials in the reason.</p><form onSubmit={change} className="mt-3"><div className="admin-confirmation-grid"><label className="block">Operational reason<input className="admin-field" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={300} required /></label><label className="block">Type account ID: <code>{selected.member.id}</code><input className="admin-field" value={confirmation} onChange={event => setConfirmation(event.target.value)} required autoComplete="off" /></label></div><div className="admin-actions mt-3"><button className="button-primary" disabled={pending || confirmation !== selected.member.id}>{pending ? "Applying…" : "Confirm audited action"}</button><button type="button" disabled={pending} className="button-secondary" onClick={() => setSelected(null)}>Cancel</button></div></form></section>}
  </div>;
}
