"use client";

import { useEffect, useId, useRef } from "react";
import { LoaderCircle, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  when: string;
  venueName: string;
  priceLabel: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** The summary a member confirms before a ticket is issued for a paid event. */
export function TicketCheckout({ open, title, when, venueName, priceLabel, pending, error, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} className="filter-dialog" onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="filter-dialog-panel">
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
          <p className="text-xs leading-relaxed text-text-secondary">Online payment isn’t open yet. Confirming holds your spot now, and {priceLabel} is payable to the organizer at the event. One ticket per account.</p>
          {error && <p role="alert" className="rounded-lg border border-rose-400/60 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        </div>
        <div className="filter-dialog-actions flex gap-3 border-t border-border-subtle p-4 sm:p-6">
          <button type="button" onClick={onClose} className="button-secondary">Not now</button>
          <button type="button" onClick={onConfirm} disabled={pending} className="button-primary flex-1">
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Confirm ticket · {priceLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
