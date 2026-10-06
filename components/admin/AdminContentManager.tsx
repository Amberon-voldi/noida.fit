"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentKind } from "@/lib/content-schema";

type Entry = { id: string; updatedAt: string; record: Record<string, unknown> };
const labels: Record<ContentKind, string> = { activities: "Activities", communities: "Communities", places: "Places", events: "Events" };
const singular: Record<ContentKind, string> = { activities: "activity", communities: "community", places: "place", events: "event" };
const nameOf = (kind: ContentKind, record: Record<string, unknown>) => String(record[kind === "events" ? "title" : "name"] ?? record.slug ?? "Untitled");
const buttonClass = "button-secondary min-h-11 px-4";

export function AdminContentManager({ kind, initialRecords, initialError = "", template, writesEnabled }: {
  kind: ContentKind; initialRecords: Entry[]; initialError?: string; template: Record<string, unknown>; writesEnabled: boolean;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [json, setJson] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  const visible = useMemo(() => records.filter(item =>
    (!search.trim() || JSON.stringify(item.record).toLowerCase().includes(search.trim().toLowerCase())) && (status === "all" || item.record.status === status),
  ), [records, search, status]);
  const draft = useMemo(() => {
    try { const value: unknown = JSON.parse(json); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
    catch { return null; }
  }, [json]);
  const busy = Boolean(pending);
  function patch(key: string, value: unknown) {
    if (!draft || busy) return;
    const next = { ...draft };
    if (value === "" && ["organizerUserId", "primaryVenueSlug"].includes(key)) delete next[key];
    else next[key] = value;
    setJson(JSON.stringify(next, null, 2));
  }
  function open(item: Entry | null) {
    if (busy || (!item && !writesEnabled)) return;
    const record = item ? item.record : { ...template, slug: `new-${singular[kind]}-${Date.now().toString(36)}` };
    if (!item && kind === "events") {
      const date = new Date(Date.now() + 24 * 60 * 60_000 + 330 * 60_000).toISOString().slice(0, 10);
      Object.assign(record, { date, startsAt: `${date}T06:00:00+05:30`, endsAt: `${date}T07:00:00+05:30` });
    }
    setSelected(item); setJson(JSON.stringify(record, null, 2)); setReason(""); setConfirmation(""); setMessage(""); setError("");
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  async function api(method: string, body?: unknown): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    requestRef.current = controller;
    const response = await fetch(`/api/admin/content/${kind}`, {
      method, signal: controller.signal, cache: "no-store",
      ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "The request could not be completed.");
    return result;
  }
  async function reload() {
    if (busy) return;
    setPending("Loading records…"); setError("");
    try {
      const result = await api("GET");
      if (!Array.isArray(result.records)) throw new Error("Content response was invalid. Try again.");
      setRecords(result.records as Entry[]);
      setMessage(json ? "List refreshed. Your open form is unchanged; reopen the record to review its latest version." : "Records refreshed.");
    } catch (caught) { if (!(caught instanceof Error && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Content could not be loaded."); }
    finally { setPending(""); }
  }
  async function save() {
    if (busy || !writesEnabled) return;
    setError(""); setMessage("");
    if (!draft) { setError("Fix the record JSON before saving."); return; }
    if (selected && draft.id !== selected.id) { setError("Record IDs cannot change. Reopen this record to restore its ID."); return; }
    if (reason.trim().length < 5 || reason.trim().length > 300) { setError("Give a mutation reason of 5–300 characters."); return; }
    setPending(selected ? "Saving changes…" : "Creating record…");
    try {
      const result = await api(selected ? "PUT" : "POST", { record: draft, reason, ...(selected ? { id: selected.id, expectedUpdatedAt: selected.updatedAt } : {}) });
      const entry = result.record as Entry;
      if (!entry?.id || !entry.record) throw new Error("Content response was invalid. Reload and review before retrying.");
      setRecords(current => current.some(item => item.id === entry.id) ? current.map(item => item.id === entry.id ? entry : item) : [...current, entry]);
      setSelected(entry); setJson(JSON.stringify(entry.record, null, 2)); setConfirmation(""); setMessage("Saved. Status and visibility now match the validated record.");
    } catch (caught) { if (!(caught instanceof Error && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Content could not be saved."); }
    finally { setPending(""); }
  }
  async function remove() {
    if (busy || !writesEnabled || !selected) return;
    setError(""); setMessage("");
    if (confirmation !== selected.id) { setError("Type the exact record ID before deleting."); return; }
    if (reason.trim().length < 5 || reason.trim().length > 300) { setError("Give a mutation reason of 5–300 characters."); return; }
    setPending("Deleting record…");
    try {
      await api("DELETE", { id: selected.id, confirm: confirmation, reason, expectedUpdatedAt: selected.updatedAt });
      setRecords(current => current.filter(item => item.id !== selected.id)); setSelected(null); setJson(""); setConfirmation(""); setMessage("Deleted. No linked history was removed.");
      requestAnimationFrame(() => newButtonRef.current?.focus());
    } catch (caught) { if (!(caught instanceof Error && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Content could not be deleted."); }
    finally { setPending(""); }
  }
  function textField(key: string, label: string, type = "text") {
    return <label className="block text-sm" key={key}><span>{label}</span><input type={type} value={String(draft?.[key] ?? "")} readOnly={busy || !draft} onChange={event => patch(key, type === "number" ? Number(event.target.value) : event.target.value)} className="admin-field" /></label>;
  }
  function checkField(key: string, label: string) {
    return <label className="inline-flex min-h-11 items-center gap-3" key={key}><input type="checkbox" checked={draft?.[key] === true} onChange={event => patch(key, event.target.checked)} aria-disabled={busy || !draft} /><span>{label}</span></label>;
  }

  return <div className="admin-page">
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div><p className="eyebrow">Admin content</p><h1 className="mt-2 text-4xl font-extrabold text-white">Manage {labels[kind].toLowerCase()}</h1><p className="mt-3 text-sm text-text-secondary">Full validated records. Only published listings appear in public pages. Content payloads are not a secure place for secrets, including drafts.</p></div>
      <div className="admin-actions"><button ref={newButtonRef} type="button" className="button-primary min-h-11 px-4" onClick={() => open(null)} aria-disabled={busy || !writesEnabled}>New {singular[kind]}</button><button type="button" className={buttonClass} onClick={reload} aria-disabled={busy}>Refresh / retry</button></div>
    </header>
    {!writesEnabled && <p className="admin-error mt-5" role="status">Writes are locked until the private audit store is configured. You can still review content.</p>}
    {error && <p id="content-error" className="admin-error mt-5" role="alert">{error}</p>}
    <p className="mt-4 text-sm text-text-secondary" role="status" aria-live="polite">{pending || message}</p>
    <section className="admin-panel mt-6" aria-labelledby="content-list-heading" aria-busy={busy}>
      <div className="flex flex-wrap items-end justify-between gap-4"><h2 id="content-list-heading" className="text-xl font-bold">Records · {visible.length}</h2><div className="admin-actions"><label className="block text-sm"><span>Search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, slug, sector…" className="admin-field" /></label><label className="block text-sm"><span>Status</span><select value={status} onChange={event => setStatus(event.target.value)} className="admin-field"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></label></div></div>
      <div className="admin-table-wrap mt-5"><table className="admin-table"><caption className="sr-only">{labels[kind]} content records</caption><thead><tr><th scope="col">Name / ID</th><th scope="col">Slug</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><th scope="row">{nameOf(kind, item.record)}<small className="block font-mono text-xs text-text-secondary">{item.id}</small></th><td>{String(item.record.slug ?? "—")}</td><td>{String(item.record.status ?? "unknown")}{item.record.demo === true ? " · demo" : ""}</td><td><button type="button" className={buttonClass} onClick={() => open(item)} aria-label={`Edit ${nameOf(kind, item.record)}`} aria-disabled={busy}>Edit</button></td></tr>)}{!visible.length && <tr><td colSpan={4}>{error && !records.length ? "Records unavailable. Use Refresh / retry." : records.length ? "No records match these filters." : "No records yet. Create a draft to get started."}</td></tr>}</tbody></table></div>
    </section>
    {json && <section className="admin-panel mt-8" aria-labelledby="editor-heading" aria-busy={busy}>
      <h2 ref={headingRef} id="editor-heading" tabIndex={-1} className="text-xl font-bold">{selected ? `Edit ${nameOf(kind, selected.record)}` : `Create ${singular[kind]}`}</h2>
      {selected && <p className="mt-2 font-mono text-xs text-text-secondary">Immutable ID: {selected.id}</p>}
      <p className="mt-3 text-sm text-text-secondary">Set the basics below, then save. Advanced JSON also edits all optional fields, nested schedules, images, social links and amenities.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {textField(kind === "events" ? "title" : "name", kind === "events" ? "Title" : "Name")}{textField("slug", "Slug")}
        <label className="block text-sm"><span>Status (applies on save)</span><select value={String(draft?.status ?? "draft")} onChange={event => patch("status", event.target.value)} aria-disabled={busy || !draft} className="admin-field"><option value="draft">Draft / unpublished</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></label>
        {kind !== "activities" && textField("category", "Category")}
        {(kind === "events" || kind === "communities") && textField("activityId", "Activity record ID")}
        {kind === "activities" && textField("emoji", "Emoji")}
        {kind === "communities" && <>{textField("baseLocation", "Base location")}{textField("primaryVenueSlug", "Primary place slug (optional)")}</>}
        {kind === "places" && <>{textField("sector", "Sector")}{textField("address", "Address")}</>}
        {kind === "events" && <>{textField("communitySlug", "Community slug")}{textField("communityName", "Community display name")}{textField("venueSlug", "Place slug")}{textField("venueName", "Place display name")}{textField("sector", "Sector")}{textField("date", "Date (IST)", "date")}{textField("startTime", "Start display time (e.g. 06:00 AM)")}{textField("endTime", "End display time (e.g. 07:00 AM)")}{textField("startsAt", "Start timestamp with timezone offset")}{textField("endsAt", "End timestamp with timezone offset")}{textField("capacity", "Capacity", "number")}{textField("price", "Price (FREE or information only)")}{textField("organizerUserId", "Organizer Appwrite user ID (blank removes assignment)")}</>}
        <label className="block text-sm sm:col-span-2"><span>Description (plain text)</span><textarea className="admin-field" value={String(draft?.description ?? "")} onChange={event => patch("description", event.target.value)} readOnly={busy || !draft} rows={4} /></label>
        {checkField("demo", "Demo / fictional content")}{kind !== "activities" && checkField("featured", "Featured")}{kind === "communities" && checkField("verified", "Verified community")}
      </div>
      <details className="mt-6"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Advanced record JSON</summary><label className="block text-sm"><span>Complete validated record</span><textarea value={json} onChange={event => { if (!busy) setJson(event.target.value); }} readOnly={busy} rows={20} spellCheck={false} className="admin-field font-mono text-xs" aria-describedby="json-help" /></label></details>
      <p id="json-help" className="mt-3 text-xs text-text-secondary">No HTML or unknown fields. Images: /images/... or HTTPS. Counts are derived from participation, not editable marketing figures. Published event references must be published. Start/end timestamps must agree with display times in Asia/Kolkata.</p>
      <label className="mt-5 block text-sm"><span>Mutation reason (required, 5–300 characters)</span><input value={reason} onChange={event => setReason(event.target.value)} readOnly={busy} maxLength={300} className="admin-field" aria-describedby={error ? "content-error" : undefined} /></label>
      <div className="admin-actions mt-5"><button type="button" className="button-primary min-h-11 px-4" onClick={save} aria-disabled={busy || !writesEnabled}>{selected ? "Save changes" : "Create record"}</button><button type="button" className={buttonClass} onClick={() => { if (busy) return; setJson(""); setSelected(null); newButtonRef.current?.focus(); }} aria-disabled={busy}>Close editor</button></div>
      <p className="mt-4 text-xs text-text-secondary">Stale forms are rejected using updatedAt. This is a best-effort document check, not atomic compare-and-swap; simultaneous writes can still race. Reopen after refreshing to review the latest server version. Never blindly repeat an action with an incomplete audit result.</p>
      {selected && <details className="mt-6"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-rose-300">Permanent deletion</summary><p className="text-sm text-text-secondary">Prefer draft/unpublish to preserve history. Deletion is refused for editorial references or any private participation, saves or follows.</p><label className="mt-3 block text-sm"><span>Type the exact record ID: {selected.id}</span><input value={confirmation} onChange={event => setConfirmation(event.target.value)} readOnly={busy} autoComplete="off" className="admin-field" /></label><button type="button" className={`${buttonClass} mt-3 text-rose-300`} onClick={remove} aria-disabled={busy || !writesEnabled}>Delete permanently</button></details>}
    </section>}
  </div>;
}
