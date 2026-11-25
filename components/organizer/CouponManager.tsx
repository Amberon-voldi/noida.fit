"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LoaderCircle, Pause, Play, TicketPercent, Trash2 } from "lucide-react";
import { indiaLocalToIso } from "@/lib/booking-window";
import { couponCodeSchema, MAX_COUPONS_PER_EVENT, type EditableCoupon } from "@/lib/coupon-schema";
import { formatInr } from "@/lib/pricing";

const field = "mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface-elevated px-3 text-base text-white";
const labelClass = "block text-sm font-semibold text-white";
const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

interface Props {
  eventId: string;
  /** Null for a free session: codes discount a ticket price. */
  ticketPaise: number | null;
  initialCoupons: EditableCoupon[];
}

/** The ticket price with a code, as the server prices it: percent discounts round to whole rupees. */
function discounted(price: number, kind: "percent" | "flat", value: number): number {
  return price - (kind === "percent" ? Math.round(price * value / 10000) * 100 : value * 100);
}

/** A paid session's discount codes: create, pause, resume and delete them without editing the session. */
export function CouponManager({ eventId, ticketPaise, initialCoupons }: Props) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  // When the tab opened: whether a code has expired is read against it.
  const [now] = useState(() => Date.now());

  if (ticketPaise === null) return <p className="rounded-xl border border-dashed border-border-strong p-6 text-sm text-text-secondary">Free session: no discount codes.</p>;
  const price = ticketPaise;

  async function send(url: string, init: RequestInit): Promise<EditableCoupon[]> {
    const response = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
    const data = await response.json().catch(() => null) as { coupons?: EditableCoupon[]; error?: string } | null;
    if (!response.ok || !data?.coupons) throw new Error(data?.error || "That didn’t work. Try again.");
    return data.coupons;
  }

  const amount = Number(value);
  const preview = value && Number.isInteger(amount) && amount > 0 ? discounted(price, kind, Math.min(amount, kind === "percent" ? 100 : amount)) : null;

  async function create(form: React.FormEvent): Promise<void> {
    form.preventDefault();
    const parsed = couponCodeSchema.safeParse(code);
    if (!parsed.success) { setError("Code: 3–20 letters, numbers, - or _"); return; }
    if (!Number.isInteger(amount) || amount < 1 || (kind === "percent" && amount > 100)) { setError(kind === "percent" ? "Discount: 1–100%" : "Discount: at least ₹1"); return; }
    if (preview !== null && preview < 100) { setError(`Too large: the ticket must still cost at least ₹1`); return; }
    const limit = maxUses.trim() ? Number(maxUses) : undefined;
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) { setError("Usage limit: a whole number, or empty"); return; }
    const expiresAt = expires ? indiaLocalToIso(expires) : undefined;
    if (expires && !expiresAt) { setError("Pick a valid expiry"); return; }
    setPending("create"); setError(null);
    try {
      const next = await send(`/api/organizer/events/${encodeURIComponent(eventId)}/coupons`, { method: "POST", body: JSON.stringify({ coupon: { code: parsed.data, kind, value: amount, ...(limit ? { maxUses: limit } : {}), ...(expiresAt ? { expiresAt } : {}) } }) });
      setCoupons(next);
      setFresh(next.find(item => item.code === parsed.data)?.id ?? null);
      setCode(""); setValue(""); setMaxUses(""); setExpires("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The code could not be created.");
    } finally {
      setPending(null);
    }
  }

  async function togglePause(coupon: EditableCoupon): Promise<void> {
    setPending(coupon.id); setError(null);
    try {
      setCoupons(await send(`/api/organizer/events/${encodeURIComponent(eventId)}/coupons/${encodeURIComponent(coupon.id)}`, { method: "PATCH", body: JSON.stringify({ coupon: { paused: !coupon.paused } }) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The code could not be changed.");
    } finally {
      setPending(null);
    }
  }

  async function remove(id: string): Promise<void> {
    if (confirmDelete !== id) { setConfirmDelete(id); window.setTimeout(() => setConfirmDelete(current => current === id ? null : current), 4000); return; }
    setConfirmDelete(null); setPending(id); setError(null);
    try {
      setCoupons(await send(`/api/organizer/events/${encodeURIComponent(eventId)}/coupons/${encodeURIComponent(id)}`, { method: "DELETE" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The code could not be deleted.");
    } finally {
      setPending(null);
    }
  }

  async function copy(text: string, id: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(current => current === id ? null : current), 2000); } catch { /* The code stays visible. */ }
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <form onSubmit={create} className="h-fit space-y-4 rounded-2xl border border-border-strong bg-surface p-4 sm:p-6" noValidate>
      <h2 className="flex items-center gap-2 text-xl font-bold text-white"><TicketPercent size={20} className="text-velocity" aria-hidden="true" />New discount code</h2>
      <fieldset disabled={pending === "create" || coupons.length >= MAX_COUPONS_PER_EVENT} className="space-y-4">
        <label className={labelClass}>Code
          <input required maxLength={20} value={code} onChange={change => setCode(change.target.value.toUpperCase())} placeholder="EARLYBIRD" autoCapitalize="characters" autoComplete="off" spellCheck={false} className={`${field} font-mono uppercase`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>Type
            <select value={kind} onChange={change => setKind(change.target.value as "percent" | "flat")} className={field}><option value="percent">% off</option><option value="flat">₹ off</option></select>
          </label>
          <label className={labelClass}>{kind === "percent" ? "Percent" : "Rupees"}
            <input type="number" inputMode="numeric" required min={1} max={kind === "percent" ? 100 : undefined} step={1} value={value} onChange={change => setValue(change.target.value)} placeholder={kind === "percent" ? "20" : "50"} className={field} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>Usage limit
            <input type="number" inputMode="numeric" min={1} step={1} value={maxUses} onChange={change => setMaxUses(change.target.value)} placeholder="No limit" className={field} />
          </label>
          <label className={labelClass}>Expires
            <input type="datetime-local" value={expires} onChange={change => setExpires(change.target.value)} className={field} />
          </label>
        </div>
      </fieldset>
      <p className="text-sm text-text-secondary">{formatInr(price)} → <span className={`font-mono font-bold ${preview !== null && preview < 100 ? "text-rose-200" : "text-white"}`}>{preview === null ? "—" : preview < 100 ? "too large" : formatInr(preview)}</span></p>
      <button type="submit" disabled={pending === "create" || coupons.length >= MAX_COUPONS_PER_EVENT} className="button-primary w-full">{pending === "create" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <TicketPercent className="h-4 w-4" aria-hidden="true" />}Create code</button>
      {error && <p role="alert" className="rounded-lg border border-rose-400/60 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    </form>

    <section aria-labelledby="coupon-list-heading" className="min-w-0">
      <h2 id="coupon-list-heading" className="text-xl font-bold text-white">Your codes</h2>
      {coupons.length ? <ul className="mt-3 space-y-3">
        {coupons.map(coupon => {
          const expired = coupon.expiresAt ? Date.parse(coupon.expiresAt) <= now : false;
          const usedUp = coupon.maxUses !== undefined && coupon.uses >= coupon.maxUses;
          const status = coupon.paused ? "Paused" : expired ? "Expired" : usedUp ? "Used up" : "Active";
          const final = discounted(price, coupon.kind, coupon.value);
          return <li key={coupon.id} className={`rounded-xl border bg-surface p-4 ${fresh === coupon.id ? "border-velocity/70" : "border-border-subtle"} ${status !== "Active" ? "opacity-75" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-lg font-bold text-white">{coupon.code}</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {coupon.kind === "percent" ? `${coupon.value}% off` : `${formatInr(coupon.value * 100)} off`} · {final >= 100 ? formatInr(final) : "too large"} · used {coupon.uses}{coupon.maxUses ? `/${coupon.maxUses}` : ""}{coupon.expiresAt ? ` · until ${dateFormatter.format(new Date(coupon.expiresAt))}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Active" ? "bg-velocity/15 text-velocity" : "border border-border-subtle text-text-secondary"}`}>{status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(coupon.code, coupon.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-semibold text-white hover:bg-surface-hover">{copied === coupon.id ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === coupon.id ? "Copied" : "Copy"}</button>
              <button type="button" onClick={() => togglePause(coupon)} disabled={pending === coupon.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-semibold text-white hover:bg-surface-hover">
                {pending === coupon.id ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : coupon.paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{coupon.paused ? "Resume" : "Pause"}
              </button>
              <button type="button" onClick={() => remove(coupon.id)} disabled={pending === coupon.id} className={`ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${confirmDelete === coupon.id ? "border border-rose-400 bg-rose-500/15 text-rose-200" : "text-text-secondary hover:text-rose-200"}`}>
                <Trash2 size={15} aria-hidden="true" />{confirmDelete === coupon.id ? "Tap again to delete" : "Delete"}
              </button>
            </div>
          </li>;
        })}
      </ul> : <p className="mt-3 rounded-xl border border-dashed border-border-strong p-5 text-sm text-text-secondary">No codes yet.</p>}
    </section>
  </div>;
}
