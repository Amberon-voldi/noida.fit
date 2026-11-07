"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentKind } from "@/lib/content-schema";
import { isMediaPath, MEDIA_ACCEPT, MEDIA_MAX_BYTES } from "@/lib/media";

type Entry = { id: string; updatedAt: string; record: Record<string, unknown> };
const labels: Record<ContentKind, string> = { activities: "Activities", communities: "Communities", places: "Places", events: "Events" };
const singular: Record<ContentKind, string> = { activities: "activity", communities: "community", places: "place", events: "event" };
const nameOf = (kind: ContentKind, record: Record<string, unknown>) => String(record[kind === "events" ? "title" : "name"] ?? record.slug ?? "Untitled");
const buttonClass = "button-secondary min-h-11 px-4";
/** Image fields the public pages display, per content type. Other image fields stay in Advanced JSON. */
const imageFields: Record<ContentKind, [key: string, label: string, hint: string][]> = {
  activities: [],
  communities: [["crestUrl", "Logo", "Square works best. Shown beside the club name."], ["bannerUrl", "Banner image", "Wide (about 3:1). Shown on the club page and cards."]],
  places: [["coverImageUrl", "Cover image", "Wide (about 3:1). Shown on the place page and cards."]],
  events: [["coverImageUrl", "Cover image", "Wide (about 16:9). Shown on the event page and cards."]],
};
const optionalKeys = new Set(["organizerUserId", "primaryVenueSlug", "communityCrestUrl", ...Object.values(imageFields).flat().map(([key]) => key)]);
const categories = ["running", "cycling", "strength", "sports", "wellness", "outdoor"] as const;
/** Other content each editor links to, loaded for its dropdowns. */
const referenceKinds: Record<ContentKind, ContentKind[]> = { activities: [], communities: ["activities", "places"], places: ["activities"], events: ["activities", "communities", "places"] };
type Option = { value: string; label: string };
type Member = { id: string; name: string; enabled: boolean };
/** Lowercase hyphenated slug (the schema's format), from a name or title; "" if nothing usable is left. */
export function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 110).replace(/-+$/g, "");
}
const statusNote = (record: Record<string, unknown>) => record.status === "published" ? "" : ` · ${String(record.status ?? "draft")}`;

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
  const [refs, setRefs] = useState<Partial<Record<ContentKind, Entry[]>>>({});
  const [refsError, setRefsError] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [membersError, setMembersError] = useState("");
  const editing = Boolean(json);
  // New records keep their slug in step with the name until the slug is edited by hand.
  const [slugFollowsName, setSlugFollowsName] = useState(false);

  const visible = useMemo(() => records.filter(item =>
    (!search.trim() || JSON.stringify(item.record).toLowerCase().includes(search.trim().toLowerCase())) && (status === "all" || item.record.status === status),
  ), [records, search, status]);
  const draft = useMemo(() => {
    try { const value: unknown = JSON.parse(json); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
    catch { return null; }
  }, [json]);
  const busy = Boolean(pending);
  // Load the records this editor links to once it opens, so references are picked, not typed.
  useEffect(() => {
    const needed = referenceKinds[kind].filter(other => !refs[other]);
    if (!editing || !needed.length) return;
    const controller = new AbortController();
    void Promise.all(needed.map(async other => {
      const response = await fetch(`/api/admin/content/${other}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json().catch(() => null) as { records?: Entry[]; error?: string } | null;
      if (!response.ok || !data?.records) throw new Error(data?.error || `${labels[other]} could not be loaded`);
      return [other, data.records] as const;
    })).then(loaded => { setRefs(current => ({ ...current, ...Object.fromEntries(loaded) })); setRefsError(""); })
      .catch(caught => { if (!(caught instanceof Error && caught.name === "AbortError")) setRefsError(`${caught instanceof Error ? caught.message : "Linked records could not be loaded"}. Use Advanced JSON, or close and reopen the editor to retry.`); });
    return () => controller.abort();
  }, [editing, kind, refs]);
  // Organizer search: member accounts by name, 25 at a time.
  useEffect(() => {
    if (!editing || kind !== "events") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/admin/members?q=${encodeURIComponent(memberQuery.trim())}`, { cache: "no-store", signal: controller.signal })
        .then(async response => {
          const data = await response.json().catch(() => null) as { members?: Member[]; error?: string } | null;
          if (!response.ok || !data?.members) throw new Error(data?.error || "Members could not be loaded");
          setMembers(data.members); setMembersError("");
        })
        .catch(caught => { if (!(caught instanceof Error && caught.name === "AbortError")) setMembersError(caught instanceof Error ? caught.message : "Members could not be loaded"); });
    }, memberQuery ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [editing, kind, memberQuery]);
  function patchMany(changes: Record<string, unknown>) {
    if (!draft || busy) return;
    const next = { ...draft };
    for (const [key, value] of Object.entries(changes)) {
      if ((value === "" || value === undefined) && optionalKeys.has(key)) delete next[key];
      else next[key] = value;
    }
    setJson(JSON.stringify(next, null, 2));
  }
  function patch(key: string, value: unknown) {
    if (!draft || busy) return;
    const next = { ...draft };
    if (value === "" && optionalKeys.has(key)) delete next[key];
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
    setSlugFollowsName(!item);
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
  async function upload(key: string, label: string, file: File | undefined) {
    if (!file || !draft || busy) return;
    setError(""); setMessage("");
    if (file.size > MEDIA_MAX_BYTES) { setError("Images must be 5 MB or smaller."); return; }
    setPending(`Uploading ${label.toLowerCase()}…`);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("reason", `Upload ${label.toLowerCase()} for ${singular[kind]} ${String(draft.slug ?? "draft").slice(0, 120)}`);
      const response = await fetch("/api/admin/media", { method: "POST", body: form, cache: "no-store" });
      const data = await response.json().catch(() => null) as { media?: { path?: string }; error?: string } | null;
      if (!response.ok || !data?.media?.path) throw new Error(data?.error || "The image could not be uploaded.");
      // Fields and the Advanced JSON are read-only while an upload runs, so `draft` is still current.
      setJson(JSON.stringify({ ...draft, [key]: data.media.path }, null, 2));
      setMessage(`${label} uploaded. Save the record to use it.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The image could not be uploaded."); }
    finally { setPending(""); }
  }
  function imageField(key: string, label: string, hint: string) {
    const value = String(draft?.[key] ?? "");
    // Preview only site-hosted images; external URLs are shown as text.
    const preview = isMediaPath(value) || value.startsWith("/images/") ? value : "";
    const inputId = `image-${key}`;
    return <div key={key} className="admin-image-field">
      <div className="admin-image-preview" data-shape={key === "crestUrl" ? "square" : "wide"} aria-hidden={!preview}>{preview
        // eslint-disable-next-line @next/next/no-img-element -- small admin preview of the stored file, no optimization needed
        ? <img src={preview} alt={`Current ${label.toLowerCase()}`} />
        : <span>No image</span>}</div>
      <div className="admin-image-controls space-y-2">
        <label><span>{label}</span><input value={value} readOnly={busy || !draft} onChange={event => patch(key, event.target.value)} placeholder="Upload, or paste /images/... or an HTTPS URL" className="admin-field" aria-describedby={`${inputId}-hint`} /></label>
        <p id={`${inputId}-hint`} className="admin-note">{hint} JPEG, PNG, WebP, GIF or AVIF, up to 5 MB.</p>
        <div className="admin-actions">
          <label className={`${buttonClass} inline-flex cursor-pointer items-center ${busy || !draft || !writesEnabled ? "pointer-events-none opacity-60" : ""}`}>
            Upload image
            <input id={inputId} type="file" accept={MEDIA_ACCEPT} aria-label={`Upload ${label.toLowerCase()}`} className="sr-only" disabled={busy || !draft || !writesEnabled} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void upload(key, label, file); }} />
          </label>
          {value && <button type="button" className={buttonClass} onClick={() => patch(key, "")} disabled={busy || !draft}>Remove</button>}
        </div>
      </div>
    </div>;
  }
  /** The name's slug, made unique against the other records on this page (-2, -3, …). */
  function slugFromName(name: string): string {
    const base = slugify(name);
    if (!base) return "";
    const taken = new Set(records.filter(item => item.id !== selected?.id).map(item => String(item.record.slug)));
    let candidate = base;
    for (let n = 2; taken.has(candidate); n += 1) candidate = `${base}-${n}`;
    return candidate;
  }
  function nameField() {
    const key = kind === "events" ? "title" : "name";
    return <label key={key}><span>{kind === "events" ? "Title" : "Name"}</span><input value={String(draft?.[key] ?? "")} readOnly={busy || !draft} onChange={event => {
      const value = event.target.value;
      const slug = slugFollowsName ? slugFromName(value) : "";
      patchMany(slug ? { [key]: value, slug } : { [key]: value });
    }} className="admin-field" /></label>;
  }
  function slugField() {
    const name = String(draft?.[kind === "events" ? "title" : "name"] ?? "");
    return <div key="slug" className="min-w-0"><label htmlFor="content-slug"><span>Slug</span></label>
      <input id="content-slug" value={String(draft?.slug ?? "")} readOnly={busy || !draft} onChange={event => { setSlugFollowsName(false); patch("slug", event.target.value.toLowerCase()); }} spellCheck={false} autoCapitalize="none" className="admin-field font-mono" aria-describedby="content-slug-help" />
      <small id="content-slug-help" className="admin-note block">{slugFollowsName ? "Made from the name as you type. Edit it to choose your own." : selected ? "The page’s web address. Changing it breaks existing links." : "Your own slug; it no longer follows the name."}</small>
      {!slugFollowsName && <button type="button" className={`${buttonClass} mt-2`} disabled={busy || !draft || !slugify(name)} onClick={() => { const slug = slugFromName(name); if (slug) patch("slug", slug); if (!selected) setSlugFollowsName(true); }}>Make from name</button>}
    </div>;
  }
  function textField(key: string, label: string, type = "text") {
    return <label key={key}><span>{label}</span><input type={type} value={String(draft?.[key] ?? "")} readOnly={busy || !draft} onChange={event => patch(key, type === "number" ? Number(event.target.value) : event.target.value)} className="admin-field" /></label>;
  }
  function options(other: ContentKind, value: (record: Record<string, unknown>, id: string) => string): Option[] {
    return (refs[other] ?? []).map(item => ({ value: value(item.record, item.id), label: `${nameOf(other, item.record)}${statusNote(item.record)}` }));
  }
  function selectField(key: string, label: string, choices: Option[] | null, settings: { optional?: string; onSelect?: (value: string) => void; help?: string } = {}) {
    const current = String(draft?.[key] ?? "");
    const known = choices?.some(choice => choice.value === current);
    const helpId = settings.help ? `ref-${key}-help` : undefined;
    // Label by id, not by wrapping: a wrapped <select> adds its chosen option to its own name.
    return <div key={key} className="min-w-0"><label htmlFor={`ref-${key}`}><span>{label}</span></label>
      <select id={`ref-${key}`} value={current} onChange={event => settings.onSelect ? settings.onSelect(event.target.value) : patch(key, event.target.value)} disabled={busy || !draft} className="admin-field" aria-describedby={helpId}>
        {settings.optional !== undefined ? <option value="">{settings.optional}</option> : !current && <option value="" disabled>{choices ? "Choose…" : "Loading…"}</option>}
        {/* Keep a saved value visible even when it is not (or not yet) in the list. */}
        {current && !known && <option value={current}>{choices ? `${current} (not found)` : current}</option>}
        {(choices ?? []).map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
      </select>
      {settings.help && <small id={helpId} className="admin-note block">{settings.help}</small>}
    </div>;
  }
  /** Distinct non-empty values of one field across records, for suggestions. */
  function distinct(entries: Entry[] | undefined, key: string): string[] {
    return [...new Set((entries ?? []).map(item => item.record[key]).filter((value): value is string => typeof value === "string" && value.trim() !== "").map(value => value.trim()))].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }
  /** Free text with a dropdown of values already in use: pick one, or type a new one. */
  function suggestField(key: string, label: string, suggestions: string[], help: string) {
    const listId = `suggest-${key}`;
    return <div key={key} className="min-w-0"><label htmlFor={`${listId}-input`}><span>{label}</span></label>
      <input id={`${listId}-input`} value={String(draft?.[key] ?? "")} readOnly={busy || !draft} onChange={event => patch(key, event.target.value)} list={listId} autoComplete="off" placeholder={suggestions.length ? "Pick or type a new one" : undefined} className="admin-field" aria-describedby={`${listId}-help`} />
      <datalist id={listId}>{suggestions.map(value => <option key={value} value={value} />)}</datalist>
      <small id={`${listId}-help`} className="admin-note block">{help}</small>
    </div>;
  }
  function checkField(key: string, label: string) {
    return <label className="admin-checkbox" key={key}><input type="checkbox" checked={draft?.[key] === true} onChange={event => patch(key, event.target.checked)} disabled={busy || !draft} /><span>{label}</span></label>;
  }

  return <div className="admin-page">
    <header className="admin-page-header">
      <div><p className="eyebrow">Admin content</p><h1 className="admin-title">Manage {labels[kind].toLowerCase()}</h1><p className="admin-intro">Full validated records. Only published listings appear in public pages. Never store secrets in content, including drafts.</p></div>
      <div className="admin-actions"><button ref={newButtonRef} type="button" className="button-primary" onClick={() => open(null)} disabled={busy || !writesEnabled}>New {singular[kind]}</button><button type="button" className={buttonClass} onClick={reload} disabled={busy}>Refresh / retry</button></div>
    </header>
    {!writesEnabled && <p className="admin-warning" role="status">Writes are locked until the private audit store is configured. You can still review content.</p>}
    {error && <p id="content-error" className="admin-error mt-3" role="alert">{error}</p>}
    <p className="admin-note mt-3" role="status" aria-live="polite">{pending || message}</p>
    <section className="admin-section" aria-labelledby="content-list-heading" aria-busy={busy}>
      <div className="admin-filter-bar"><h2 id="content-list-heading">Records · {visible.length}</h2><div className="admin-actions"><label><span>Search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, slug, sector…" className="admin-field" /></label><label><span>Status</span><select value={status} onChange={event => setStatus(event.target.value)} className="admin-field"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></label></div></div>
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Content records, scroll for all columns"><table className="admin-table"><caption className="sr-only">{labels[kind]} content records</caption><thead><tr><th scope="col">Name / ID</th><th scope="col">Slug</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><th scope="row">{nameOf(kind, item.record)}<small className="block font-mono text-xs text-text-secondary">{item.id}</small></th><td>{String(item.record.slug ?? "—")}</td><td>{String(item.record.status ?? "unknown")}{item.record.demo === true ? " · demo" : ""}</td><td><button type="button" className={buttonClass} onClick={() => open(item)} disabled={busy} aria-label={`Edit ${nameOf(kind, item.record)}`}>Edit</button></td></tr>)}{!visible.length && <tr><td colSpan={4}>{error && !records.length ? "Records unavailable. Use Refresh / retry." : records.length ? "No records match these filters." : "No records yet. Create a draft to get started."}</td></tr>}</tbody></table></div>
    </section>
    {json && <section className="admin-panel admin-editor" aria-labelledby="editor-heading" aria-busy={busy}>
      <div className="admin-editor-heading"><h2 ref={headingRef} id="editor-heading" tabIndex={-1}>{selected ? `Edit ${nameOf(kind, selected.record)}` : `Create ${singular[kind]}`}</h2><button type="button" className={buttonClass} onClick={() => { if (busy) return; setJson(""); setSelected(null); newButtonRef.current?.focus(); }} disabled={busy}>Close editor</button></div>
      {selected && <p className="admin-note">Immutable ID: <code>{selected.id}</code></p>}
      <p className="admin-note">Set the basics, then save. Advanced JSON covers all optional fields, nested schedules, images, social links and amenities.</p>
      <fieldset className="admin-field-group"><legend>Listing basics</legend><div className="admin-fields">
        {nameField()}{slugField()}
        <label><span>Status (applies on save)</span><select value={String(draft?.status ?? "draft")} onChange={event => patch("status", event.target.value)} disabled={busy || !draft} className="admin-field"><option value="draft">Draft / unpublished</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></label>
        {kind === "places" && suggestField("category", "Category", distinct(records, "category"), "Choose a category other places use, or type a new one.")}
        {(kind === "events" || kind === "communities") && selectField("category", "Category", categories.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })))}
        {(kind === "events" || kind === "communities") && selectField("activityId", "Activity", refs.activities ? options("activities", (_record, id) => id) : null)}
        {kind === "activities" && textField("emoji", "Emoji")}
        {kind === "communities" && <>{textField("baseLocation", "Base location")}{selectField("primaryVenueSlug", "Primary place", refs.places ? options("places", record => String(record.slug)) : null, { optional: "No primary place" })}</>}
        {kind === "places" && <>{suggestField("sector", "Sector", distinct(records, "sector"), "Choose a sector other places use, or type a new one.")}{textField("address", "Address")}</>}
      </div></fieldset>
      {kind === "places" && <fieldset className="admin-field-group"><legend>Activities offered here</legend>
        {refs.activities ? <div className="admin-checkbox-row">{refs.activities.map(item => {
          const slug = String(item.record.slug);
          const selected = Array.isArray(draft?.activities) ? (draft.activities as unknown[]).map(String) : [];
          return <label className="admin-checkbox" key={item.id}><input type="checkbox" checked={selected.includes(slug)} disabled={busy || !draft} onChange={event => patch("activities", event.target.checked ? [...selected, slug] : selected.filter(value => value !== slug))} /><span>{nameOf("activities", item.record)}{statusNote(item.record)}</span></label>;
        })}{!refs.activities.length && <p className="admin-note">No activities yet.</p>}</div> : <p className="admin-note">Loading activities…</p>}
      </fieldset>}
      {refsError && <p className="admin-error mt-3" role="alert">{refsError}</p>}
      {kind === "events" && <>
        <fieldset className="admin-field-group"><legend>Community, venue & organizer</legend><div className="admin-fields">
          {selectField("communitySlug", "Community", refs.communities ? options("communities", record => String(record.slug)) : null, { help: "Also sets the club name and logo shown on the event.", onSelect: slug => {
            const club = refs.communities?.find(item => item.record.slug === slug)?.record;
            patchMany({ communitySlug: slug, ...(club ? { communityName: String(club.name ?? slug), communityCrestUrl: club.crestUrl as string | undefined } : {}) });
          } })}
          {selectField("venueSlug", "Place", refs.places ? options("places", record => String(record.slug)) : null, { help: "Also sets the place name and sector.", onSelect: slug => {
            const place = refs.places?.find(item => item.record.slug === slug)?.record;
            patchMany({ venueSlug: slug, ...(place ? { venueName: String(place.name ?? slug), ...(typeof place.sector === "string" && place.sector ? { sector: place.sector } : {}) } : {}) });
          } })}
          {suggestField("sector", "Sector", distinct(refs.places, "sector"), "Filled from the place; pick another sector or type one.")}
          <div className="admin-organizer-picker">
            <label><span>Find organizer by name</span><input type="search" value={memberQuery} onChange={event => setMemberQuery(event.target.value)} placeholder="Search members…" readOnly={busy || !draft} className="admin-field" /></label>
            {selectField("organizerUserId", "Organizer", members ? members.filter(member => member.enabled).map(member => ({ value: member.id, label: `${member.name} · ${member.id}` })) : null, { optional: "No organizer", help: membersError || "Gives this account event-scoped check-in access, not admin rights." })}
          </div>
        </div></fieldset>
        <fieldset className="admin-field-group"><legend>Schedule & capacity</legend><div className="admin-fields">{textField("date", "Date (IST)", "date")}{textField("startTime", "Start display time (e.g. 06:00 AM)")}{textField("endTime", "End display time (e.g. 07:00 AM)")}{textField("startsAt", "Start timestamp with timezone offset")}{textField("endsAt", "End timestamp with timezone offset")}{textField("capacity", "Capacity", "number")}{textField("price", "Price (FREE or information only)")}</div></fieldset>
      </>}
      {imageFields[kind].length > 0 && <fieldset className="admin-field-group"><legend>Images</legend><p className="admin-note">Uploads go to Appwrite Storage and appear on the site after you save the record.</p><div className="admin-image-fields">{imageFields[kind].map(([key, label, hint]) => imageField(key, label, hint))}</div></fieldset>}
      <fieldset className="admin-field-group"><legend>Description & flags</legend><label className="block"><span>Description (plain text)</span><textarea className="admin-field" value={String(draft?.description ?? "")} onChange={event => patch("description", event.target.value)} readOnly={busy || !draft} rows={3} /></label><div className="admin-checkbox-row">{checkField("demo", "Demo / fictional content")}{kind !== "activities" && checkField("featured", "Featured")}{kind === "communities" && checkField("verified", "Verified community")}</div></fieldset>
      <details className="admin-editor-disclosure"><summary>Advanced record JSON</summary><label className="block"><span>Complete validated record</span><textarea value={json} onChange={event => { if (!busy) setJson(event.target.value); }} readOnly={busy} rows={14} spellCheck={false} className="admin-field font-mono" aria-describedby="json-help" /></label><p id="json-help" className="admin-note mt-2">No HTML or unknown fields. Images: upload above, or /images/... or HTTPS. Counts are derived from participation, not editable marketing figures. Published event references must be published. Linked records are picked from dropdowns above. Start/end timestamps must agree with display times in Asia/Kolkata.</p></details>
      <div className="admin-field-group"><label className="block"><span>Mutation reason (required, 5–300 characters)</span><input value={reason} onChange={event => setReason(event.target.value)} readOnly={busy} maxLength={300} className="admin-field" aria-describedby={error ? "content-error" : undefined} /></label><div className="admin-actions mt-3"><button type="button" className="button-primary" onClick={save} disabled={busy || !writesEnabled}>{selected ? "Save changes" : "Create record"}</button></div></div>
      <p className="admin-note">Stale forms are rejected using updatedAt. This is a best-effort document check, not atomic compare-and-swap; simultaneous writes can still race. Reopen after refreshing to review the latest server version. Never blindly repeat an action with an incomplete audit result.</p>
      {selected && <details className="admin-editor-disclosure"><summary className="text-rose-300">Permanent deletion</summary><p className="admin-note">Prefer draft/unpublish to preserve history. Deletion is refused for editorial references or any private participation, saves or follows.</p><label className="mt-3 block"><span>Type the exact record ID: {selected.id}</span><input value={confirmation} onChange={event => setConfirmation(event.target.value)} readOnly={busy} autoComplete="off" className="admin-field" /></label><button type="button" className={`${buttonClass} mt-3 text-rose-300`} onClick={remove} disabled={busy || !writesEnabled}>Delete permanently</button></details>}
    </section>}
  </div>;
}
