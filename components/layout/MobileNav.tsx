"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/config";

const subscribe = () => () => {};

export function MobileNav({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (!open || !mounted) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!dialog) return;
    // A modal dialog provides native focus containment, inert background and Escape handling.
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [open, mounted]);

  const close = () => setOpen(false);
  const links = [
    ...NAV_LINKS,
    { href: "/search", label: "Search" },
    { href: "/fitness-id", label: "Fitness ID" },
    { href: "/stories", label: "Stories" },
    { href: "/for-organizers", label: "For organizers" },
    { href: "/about", label: "About NOIDA.FIT" },
    { href: signedIn ? "/account" : "/login", label: signedIn ? "My account" : "Sign in" },
  ];

  return (
    <>
      <div className="flex items-center gap-1 lg:hidden">
        <Link href="/search" aria-label="Search the directory" className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-white"><Search className="h-5 w-5" aria-hidden="true" /></Link>
        <button ref={triggerRef} type="button" aria-label="Open navigation menu" aria-expanded={open} aria-controls="mobile-nav-panel" aria-haspopup="dialog" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-white"><Menu className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      {mounted && createPortal(
        <>
          <dialog ref={dialogRef} id="mobile-nav-panel" aria-label="Navigation menu" onCancel={close} onClose={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-black/70 lg:hidden">
            <div className="ml-auto flex h-full w-80 max-w-[90vw] flex-col border-l border-border-subtle bg-surface">
              <div className="flex items-center justify-between border-b border-border-subtle p-4"><h2 className="text-lg font-bold">Explore NOIDA.FIT</h2><button type="button" autoFocus aria-label="Close navigation menu" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-white"><X className="h-5 w-5" aria-hidden="true" /></button></div>
              <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile menu"><ul className="space-y-1">{links.map((link) => <li key={link.href}><Link href={link.href} onClick={close} aria-current={pathname === link.href ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium ${pathname === link.href ? "bg-surface-elevated text-velocity" : "text-text-secondary hover:bg-surface-hover hover:text-white"}`}>{link.label}</Link></li>)}</ul></nav>
              <div className="border-t border-border-subtle p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"><Link href="/discover" onClick={close} className="button-primary w-full">Explore Noida Fitness</Link></div>
            </div>
          </dialog>
        </>, document.body,
      )}
    </>
  );
}
