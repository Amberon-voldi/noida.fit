"use client";

import { useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Hash, MapPin, QrCode, RotateCw, ShieldCheck } from "lucide-react";
import type { FitnessProfile } from "@/types/user";
import { getProfileUrl } from "@/components/profile/links";

interface FitnessCardProps {
  user: FitnessProfile;
  className?: string;
  showControls?: boolean;
}

function memberYear(value: string): string {
  const year = new Date(value).getUTCFullYear();
  return Number.isFinite(year) ? String(year) : "—";
}

export function FitnessCard({ user, className = "", showControls = true }: FitnessCardProps) {
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  const isPublic = user.visibility === "public";
  const profileUrl = getProfileUrl(user.slug);
  const verified = user.stats.verifiedActivities ?? user.stats.eventsAttended;
  const toggle = () => setFlipped(value => !value);

  return (
    <div className={`fitness-id-wrap w-full min-w-0 ${className}`} data-fitness-id>
      <button
        type="button"
        id={id}
        onClick={toggle}
        aria-pressed={flipped}
        aria-label={`Fitness ID for ${user.name}. ${flipped ? "Back" : "Front"} of card. Tap to flip.`}
        className="fitness-card motion-press block w-full rounded-2xl text-left focus-visible:outline-offset-4"
      >
        <span className="fitness-card-body relative grid min-h-64 w-full sm:aspect-[1.586/1]" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <span aria-hidden={flipped} className="fitness-card-face fitness-card-front col-start-1 row-start-1 flex min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-border-strong p-4 sm:p-6">
            <span className="fitness-card-grid" aria-hidden="true" />
            <span className="fitness-card-glow" aria-hidden="true" />
            <span className="relative flex items-center justify-between gap-3">
              <span className="text-base font-black tracking-tight text-white sm:text-lg">NOIDA<span className="text-velocity">.FIT</span></span>
              <span className="fitness-card-type"><span className="fitness-card-live-dot" />MEMBER PASS</span>
            </span>
            <span className="relative flex min-w-0 items-center gap-3 sm:gap-4">
              <span aria-hidden="true" className="fitness-card-avatar flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-black sm:size-16 sm:text-2xl">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-velocity"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Active member</span>
                <span className="mt-1 block text-xl font-black leading-tight tracking-tight text-white sm:text-3xl">{user.name}</span>
                <span className="mt-1 block font-mono text-[11px] text-text-secondary sm:text-xs">@{user.slug}</span>
              </span>
              <span className="fitness-card-side-label" aria-hidden="true">MOVE<br />TOGETHER</span>
            </span>
            <span className="relative flex min-w-0 items-center gap-2 text-xs font-semibold text-text-secondary"><MapPin className="h-3.5 w-3.5 shrink-0 text-velocity" aria-hidden="true" /><span className="truncate">{user.city || "Noida & Greater Noida"}</span><span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-text-muted">{isPublic ? "Shareable" : "Private"}</span></span>
            <span className="relative grid grid-cols-2 gap-4 border-t border-white/10 pt-3">
              <span className="min-w-0"><span className="block text-xl font-black leading-none text-white">{verified === null ? "—" : verified}</span><span className="mt-1.5 block text-[9px] font-semibold uppercase leading-relaxed tracking-[.1em] text-text-secondary">Verified activities</span></span>
              <span className="min-w-0 text-right"><span className="block text-xl font-black leading-none text-white">{memberYear(user.joinedAt)}</span><span className="mt-1.5 block text-[9px] font-semibold uppercase leading-relaxed tracking-[.1em] text-text-secondary">Member since</span></span>
            </span>
          </span>

          <span aria-hidden={!flipped} className="fitness-card-face fitness-card-back col-start-1 row-start-1 flex min-w-0 flex-col items-center justify-between gap-3 overflow-hidden rounded-2xl border border-border-strong p-4 sm:p-6">
            <span className="flex w-full items-center justify-between gap-3"><span className="text-base font-black tracking-tight text-white">NOIDA<span className="text-velocity">.FIT</span></span><span className="fitness-card-type">FITNESS ID</span></span>
            {isPublic ? <span className="fitness-card-qr-wrap flex flex-col items-center gap-2"><QRCodeSVG value={profileUrl} size={144} marginSize={4} bgColor="#ffffff" fgColor="#090a0f" role="img" aria-label={`QR code for @${user.slug}`} className="size-32 shrink-0 rounded-xl sm:size-36" /><span className="flex items-center gap-1.5 text-xs font-semibold text-white"><QrCode className="h-3.5 w-3.5 text-velocity" aria-hidden="true" />Scan to open profile</span></span> : <span className="fitness-card-private flex max-w-64 flex-col items-center gap-3 text-center"><span className="flex size-11 items-center justify-center rounded-full border border-border-strong bg-surface-elevated text-text-secondary"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span><span className="text-xs leading-relaxed text-text-secondary">This ID is private. Enable public sharing in settings to reveal your QR code.</span></span>}
            <span className="flex max-w-full items-center gap-1.5 text-center font-mono text-[10px] leading-relaxed tracking-wide text-text-secondary [overflow-wrap:anywhere]"><Hash className="h-3 w-3 shrink-0" aria-hidden="true" />ID: {user.cardNumber}</span>
          </span>
        </span>
      </button>
      {showControls && <div className="fitness-card-controls"><span className="fitness-card-hint"><span className="hidden sm:inline">Tap the card to </span>{flipped ? "see your profile" : isPublic ? "show your QR" : "see the back"}</span><button type="button" onClick={toggle} aria-controls={id} aria-pressed={flipped} className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-text-secondary hover:text-white"><RotateCw size={14} className="shrink-0" aria-hidden="true" />Flip ID<span className="sr-only"> · showing {flipped ? "back" : "front"}</span></button></div>}
    </div>
  );
}
