"use client";

import { Plus, Trash2 } from "lucide-react";
import { indiaLocalToIso, isoToIndiaLocal } from "@/lib/booking-window";
import { couponCodeSchema, type CouponInput, type EditableCoupon } from "@/lib/coupon-schema";

/** One discount code as the form holds it: numbers and the expiry as typed. */
export interface CouponRow {
  key: string;
  id?: string;
  code: string;
  kind: "percent" | "flat";
  value: string;
  maxUses: string;
  expiresLocal: string;
  uses: number;
}

let nextKey = 0;
const newKey = () => `coupon-${nextKey++}`;

export function couponRowsOf(coupons: EditableCoupon[]): CouponRow[] {
  return coupons.map(coupon => ({
    key: newKey(), id: coupon.id, code: coupon.code, kind: coupon.kind, value: String(coupon.value),
    maxUses: coupon.maxUses ? String(coupon.maxUses) : "", expiresLocal: isoToIndiaLocal(coupon.expiresAt), uses: coupon.uses,
  }));
}

/** The rows as the server takes them. Throws a message naming the first code to fix. */
export function couponsFromRows(rows: CouponRow[]): CouponInput[] {
  const seen = new Set<string>();
  return rows.map((row, index) => {
    const name = row.code.trim() || `Code ${index + 1}`;
    const code = couponCodeSchema.safeParse(row.code);
    if (!code.success) throw new Error(`${name}: use 3–20 letters, numbers, - or _ for the code.`);
    if (seen.has(code.data)) throw new Error(`${code.data} is listed twice.`);
    seen.add(code.data);
    const value = Number(row.value);
    if (!Number.isInteger(value) || value < 1 || (row.kind === "percent" && value > 100)) throw new Error(`${code.data}: enter a discount of ${row.kind === "percent" ? "1–100%" : "at least ₹1"}.`);
    const maxUses = row.maxUses.trim() ? Number(row.maxUses) : undefined;
    if (maxUses !== undefined && (!Number.isInteger(maxUses) || maxUses < 1)) throw new Error(`${code.data}: the usage limit must be a whole number, or empty for no limit.`);
    const expiresAt = row.expiresLocal ? indiaLocalToIso(row.expiresLocal) : undefined;
    if (row.expiresLocal && !expiresAt) throw new Error(`${code.data}: pick a valid expiry time.`);
    return { ...(row.id ? { id: row.id } : {}), code: code.data, kind: row.kind, value, ...(maxUses ? { maxUses } : {}), ...(expiresAt ? { expiresAt } : {}) };
  });
}

const field = "mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface-elevated px-3 text-base text-white";
const labelClass = "block text-sm font-semibold text-white";
const hint = "mt-1 text-xs text-text-secondary";

interface Props {
  rows: CouponRow[];
  onChange: (rows: CouponRow[]) => void;
  max: number;
  /** The ticket price, to preview what each code makes it. */
  ticketRupees: number;
}

/** Discount codes for a paid session: each takes a percent or a rupee amount off, with an optional usage limit and expiry. */
export function CouponEditor({ rows, onChange, max, ticketRupees }: Props) {
  const update = (key: string, changes: Partial<CouponRow>) => onChange(rows.map(row => row.key === key ? { ...row, ...changes } : row));
  const preview = (row: CouponRow): string | null => {
    const value = Number(row.value);
    if (!ticketRupees || !Number.isFinite(value) || value <= 0) return null;
    const price = row.kind === "percent" ? Math.round(ticketRupees * (100 - Math.min(value, 100))) / 100 : ticketRupees - value;
    return price < 1 ? "Too large: a discounted ticket must still cost at least ₹1." : `Ticket becomes ₹${Number.isInteger(price) ? price : price.toFixed(2)}.`;
  };

  return <div className="space-y-4">
    <p className={hint}>People enter a code at checkout to get money off their ticket. Codes aren’t shown anywhere on the site, so share them yourself. People who already have a ticket keep the price they paid.</p>
    {rows.map(row => <div key={row.key} className="space-y-3 rounded-lg border border-border-strong p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className={labelClass}>Code<input required maxLength={20} value={row.code} onChange={change => update(row.key, { code: change.target.value.toUpperCase() })} className={`${field} font-mono uppercase`} placeholder="EARLYBIRD" autoCapitalize="characters" spellCheck={false} /></label>
        <label className={labelClass}>Discount type<select value={row.kind} onChange={change => update(row.key, { kind: change.target.value as CouponRow["kind"] })} className={field}><option value="percent">% off</option><option value="flat">₹ off</option></select></label>
        <label className={labelClass}>{row.kind === "percent" ? "Percent off" : "Rupees off"}<input type="number" inputMode="numeric" required min={1} max={row.kind === "percent" ? 100 : undefined} step={1} value={row.value} onChange={change => update(row.key, { value: change.target.value })} className={field} placeholder={row.kind === "percent" ? "20" : "50"} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Usage limit <span className="font-normal text-text-secondary">(optional)</span><input type="number" inputMode="numeric" min={1} step={1} value={row.maxUses} onChange={change => update(row.key, { maxUses: change.target.value })} className={field} placeholder="No limit" /></label>
        <label className={labelClass}>Expires <span className="font-normal text-text-secondary">(optional, India time)</span><input type="datetime-local" value={row.expiresLocal} onChange={change => update(row.key, { expiresLocal: change.target.value })} className={field} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={hint}>{[preview(row), row.id ? `Used ${row.uses} time${row.uses === 1 ? "" : "s"}${row.maxUses ? ` of ${row.maxUses}` : ""}.` : null].filter(Boolean).join(" ")}</p>
        <button type="button" onClick={() => onChange(rows.filter(item => item.key !== row.key))} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-text-secondary hover:text-white"><Trash2 size={16} aria-hidden="true" />Remove</button>
      </div>
    </div>)}
    {rows.length < max && <button type="button" onClick={() => onChange([...rows, { key: newKey(), code: "", kind: "percent", value: "", maxUses: "", expiresLocal: "", uses: 0 }])} className="button-secondary inline-flex items-center gap-2"><Plus size={16} aria-hidden="true" />Add a discount code</button>}
  </div>;
}
