"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { normalizeIndianMobile } from "@/lib/phone";
import { formatInr, parseEventPrice } from "@/lib/pricing";
import type { AppliedCoupon, TicketContact } from "./useEventBooking";
import type { TicketTier } from "@/lib/ticket-tiers";

interface Props {
  open: boolean;
  title: string;
  when: string;
  venueName: string;
  priceLabel: string;
  /** "online": pay on PayU now. "whatsapp": the spot is confirmed now, and the payment link is sent on WhatsApp. */
  mode: "online" | "whatsapp";
  /** The mobile number the member last gave; the summary starts with it filled in. */
  savedPhone?: string;
  /** The account's name, to fill in the name for a spot booked to pay on WhatsApp. */
  savedName?: string;
  /** The signed-in account the spot is booked on. */
  accountEmail?: string;
  pending: boolean;
  error: string | null;
  /** The ticket's price before a discount, shown struck through once a code is applied. */
  fullPriceLabel?: string;
  /** Discount codes, when this checkout takes them. */
  coupons?: { applied: AppliedCoupon | null; apply: (code: string) => Promise<string | null>; remove: () => void };
  /** The ticket types to pick from, when the event sells several. */
  tiers?: { list: TicketTier[]; selected?: string; choose: (id: string) => void };
  onConfirm: (contact: TicketContact) => void;
  onClose: () => void;
}

const inputClass = "mt-1.5 min-h-11 w-full rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-[15px] text-white transition-colors hover:border-border-strong focus:border-velocity focus:outline-none";

/**
 * The summary a member confirms before a paid ticket. Online, the ticket is confirmed once PayU confirms the
 * payment. While online payment is off, the spot is confirmed at once and the payment link goes to WhatsApp.
 */
