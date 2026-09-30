"use client";

import { useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RotateCw } from "lucide-react";
import type { FitnessProfile } from "@/types/user";
import { getProfileUrl } from "@/components/profile/links";

interface FitnessCardProps { user: FitnessProfile; className?: string; showControls?: boolean }

export function FitnessCard({user,className="",showControls=true}:FitnessCardProps) {
  const [flipped,setFlipped]=useState(false);
  const id=useId();
  const isPublic=user.visibility==="public";
  const profileUrl=getProfileUrl(user.slug);
  const year=new Date(user.joinedAt).getUTCFullYear();
  const verified=user.stats.verifiedActivities ?? user.stats.eventsAttended;
  return <div className={`w-full max-w-lg ${className}`}>
    <button type="button" id={id} onClick={()=>setFlipped(value=>!value)} aria-pressed={flipped}
      aria-label={`Fitness ID for ${user.name}. ${flipped?"Back":"Front"} of card. Tap to flip.`}
      className="fitness-card block w-full rounded-2xl text-left focus-visible:outline-offset-4">
      <span className="fitness-card-body relative block aspect-[1.586/1] w-full" style={{transform:flipped?"rotateY(180deg)":"rotateY(0deg)"}}>
        <span aria-hidden={flipped} className="fitness-card-face absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-border-strong bg-surface-elevated p-5 sm:p-7">
          <span className="flex items-start justify-between gap-3"><span className="text-sm font-extrabold tracking-tight text-white sm:text-lg">NOIDA<span className="text-velocity">.FIT</span></span><span className="font-mono text-[9px] tracking-[.18em] text-text-secondary sm:text-[10px]">FITNESS ID</span></span>
          <span className="flex min-w-0 items-center gap-3 py-2 sm:gap-4"><span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-velocity/30 bg-velocity/10 text-lg font-bold text-velocity sm:size-14">{user.name.slice(0,1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-mono text-xs text-velocity sm:text-sm">@{user.slug}</span><span className="block truncate text-xl font-bold tracking-tight text-white sm:text-2xl">{user.name}</span><span className="mt-1 block text-[9px] tracking-[.15em] text-text-secondary sm:text-[10px]">ACTIVE MEMBER</span></span></span>
          <span className="flex justify-between gap-3 border-t border-border-strong pt-3"><span><span className="block text-lg font-bold leading-none text-white sm:text-xl">{verified===null?"Private":verified}</span><span className="mt-1 block text-[8px] tracking-[.12em] text-text-secondary sm:text-[9px]">VERIFIED ACTIVITIES</span></span><span className="text-right"><span className="block text-lg font-bold leading-none text-white sm:text-xl">{year}</span><span className="mt-1 block text-[8px] tracking-[.12em] text-text-secondary sm:text-[9px]">MEMBER SINCE</span></span></span>
        </span>
        <span aria-hidden={!flipped} className="fitness-card-face absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-border-strong bg-surface p-4 sm:p-6" style={{transform:"rotateY(180deg)"}}>
          <span className="text-xs font-extrabold tracking-tight text-white">NOIDA<span className="text-velocity">.FIT</span></span>
          {isPublic?<span className="my-1 flex min-h-0 flex-col items-center gap-1"><QRCodeSVG value={profileUrl} size={120} marginSize={3} bgColor="#ffffff" fgColor="#090a0f" role="img" aria-label={`QR code for @${user.slug}`} className="size-24 rounded-md sm:size-28"/><span className="text-[10px] text-text-secondary">Scan to view Fitness ID</span></span>:<span className="max-w-64 text-center text-xs leading-relaxed text-text-secondary">Your profile is private. Enable public sharing in settings to reveal your QR code.</span>}
          <span className="font-mono text-[9px] tracking-wide text-text-secondary sm:text-[10px]">ID: {user.cardNumber}</span>
        </span>
      </span>
    </button>
    {showControls&&<div className="mt-3 flex justify-center"><button type="button" onClick={()=>setFlipped(value=>!value)} aria-controls={id} aria-pressed={flipped} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-text-secondary hover:text-white"><RotateCw size={14} aria-hidden="true"/>Flip Fitness ID<span className="sr-only"> · showing {flipped?"back":"front"}</span></button></div>}
  </div>;
}
