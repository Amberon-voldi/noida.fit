"use client";

import { useState } from "react";

interface ProfileActionsProps {
  handle: string;
  name: string;
}

export function ProfileActions({ handle, name }: ProfileActionsProps) {
  const [copied, setCopied] = useState(false);

  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${cleanHandle}`
    : `https://noida.fit/${cleanHandle}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${name} (${cleanHandle}) — NOIDA.FIT Fitness ID`,
          text: `Check out ${name}'s verified fitness card and profile on NOIDA.FIT`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-surface-elevated hover:bg-surface-hover border border-border-strong transition-all shadow-sm active:scale-95"
      >
        {copied ? (
          <>
            <svg
              className="w-4 h-4 text-[#9ddc2e]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[#9ddc2e]">Link Copied!</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4 text-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            <span>Copy {cleanHandle} Link</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleNativeShare}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-black bg-[#9ddc2e] hover:bg-[#b5f043] transition-all shadow-sm active:scale-95"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
        <span>Share Passport</span>
      </button>
    </div>
  );
}
