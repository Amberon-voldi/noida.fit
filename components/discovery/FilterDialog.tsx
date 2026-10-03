"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

/** Stays inside the search form so every field is included in native GET submissions. */
export function FilterDialog({ children, activeCount }: { children: ReactNode; activeCount: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!dialog) return;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="directory-filters" onClick={() => setOpen(true)} className="button-secondary shrink-0 px-3 sm:px-4">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filters{activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded bg-velocity px-1 text-[11px] text-slate-950">{activeCount}</span>}
      </button>
      <dialog ref={dialogRef} id="directory-filters" aria-labelledby="filter-dialog-title" className="filter-dialog" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="filter-dialog-panel">
          <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-border-strong sm:hidden" aria-hidden="true" />
          <header className="flex items-center justify-between gap-4 border-b border-border-subtle p-4 sm:p-6">
            <div><p className="eyebrow">Make it your kind of day</p><h2 id="filter-dialog-title" className="mt-1 text-xl font-bold">Refine your search</h2></div>
            <button type="button" autoFocus aria-label="Close filters" onClick={() => setOpen(false)} className="motion-press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-text-secondary"><X className="h-5 w-5" aria-hidden="true" /></button>
          </header>
          {children}
        </div>
      </dialog>
    </>
  );
}
