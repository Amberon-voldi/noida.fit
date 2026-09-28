"use client";

import React from "react";

interface BaseCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: "glow" | "none";
}

export function BaseCard({
  children,
  className = "",
  hoverEffect = "glow"
}: BaseCardProps) {
  return (
    <div className={`
      relative group overflow-hidden rounded-2xl transition-all duration-300
      bg-surface/80 border border-white/10 ring-1 ring-white/5
      hover:border-[#9ddc2e]/50 hover:scale-[1.02]
      hover:shadow-xl hover:shadow-[#9ddc2e]/10
      ${className}
    `}>
      {/* Hover Glow Layer */}
      {hoverEffect === "glow" && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-[#9ddc2e]/10 via-transparent to-transparent" />
      )}

      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
