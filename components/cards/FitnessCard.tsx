"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import type { FitnessProfile } from "@/types/user";

interface FitnessCardProps {
  user: FitnessProfile;
  className?: string;
  showControls?: boolean;
}

export function FitnessCard({
  user,
  className = "",
  showControls = true,
}: FitnessCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchMoved = useRef<boolean>(false);

  const toggleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = Math.abs(e.touches[0].clientX - touchStartX.current);
    const diffY = Math.abs(e.touches[0].clientY - touchStartY.current);

    if (diffX > 10 || diffY > 10) {
      touchMoved.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;

    // If swipe distance is greater than 35px, trigger flip
    if (Math.abs(diffX) > 35) {
      toggleFlip();
    } else if (!touchMoved.current) {
      // It was a tap
      toggleFlip();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleFlip();
    }
  };

  // Format joined date
  const memberSinceFormatted = (() => {
    try {
      const date = new Date(user.joinedAt);
      return date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      }).toUpperCase();
    } catch {
      return "JAN 2025";
    }
  })();

  const handleDisplay = user.handle || `@${user.slug.replace(/^@/, "")}`;
  const cardNumberDisplay = user.cardNumber || `NF-${new Date(user.joinedAt).getFullYear()}-${user.id.slice(-4).padStart(4, "0")}`;

  return (
    <div className={`flex flex-col items-center select-none w-full ${className}`}>
      {/* 3D Perspective Wrapper - Standard Credit Card Aspect Ratio (1.586/1) */}
      <div
        className="perspective-1200 w-full max-w-[480px] sm:max-w-[520px] cursor-pointer group"
        onClick={toggleFlip}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Fitness ID Card for ${user.name} (${handleDisplay}). Click, tap, or swipe to flip card. Currently showing ${isFlipped ? "back" : "front"}.`}
      >
        {/* Card Body with 3D Flip & Exact Credit Card Ratio (85.6mm x 53.98mm = ~1.586) */}
        <div
          className={`relative w-full aspect-[1.586/1] rounded-2xl sm:rounded-3xl transition-transform duration-700 preserve-3d shadow-2xl ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          style={{
            boxShadow:
              "0 25px 55px -12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(157, 220, 46, 0.14)",
          }}
        >
          {/* ====================================================
              CARD FRONT
             ==================================================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden backface-hidden p-5 sm:p-6 lg:p-7 flex flex-col justify-between border border-border-strong/80"
            style={{
              background:
                "linear-gradient(135deg, #181d2c 0%, #0d1019 45%, #131722 100%)",
            }}
          >
            {/* Holographic Sheen Overlay */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none mix-blend-overlay animate-holo-shimmer"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 0%, rgba(157,220,46,0.3) 0%, transparent 60%), linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
              }}
              aria-hidden="true"
            />

            {/* Subtle Grid Texture */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#9ddc2e_1px,transparent_1px)] [background-size:16px_16px]"
              aria-hidden="true"
            />

            {/* Top Bar: Official Logo on left, Chip & Contactless Wave on right */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              {/* Official Logo */}
              <Image
                src="/images/logo.png"
                alt="NOIDA.FIT"
                width={130}
                height={46}
                className="h-7 sm:h-8 lg:h-9 w-auto object-contain brightness-110 drop-shadow-sm"
                priority
              />

              {/* Right: Contactless Wave + Metallic Gold Smart Chip */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                {/* Contactless Wave */}
                <svg
                  className="w-4 sm:w-5 h-4 sm:h-5 text-[#94a3b8]/70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                  <path d="M12 19a9 9 0 0 0 0-14" />
                  <path d="M15.5 21.5a13 13 0 0 0 0-19" />
                </svg>

                {/* Metallic Gold Smart Chip */}
                <div
                  className="w-10 sm:w-12 h-7 sm:h-8 rounded-md border border-[#d4af37]/60 p-1 flex flex-col justify-between shadow-inner relative overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, #f7d56e 0%, #d4af37 40%, #aa820a 70%, #d4af37 100%)",
                  }}
                  aria-hidden="true"
                >
                  <div className="h-[1px] bg-black/20 w-full" />
                  <div className="flex justify-between items-center h-full">
                    <div className="w-2.5 sm:w-3 h-[1px] bg-black/20" />
                    <div className="w-2 sm:w-2.5 h-3 sm:h-3.5 rounded-[2px] border border-black/20" />
                    <div className="w-2.5 sm:w-3 h-[1px] bg-black/20" />
                  </div>
                  <div className="h-[1px] bg-black/20 w-full" />
                </div>
              </div>
            </div>

            {/* Middle Section: Name & Username centered vertically on the left with increased sizes */}
            <div className="relative z-10 my-auto flex flex-col items-start text-left justify-center min-w-0 py-1 sm:py-2">
              <h2
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow truncate max-w-full leading-tight"
                style={{ letterSpacing: "-0.025em" }}
              >
                {user.name}
              </h2>
              <p className="text-base sm:text-lg lg:text-xl font-mono font-bold text-[#9ddc2e] tracking-wide mt-1 sm:mt-1.5 truncate max-w-full">
                {handleDisplay}
              </p>
            </div>

            {/* Bottom Row: Since Date + Card ID + Hologram */}
            <div className="relative z-10 pt-2 sm:pt-3 border-t border-white/10 flex items-end justify-between">
              {/* Member Since Date */}
              <div>
                <p className="text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                  MEMBER SINCE
                </p>
                <p className="text-[11px] sm:text-xs lg:text-sm font-mono font-bold text-white tracking-wider">
                  {memberSinceFormatted}
                </p>
              </div>

              {/* Card Number */}
              <div className="text-center">
                <p className="text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                  FITNESS ID
                </p>
                <p className="text-[11px] sm:text-xs lg:text-sm font-mono font-semibold text-[#cbd5e1] tracking-widest">
                  {cardNumberDisplay}
                </p>
              </div>

              {/* Holographic Security Stamp */}
              <div className="flex flex-col items-end">
                <div
                  className="w-6 sm:w-8 h-6 sm:h-8 rounded-full border border-white/30 flex items-center justify-center relative overflow-hidden shadow"
                  style={{
                    background:
                      "linear-gradient(45deg, #9ddc2e, #06b6d4, #a855f7, #9ddc2e)",
                    backgroundSize: "200% 200%",
                  }}
                  aria-hidden="true"
                >
                  <span className="text-[8px] sm:text-[9px] font-black text-black">NF</span>
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================
              CARD BACK
             ==================================================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden backface-hidden rotate-y-180 p-5 sm:p-6 lg:p-7 flex flex-col justify-between border border-border-strong/80"
            style={{
              background:
                "linear-gradient(135deg, #11151f 0%, #080a0f 50%, #11141c 100%)",
            }}
          >
            {/* Magnetic Stripe at Top */}
            <div
              className="absolute top-0 left-0 right-0 h-9 sm:h-11 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center px-4"
              aria-hidden="true"
            >
              <div className="h-[2px] w-full bg-zinc-800/60" />
            </div>

            {/* Back Header Space */}
            <div className="relative z-10 pt-6 sm:pt-7 flex items-center justify-between">
              {/* Authorized Signature Panel */}
              <div className="flex-1 max-w-[210px] sm:max-w-[260px]">
                <div className="h-7 sm:h-8 bg-white/95 rounded-md px-2.5 sm:px-3 flex items-center justify-between border border-white/40 shadow-sm">
                  <span
                    className="text-xs sm:text-sm text-zinc-900 font-semibold italic tracking-tight truncate select-none"
                    style={{ fontFamily: "cursive, sans-serif" }}
                  >
                    {user.name}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono text-zinc-700 font-bold">
                    VERIFIED
                  </span>
                </div>
                <p className="text-[8px] sm:text-[9px] font-mono text-[#64748b] mt-0.5 sm:mt-1">
                  AUTHORIZED NOIDA MEMBER
                </p>
              </div>

              {/* Mini QR Code */}
              <div className="flex flex-col items-center bg-white p-1 sm:p-1.5 rounded-lg shadow ml-3">
                <svg
                  className="w-10 sm:w-12 h-10 sm:h-12 text-black"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {/* Stylized QR Matrix Pattern */}
                  <rect x="2" y="2" width="7" height="7" rx="1" />
                  <rect x="3.5" y="3.5" width="4" height="4" fill="white" />
                  <rect x="4.5" y="4.5" width="2" height="2" />
                  
                  <rect x="15" y="2" width="7" height="7" rx="1" />
                  <rect x="16.5" y="3.5" width="4" height="4" fill="white" />
                  <rect x="17.5" y="4.5" width="2" height="2" />
                  
                  <rect x="2" y="15" width="7" height="7" rx="1" />
                  <rect x="3.5" y="16.5" width="4" height="4" fill="white" />
                  <rect x="4.5" y="17.5" width="2" height="2" />
                  
                  <rect x="11" y="2" width="2" height="4" />
                  <rect x="11" y="8" width="2" height="2" />
                  <rect x="15" y="11" width="3" height="2" />
                  <rect x="11" y="14" width="2" height="4" />
                  <rect x="15" y="15" width="2" height="2" />
                  <rect x="19" y="15" width="2" height="2" />
                  <rect x="15" y="19" width="4" height="2" />
                  <rect x="11" y="20" width="2" height="2" />
                </svg>
                <span className="text-[6px] sm:text-[7px] font-mono font-bold text-zinc-800 tracking-tighter">
                  SCAN PASSPORT
                </span>
              </div>
            </div>

            {/* Back Mid Stats Trio */}
            <div className="relative z-10 grid grid-cols-3 gap-1 sm:gap-2 py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="text-center">
                <p className="text-xs sm:text-base font-extrabold text-white font-mono">
                  {user.stats.eventsAttended}
                </p>
                <p className="text-[8px] sm:text-[9px] font-mono text-[#94a3b8] uppercase">
                  Events
                </p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-xs sm:text-base font-extrabold text-[#9ddc2e] font-mono">
                  {user.stats.streakWeeks}w 🔥
                </p>
                <p className="text-[8px] sm:text-[9px] font-mono text-[#94a3b8] uppercase">
                  Streak
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs sm:text-base font-extrabold text-white font-mono">
                  {user.stats.communitiesJoined}
                </p>
                <p className="text-[8px] sm:text-[9px] font-mono text-[#94a3b8] uppercase">
                  Clubs
                </p>
              </div>
            </div>

            {/* Back Badges Showcase */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-mono text-[#64748b] uppercase mr-1">
                  BADGES:
                </span>
                {user.badges.slice(0, 3).map((badge) => (
                  <span
                    key={badge.id}
                    title={`${badge.name}: ${badge.description}`}
                    className="inline-flex items-center justify-center w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-white/[0.06] border border-white/10 text-xs sm:text-sm"
                  >
                    {badge.icon}
                  </span>
                ))}
                {user.badges.length > 3 && (
                  <span className="text-[9px] sm:text-[10px] font-mono text-[#94a3b8]">
                    +{user.badges.length - 3}
                  </span>
                )}
              </div>

              {/* Barcode graphic */}
              <div className="flex flex-col items-end">
                <div
                  className="flex items-center gap-[1.5px] sm:gap-[2px] h-4 sm:h-5 opacity-75"
                  aria-hidden="true"
                >
                  {[3, 1, 2, 4, 1, 3, 2, 1, 3, 4, 2, 1, 3, 2, 1, 3, 2].map(
                    (w, idx) => (
                      <span
                        key={idx}
                        className="bg-white/80 h-full inline-block"
                        style={{ width: `${w}px` }}
                      />
                    )
                  )}
                </div>
                <span className="text-[7px] sm:text-[8px] font-mono text-[#64748b] tracking-wider mt-0.5">
                  NOIDA.FIT/{handleDisplay.replace(/^@/, "")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control / Hint Bar */}
      {showControls && (
        <div className="mt-3 sm:mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFlip}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-[#94a3b8] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors shadow-sm"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-500 ${
                isFlipped ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            <span>{isFlipped ? "Show Front" : "Click / Swipe to Flip Card"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
