"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { normalizeIndianMobile } from "@/lib/phone";
import { TICKET_HOLD_MINUTES } from "@/lib/pricing";

interface Props {
  open: boolean;
  title: string;
  when: string;
  venueName: string;
  priceLabel: string;
  pending: boolean;
  error: string | null;
  onConfirm: (phone: string) => void;
  onClose: () => void;
}

/** The summary a member confirms before paying for a ticket; the ticket is confirmed once PayU confirms the payment. */
export function TicketCheckout({ open, title, when, venueName, priceLabel, pending, error, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const phoneId = useId();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

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
    if (!normalizeIndianMobile(phone)) { setPhoneError("Enter a 10-digit Indian mobile number"); return; }
    setPhoneError(null);
    onConfirm(phone);
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
          <div>
              <label htmlFor={phoneId} className="text-sm font-semibold text-white">Mobile number</label>
              <input id={phoneId} type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={event => { setPhone(event.target.value); setPhoneError(null); }} placeholder="98765 43210" aria-invalid={Boolean(phoneError)} aria-describedby={`${phoneId}-hint`} className="mt-1.5 min-h-11 w-full rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-[15px] text-white transition-colors hover:border-border-strong focus:border-velocity focus:outline-none" />
              <p id={`${phoneId}-hint`} className={`mt-1.5 text-xs ${phoneError ? "text-rose-200" : "text-text-secondary"}`}>{phoneError ?? "PayU needs it to process the payment."}</p>
            </div>
          <p className="text-xs leading-relaxed text-text-secondary">You’ll pay {priceLabel} on PayU’s secure checkout. We hold your spot for {TICKET_HOLD_MINUTES} minutes while you pay, and your ticket is confirmed once PayU confirms the payment. One ticket per account.</p>
          {error && <p role="alert" className="rounded-lg border border-rose-400/60 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        </div>
        <div className="filter-dialog-actions flex gap-3 border-t border-border-subtle p-4 sm:p-6">
          <button type="button" onClick={onClose} className="button-secondary">Not now</button>
          <button type="submit" disabled={pending} className="button-primary flex-1">
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Pay {priceLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
