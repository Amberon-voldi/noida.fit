"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Globe2, LockKeyhole, MapPin, X } from "lucide-react";
import type { FitnessProfile } from "@/types/user";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ProfileActions } from "./ProfileActions";
import "./member-identity.css";

interface MemberIdentityProps {
  profile: FitnessProfile;
  /** Owner-only navigation is composed by the server, never inferred here. */
  children?: ReactNode;
}

/** A profile banner that lifts into the foreground as the flippable member ID. */
export function MemberIdentity({ profile, children }: MemberIdentityProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const closingRef = useRef(false);
  const generation = useRef(0);
  const isPublic = profile.visibility === "public";

  function originTransform() {
    const origin = triggerRef.current?.getBoundingClientRect();
    const target = surfaceRef.current?.getBoundingClientRect();
    if (!origin || !target || !target.width || !target.height || origin.bottom < 0 || origin.top > innerHeight) return "translateY(16px) scale(.96)";
    return `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${origin.width / target.width}, ${origin.height / target.height})`;
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cancelAnimation = () => { if (media.matches) animationRef.current?.finish(); };
    media.addEventListener("change", cancelAnimation);
    const frame = requestAnimationFrame(() => {
      if (!closingRef.current && !media.matches && surfaceRef.current) {
        animationRef.current = surfaceRef.current.animate([
          { transform: originTransform(), opacity: .4 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ], { duration: 380, easing: "cubic-bezier(.16,1,.3,1)" });
      }
    });
    return () => {
      generation.current += 1;
      cancelAnimationFrame(frame);
      animationRef.current?.cancel();
      animationRef.current = null;
      media.removeEventListener("change", cancelAnimation);
      document.body.style.overflow = previousOverflow;
      dialog.close();
    };
  }, [open]);

  async function dismiss() {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const current = generation.current;
    animationRef.current?.cancel();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && surfaceRef.current) {
      const animation = surfaceRef.current.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: originTransform(), opacity: 0 },
      ], { duration: 260, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
      animationRef.current = animation;
      try { await animation.finished; } catch { /* Cleanup or a reduced-motion change may end travel early. */ }
    }
    if (current !== generation.current) return;
    dialogRef.current?.close();
    setOpen(false);
    setClosing(false);
    closingRef.current = false;
    (returnFocusRef.current || triggerRef.current)?.focus({ preventScroll: true });
  }

  return <div className={`member-identity ${open ? "member-identity-open" : ""}`}>
    <div className="identity-profile">
      <button ref={triggerRef} type="button" className="identity-banner" onClick={event => { returnFocusRef.current = event.currentTarget; setOpen(true); }} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`} aria-label={`Open Fitness ID for ${profile.name}`}>
        <span className="identity-banner-art" aria-hidden="true" />
        <Image src="/images/logo.png" alt="" width={112} height={38} className="identity-banner-logo" />
        <span className="identity-banner-label" aria-hidden="true"><ArrowUpRight size={18} /></span>
      </button>
      <div className="identity-profile-body">
        <span className="identity-avatar" aria-hidden="true">{profile.name.trim().slice(0, 1).toUpperCase()}</span>
        <div className="identity-name-row"><h2>{profile.name}</h2><span className="identity-visibility">{isPublic ? <Globe2 size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}{isPublic ? "Public" : "Private"}</span></div>
        <div className="identity-meta"><span className="identity-handle">@{profile.slug}</span><span className="identity-city"><MapPin size={13} aria-hidden="true" /><span>{profile.city || "Noida & Greater Noida"}</span></span></div>
        {profile.bio && <p className="identity-bio">{profile.bio}</p>}
      </div>
      <div className="identity-profile-footer"><button type="button" onClick={event => { returnFocusRef.current = event.currentTarget; setOpen(true); }} className="identity-open-action" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`}>View Fitness ID<ArrowUpRight size={14} aria-hidden="true" /></button>{children}</div>
    </div>
    <dialog ref={dialogRef} id={`${id}-dialog`} className={`identity-dialog${closing ? " identity-dialog-closing" : ""}`} aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); void dismiss(); }} onClose={() => { setOpen(false); setClosing(false); closingRef.current = false; }} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter(node => node.getClientRects().length > 0 && !node.closest("[inert]"));
      const first = controls[0], last = controls[controls.length - 1];
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }} onClick={event => { if (event.target === event.currentTarget) void dismiss(); }}>
      <div className="identity-dialog-layout">
        <header className="identity-dialog-toolbar"><h2 id={`${id}-title`} className="sr-only">Fitness ID</h2><button type="button" onClick={() => void dismiss()} aria-label="Return Fitness ID to banner" disabled={closing}><X size={20} aria-hidden="true" /></button></header>
        <div ref={surfaceRef} className="identity-dialog-surface" inert={closing}>{open && <FitnessCard user={profile} actions={isPublic ? <ProfileActions handle={profile.handle} name={profile.name} /> : undefined} />}</div>
      </div>
    </dialog>
  </div>;
}
