"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { normalizeIndianMobile } from "@/lib/phone";
import { TICKET_HOLD_MINUTES } from "@/lib/pricing";
import type { TicketContact } from "./useEventBooking";

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
  onConfirm: (contact: TicketContact) => void;
  onClose: () => void;
}

const inputClass = "mt-1.5 min-h-11 w-full rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-[15px] text-white transition-colors hover:border-border-strong focus:border-velocity focus:outline-none";

/**
 * The summary a member confirms before a paid ticket. Online, the ticket is confirmed once PayU confirms the
 * payment. While online payment is off, the spot is confirmed at once and the payment link goes to WhatsApp.
 */
export function TicketCheckout({ open, title, when, venueName, priceLabel, mode, savedPhone, savedName, accountEmail, pending, error, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const nameId = useId();
  const phoneId = useId();
  const [name, setName] = useState(savedName ?? "");
  const [phone, setPhone] = useState(savedPhone ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
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
          <dl className="rounded-lg border border-border-subtle bg-surface-elevated">
            <div className="flex items-center justify-between gap-3 px-4 py-3"><dt className="text-sm text-text-secondary">1 ticket</dt><dd className="font-mono text-lg font-bold text-white">{priceLabel}</dd></div>
          </dl>
          {whatsapp && accountEmail && <p className="break-words text-xs text-text-secondary">Booking on your account <span className="font-semibold text-white">{accountEmail}</span></p>}
          {whatsapp && <div>
            <label htmlFor={nameId} className="text-sm font-semibold text-white">Your name</label>
            <input id={nameId} type="text" autoComplete="name" required maxLength={60} value={name} onChange={event => { setName(event.target.value); setNameError(null); }} placeholder="Full name" aria-invalid={Boolean(nameError)} aria-describedby={nameError ? `${nameId}-error` : undefined} className={inputClass} />
            {nameError && <p id={`${nameId}-error`} className="mt-1.5 text-xs text-rose-200">{nameError}</p>}
          </div>}
          <div>
            <label htmlFor={phoneId} className="text-sm font-semibold text-white">{whatsapp ? "WhatsApp number" : "Mobile number"}</label>
            <input id={phoneId} type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={event => { setPhone(event.target.value); setPhoneError(null); }} placeholder="98XXXXXXX" aria-invalid={Boolean(phoneError)} aria-describedby={`${phoneId}-hint`} className={inputClass} />
            <p id={`${phoneId}-hint`} className={`mt-1.5 text-xs ${phoneError ? "text-rose-200" : "text-text-secondary"}`}>{phoneError ?? (whatsapp ? "We’ll send your payment link to this number on WhatsApp." : "PayU needs it to process the payment. We’ll remember it for your next ticket.")}</p>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">{whatsapp
            ? `Your spot is confirmed as soon as you book. Pay ${priceLabel} through the link we send you on WhatsApp. One ticket per account.`
            : `You’ll pay ${priceLabel} on PayU’s secure checkout. We hold your spot for ${TICKET_HOLD_MINUTES} minutes while you pay, and your ticket is confirmed once PayU confirms the payment. One ticket per account.`}</p>
          <p className="text-xs leading-relaxed text-text-secondary">By paying, you agree to the <a href="/terms" target="_blank" className="font-semibold text-velocity underline">Terms &amp; Conditions</a> and the <a href="/refund-policy" target="_blank" className="font-semibold text-velocity underline">Refund &amp; Cancellation Policy</a>.</p>
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