export function TicketCheckout({ open, title, when, venueName, priceLabel, mode, savedPhone, savedName, accountEmail, pending, error, fullPriceLabel, coupons, tiers, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const nameId = useId();
  const phoneId = useId();
  const [name, setName] = useState(savedName ?? "");
  const [phone, setPhone] = useState(savedPhone ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const couponId = useId();
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const applied = coupons?.applied ?? null;

  async function applyCoupon(): Promise<void> {
    if (!coupons || applying) return;
    const code = couponCode.trim();
    if (!code) { setCouponError("Enter a discount code"); return; }
    setApplying(true);
    setCouponError(await coupons.apply(code));
    setApplying(false);
  }
  const whatsapp = mode === "whatsapp";

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nameMissing = whatsapp && name.trim().length < 2;
    const phoneInvalid = !normalizeIndianMobile(phone);
    setNameError(nameMissing ? "Enter your name" : null);
    setPhoneError(phoneInvalid ? `Enter a 10-digit Indian ${whatsapp ? "WhatsApp" : "mobile"} number` : null);
    if (nameMissing || phoneInvalid) return;
    onConfirm({ name: name.trim(), phone });
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} className="filter-dialog" onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="filter-dialog-panel" onSubmit={submit} noValidate>
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-border-strong sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-4 border-b border-border-subtle p-4 sm:p-6">
          <div className="min-w-0"><p className="eyebrow">Your ticket</p><h2 id={titleId} className="mt-1 text-xl font-bold">{title}</h2></div>
          <button type="button" aria-label="Close" onClick={onClose} className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-text-secondary"><X className="h-5 w-5" aria-hidden="true" /></button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
          <p className="text-sm text-text-secondary">{when} · {venueName}</p>
          {tiers && <fieldset>
            <legend className="text-sm font-semibold text-white">Ticket</legend>
            <div className="mt-1.5 grid gap-2">
              {tiers.list.map(tier => <label key={tier.id} className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 ${tiers.selected === tier.id ? "border-velocity bg-velocity/10" : "border-border-strong"}`}>
                <span className="flex min-w-0 items-start gap-3">
                  <input type="radio" name={`${titleId}-tier`} checked={tiers.selected === tier.id} onChange={() => { tiers.choose(tier.id); setCouponCode(""); setCouponError(null); }} disabled={pending} className="mt-1 size-4 shrink-0 accent-velocity" />
                  <span className="min-w-0"><span className="block text-sm font-semibold text-white">{tier.name}</span>{tier.description && <span className="mt-0.5 block text-xs text-text-secondary">{tier.description}</span>}</span>
                </span>
                <span className="shrink-0 font-mono text-sm font-bold text-white">{formatInr(tier.price * 100)}</span>
              </label>)}
            </div>
          </fieldset>}
          <dl className="rounded-lg border border-border-subtle bg-surface-elevated">
            {applied && fullPriceLabel ? <>
              <div className="flex items-center justify-between gap-3 px-4 pt-3"><dt className="text-sm text-text-secondary">1 ticket</dt><dd className="font-mono text-sm text-text-secondary line-through">{fullPriceLabel}</dd></div>
              <div className="flex items-center justify-between gap-3 px-4 pt-1"><dt className="text-sm text-velocity">{applied.code} · {applied.label}</dt><dd className="font-mono text-sm text-velocity">−{formatInr(Math.max(0, (parseEventPrice(fullPriceLabel).amount || 0) - applied.amount))}</dd></div>
              <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2"><dt className="text-sm font-semibold text-white">You pay</dt><dd className="font-mono text-lg font-bold text-white">{priceLabel}</dd></div>
            </> : <div className="flex items-center justify-between gap-3 px-4 py-3"><dt className="text-sm text-text-secondary">1 ticket</dt><dd className="font-mono text-lg font-bold text-white">{priceLabel}</dd></div>}
          </dl>
          {coupons && (applied
            ? <p className="flex items-center justify-between gap-3 text-sm text-text-secondary"><span className="font-semibold text-white">{applied.code}</span><button type="button" onClick={() => { coupons.remove(); setCouponCode(""); setCouponError(null); }} className="min-h-11 px-2 text-sm font-semibold text-text-secondary underline hover:text-white">Remove</button></p>
            : <div>
              <label htmlFor={couponId} className="text-sm font-semibold text-white">Discount code</label>
              <div className="mt-1.5 flex gap-2">
                <input id={couponId} type="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20} value={couponCode} onChange={event => { setCouponCode(event.target.value.toUpperCase()); setCouponError(null); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void applyCoupon(); } }} placeholder="CODE" aria-invalid={Boolean(couponError)} aria-describedby={couponError ? `${couponId}-error` : undefined} className={`${inputClass.replace("mt-1.5 ", "")} font-mono uppercase`} />
                <button type="button" onClick={() => void applyCoupon()} disabled={applying || pending} className="button-secondary shrink-0">{applying ? <LoaderCircle className="h-4 w-4 animate-spin" aria-label="Checking" /> : "Apply"}</button>
              </div>
              {couponError && <p id={`${couponId}-error`} role="alert" className="mt-1.5 text-xs text-rose-200">{couponError}</p>}
            </div>)}
          {whatsapp && accountEmail && <p className="break-words text-xs text-text-secondary">Booking on your account <span className="font-semibold text-white">{accountEmail}</span></p>}
          {whatsapp && <div>
            <label htmlFor={nameId} className="text-sm font-semibold text-white">Your name</label>
            <input id={nameId} type="text" autoComplete="name" required maxLength={60} value={name} onChange={event => { setName(event.target.value); setNameError(null); }} placeholder="Full name" aria-invalid={Boolean(nameError)} aria-describedby={nameError ? `${nameId}-error` : undefined} className={inputClass} />
            {nameError && <p id={`${nameId}-error`} className="mt-1.5 text-xs text-rose-200">{nameError}</p>}
          </div>}
          <div>
            <label htmlFor={phoneId} className="text-sm font-semibold text-white">{whatsapp ? "WhatsApp number" : "Mobile number"}</label>
            <input id={phoneId} type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={event => { setPhone(event.target.value); setPhoneError(null); }} placeholder="98XXXXXXX" aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? `${phoneId}-hint` : undefined} className={inputClass} />
            {phoneError && <p id={`${phoneId}-hint`} className="mt-1.5 text-xs text-rose-200">{phoneError}</p>}
          </div>
          <p className="text-xs text-text-secondary">By {whatsapp ? "booking" : "paying"}, you agree to the <a href="/terms" target="_blank" className="font-semibold text-velocity underline">Terms</a> and <a href="/refund-policy" target="_blank" className="font-semibold text-velocity underline">Refund Policy</a>.</p>
          {error && <p role="alert" className="rounded-lg border border-rose-400/60 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        </div>
        <div className="filter-dialog-actions flex gap-3 border-t border-border-subtle p-4 sm:p-6">
          <button type="button" onClick={onClose} className="button-secondary">Not now</button>
          <button type="submit" disabled={pending} className="button-primary flex-1">
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {whatsapp ? "Confirm my spot" : `Pay ${priceLabel}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
