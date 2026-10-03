"use client";

import { useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RotateCw } from "lucide-react";
import type { FitnessProfile } from "@/types/user";
import { getProfileUrl } from "@/components/profile/links";

interface FitnessCardProps {
  user: FitnessProfile;
  className?: string;
  showControls?: boolean;
}

export function FitnessCard({ user, className = "", showControls = true }: FitnessCardProps) {
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  const isPublic = user.visibility === "public";
  const profileUrl = getProfileUrl(user.slug);
  const year = new Date(user.joinedAt).getUTCFullYear();
  const verified = user.stats.verifiedActivities ?? user.stats.eventsAttended;

  return (
    <div className={`w-full min-w-0 max-w-lg ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setFlipped(value => !value)}
        aria-pressed={flipped}
        aria-label={`Fitness ID for ${user.name}. ${flipped ? "Back" : "Front"} of card. Tap to flip.`}
        className="fitness-card motion-press block w-full rounded-2xl text-left focus-visible:outline-offset-4"
      >
        {/* Overlapping grid faces can grow with text instead of clipping at narrow widths. */}
        <span className="fitness-card-body relative grid min-h-60 w-full sm:aspect-[1.586/1]" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <span aria-hidden={flipped} className="fitness-card-face col-start-1 row-start-1 flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-border-strong bg-surface-elevated p-4 sm:p-6">
            <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-extrabold tracking-tight text-white sm:text-lg">NOIDA<span className="text-velocity">.FIT</span></span>
              <span className="font-mono text-[10px] tracking-widest text-text-secondary">FITNESS ID</span>
            </span>
            <span className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-lg font-bold text-velocity sm:size-14">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <span className="block font-mono text-[11px] leading-relaxed text-velocity sm:text-sm">@{user.slug}</span>
                <span className="mt-0.5 block text-lg font-bold leading-snug tracking-tight text-white sm:text-2xl">{user.name}</span>
                <span className="mt-1 block text-[9px] tracking-wider text-text-secondary sm:text-[10px]">ACTIVE MEMBER</span>
              </span>
            </span>
            <span className="grid grid-cols-2 gap-3 border-t border-border-strong pt-3">
              <span className="min-w-0">
                <span className="block text-xl font-bold leading-none text-white">{verified === null ? "Private" : verified}</span>
                <span className="mt-1.5 block text-[9px] leading-relaxed tracking-wide text-text-secondary sm:text-[10px]">VERIFIED ACTIVITIES</span>
              </span>
              <span className="min-w-0 text-right">
                <span className="block text-xl font-bold leading-none text-white">{year}</span>
                <span className="mt-1.5 block text-[9px] leading-relaxed tracking-wide text-text-secondary sm:text-[10px]">MEMBER SINCE</span>
              </span>
            </span>
          </span>
          <span aria-hidden={!flipped} className="fitness-card-face col-start-1 row-start-1 flex min-w-0 flex-col items-center justify-between gap-3 rounded-2xl border border-border-strong bg-surface p-4 sm:p-6" style={{ transform: "rotateY(180deg)" }}>
            <span className="text-sm font-extrabold tracking-tight text-white">NOIDA<span className="text-velocity">.FIT</span></span>
            {isPublic ? (
              <span className="flex flex-col items-center gap-2">
                <QRCodeSVG value={profileUrl} size={128} marginSize={4} bgColor="#ffffff" fgColor="#090a0f" role="img" aria-label={`QR code for @${user.slug}`} className="size-28 shrink-0 rounded-lg sm:size-32" />
                <span className="text-center text-xs text-text-secondary">Scan to view Fitness ID</span>
              </span>
            ) : (
              <span className="max-w-64 text-center text-xs leading-relaxed text-text-secondary">Your profile is private. Enable public sharing in settings to reveal your QR code.</span>
            )}
            <span className="max-w-full text-center font-mono text-[10px] leading-relaxed tracking-wide text-text-secondary [overflow-wrap:anywhere]">ID: {user.cardNumber}</span>
          </span>
        </span>
      </button>
      {showControls && (
        <div className="mt-2 flex justify-center sm:mt-3">
          <button type="button" onClick={() => setFlipped(value => !value)} aria-controls={id} aria-pressed={flipped} className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-text-secondary hover:text-white">
            <RotateCw size={14} className="shrink-0" aria-hidden="true" />
            Flip Fitness ID<span className="sr-only"> · showing {flipped ? "back" : "front"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
