"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { MAX_TICKET_RUPEES, paidPrice, parseEventPrice } from "@/lib/pricing";

export interface EditorOption { slug: string; name: string; detail?: string; }
export interface EditorValues {
  communitySlug?: string;
  title: string; description: string; date: string; startTime: string; endTime: string;
  venueSlug: string; capacity: number; price: string; status: "draft" | "published" | "cancelled";
  level?: string; distance?: string; pace?: string; routeOverview?: string; whatToBring?: string[];
}
interface Props {
  mode: "create" | "edit";
  clubs: EditorOption[];
  venues: EditorOption[];
  initial: EditorValues;
  eventId?: string;
  expectedUpdatedAt?: string;
  confirmedRsvps?: number;
  clubName?: string;
}

/** "06:30 AM" <-> "06:30" for <input type="time">. */
function to24(value: string): string {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(value);
  if (!match) return "";
  const hours = Number(match[1]) % 12 + (match[3] === "PM" ? 12 : 0);
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}
function to12(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const field = "mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface-elevated px-3 text-base text-white";
const labelClass = "block text-sm font-semibold text-white";
const hint = "mt-1 text-xs text-text-secondary";

export function EventEditor({ mode, clubs, venues, initial, eventId, expectedUpdatedAt, confirmedRsvps = 0, clubName }: Props) {
  const router = useRouter();
  const initialPricing = parseEventPrice(initial.price);
  // Free-form price text is no longer accepted, so it opens as "Paid" with the amount left to fill in.
  const [values, setValues] = useState({ ...initial, startTime: to24(initial.startTime), endTime: to24(initial.endTime), whatToBring: (initial.whatToBring ?? []).join("\n"), paid: initialPricing.kind !== "free", amount: initialPricing.kind === "paid" ? String(initialPricing.amount / 100) : "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues(current => ({ ...current, [key]: value }));

  async function submit(form: React.FormEvent) {
    form.preventDefault();
    if (pending) return;
    setPending(true); setError("");
    const event = {
      ...(mode === "create" ? { communitySlug: values.communitySlug } : {}),
      title: values.title, description: values.description, date: values.date,
      startTime: to12(values.startTime), endTime: to12(values.endTime),
      venueSlug: values.venueSlug, capacity: Number(values.capacity), price: values.paid ? paidPrice(Number(values.amount)) : "FREE", status: values.status,
      level: values.level || undefined, distance: values.distance || undefined, pace: values.pace || undefined, routeOverview: values.routeOverview || undefined,
      whatToBring: values.whatToBring.split("\n").map(line => line.trim()).filter(Boolean),
    };
    try {
      const response = await fetch(mode === "create" ? "/api/organizer/events" : `/api/organizer/events/${encodeURIComponent(eventId ?? "")}`, {
        method: mode === "create" ? "POST" : "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "create" ? { event } : { event, expectedUpdatedAt }),
      });
      if (response.status === 401) { router.push(`/login?callbackUrl=${encodeURIComponent(location.pathname)}`); return; }
      const data = await response.json().catch(() => null) as { id?: string; error?: string } | null;
      if (!response.ok || !data?.id) throw new Error(data?.error || "The event could not be saved. Try again.");
      router.push(`/organizer/events/${encodeURIComponent(data.id)}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The event could not be saved.");
      setPending(false);
    }
  }

  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
    <Link href={eventId ? `/organizer/events/${encodeURIComponent(eventId)}` : "/organizer"} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-white"><ArrowLeft size={16} aria-hidden="true" />{eventId ? "Back to check-in desk" : "All sessions"}</Link>
    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">{mode === "create" ? "New session" : "Edit session"}</h1>
    <p className="mt-2 text-sm text-text-secondary">{mode === "create" ? "You’ll be the organizer for this session, so you can scan people in on the day." : `${clubName ?? "Club"} · ${confirmedRsvps} confirmed RSVP${confirmedRsvps === 1 ? "" : "s"}. People who RSVP’d keep their spot when you change details.`}</p>

    <form onSubmit={submit} className="mt-6 space-y-6">
      <fieldset className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-6" disabled={pending}>
        <legend className="px-1 text-sm font-bold uppercase tracking-widest text-velocity">Basics</legend>
        {mode === "create" && <label className={labelClass}>Club<select required value={values.communitySlug ?? ""} onChange={change => set("communitySlug", change.target.value)} className={field}><option value="" disabled>Choose a club</option>{clubs.map(club => <option key={club.slug} value={club.slug}>{club.name}</option>)}</select></label>}
        <label className={labelClass}>Title<input required minLength={2} maxLength={200} value={values.title} onChange={change => set("title", change.target.value)} className={field} placeholder="Sunday sunrise 5K" /></label>
        <label className={labelClass}>Description<textarea required minLength={20} maxLength={12000} rows={5} value={values.description} onChange={change => set("description", change.target.value)} className={`${field} py-2`} placeholder="Who it’s for, where to meet, what to expect." /><span className={hint}>At least 20 characters. Plain text only.</span></label>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-6" disabled={pending}>
        <legend className="px-1 text-sm font-bold uppercase tracking-widest text-velocity">When and where</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>Date<input type="date" required value={values.date} onChange={change => set("date", change.target.value)} className={field} /></label>
          <label className={labelClass}>Starts<input type="time" required value={values.startTime} onChange={change => set("startTime", change.target.value)} className={field} /></label>
          <label className={labelClass}>Ends<input type="time" required value={values.endTime} onChange={change => set("endTime", change.target.value)} className={field} /></label>
        </div>
        <p className={hint}>Times are India time (IST). Check-in opens 30 minutes before the start.</p>
        <label className={labelClass}>Venue<select required value={values.venueSlug} onChange={change => set("venueSlug", change.target.value)} className={field}><option value="" disabled>Choose a venue</option>{venues.map(place => <option key={place.slug} value={place.slug}>{place.name}{place.detail ? ` · ${place.detail}` : ""}</option>)}</select><span className={hint}>Missing a venue? Ask the NOIDA.FIT team to add it.</span></label>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4 sm:p-6" disabled={pending}>
        <legend className="px-1 text-sm font-bold uppercase tracking-widest text-velocity">Spots and details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Spots available<input type="number" required min={Math.max(1, confirmedRsvps)} max={100000} value={values.capacity} onChange={change => set("capacity", Number(change.target.value))} className={field} />{confirmedRsvps > 0 && <span className={hint}>Can’t go below the {confirmedRsvps} people already going.</span>}</label>
          <div>
            <label className={labelClass}>Price<select value={values.paid ? "paid" : "free"} onChange={change => set("paid", change.target.value === "paid")} className={field}><option value="free">Free</option><option value="paid">Paid ticket</option></select></label>
            {values.paid && <label className={`${labelClass} mt-3`}>Ticket price (₹)<input type="number" inputMode="numeric" required min={1} max={MAX_TICKET_RUPEES} step={1} value={values.amount} onChange={change => set("amount", change.target.value)} className={field} placeholder="199" /><span className={hint}>{initialPricing.kind === "info" ? `Was “${initial.price}”. Set an amount, or choose Free. ` : ""}Per person. Online payment isn’t open yet, so you collect it at the event. People who already have a ticket keep the price they booked at.</span></label>}
          </div>
          <label className={labelClass}>Level <span className="font-normal text-text-secondary">(optional)</span><input maxLength={100} value={values.level ?? ""} onChange={change => set("level", change.target.value)} className={field} placeholder="All levels" /></label>
          <label className={labelClass}>Distance <span className="font-normal text-text-secondary">(optional)</span><input maxLength={100} value={values.distance ?? ""} onChange={change => set("distance", change.target.value)} className={field} placeholder="5 km" /></label>
        </div>
        <label className={labelClass}>Pace <span className="font-normal text-text-secondary">(optional)</span><input maxLength={200} value={values.pace ?? ""} onChange={change => set("pace", change.target.value)} className={field} placeholder="Conversational, 6:30–7:00 /km" /></label>
        <label className={labelClass}>Route or plan <span className="font-normal text-text-secondary">(optional)</span><textarea maxLength={2000} rows={3} value={values.routeOverview ?? ""} onChange={change => set("routeOverview", change.target.value)} className={`${field} py-2`} /></label>
        <label className={labelClass}>What to bring <span className="font-normal text-text-secondary">(one per line)</span><textarea rows={3} value={values.whatToBring} onChange={change => set("whatToBring", change.target.value)} className={`${field} py-2`} placeholder={"Water bottle\nRunning shoes"} /></label>
      </fieldset>

      <fieldset className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-6" disabled={pending}>
        <legend className="px-1 text-sm font-bold uppercase tracking-widest text-velocity">Visibility</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {([["draft", "Draft", "Only you can see it."], ["published", "Published", "Listed publicly; people can RSVP."], ...(mode === "edit" ? [["cancelled", "Cancelled", "Shown as cancelled; RSVPs stop."]] : [])] as [EditorValues["status"], string, string][]).map(([value, label, description]) =>
            <label key={value} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${values.status === value ? "border-velocity bg-velocity/10" : "border-border-strong"}`}>
              <input type="radio" name="status" value={value} checked={values.status === value} onChange={() => set("status", value)} className="mt-1 accent-[var(--accent-velocity)]" />
              <span><span className="block text-sm font-semibold text-white">{label}</span><span className="block text-xs text-text-secondary">{description}</span></span>
            </label>)}
        </div>
      </fieldset>

      {error && <p className="rounded-lg border border-rose-400/60 bg-rose-400/10 p-3 text-sm text-rose-200" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="button-primary inline-flex min-h-11 items-center gap-2 px-5">{pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{mode === "create" ? "Create session" : "Save changes"}</button>
        <Link href={eventId ? `/organizer/events/${encodeURIComponent(eventId)}` : "/organizer"} className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-text-secondary hover:text-white">Cancel</Link>
      </div>
    </form>
  </div>;
}
