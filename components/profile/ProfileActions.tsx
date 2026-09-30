"use client";

import { useState } from "react";
import { getProfileUrl } from "@/components/profile/links";

interface ProfileActionsProps {
  handle: string;
  name: string;
}

export function ProfileActions({ handle, name }: ProfileActionsProps) {
  const [message, setMessage] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const shareUrl = getProfileUrl(cleanHandle);

  async function copyLink() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareUrl);
      setManualCopy(false);
      setMessage("Profile link copied.");
    } catch {
      setManualCopy(true);
      setMessage("Select and copy your profile link below.");
    }
  }

  async function share() {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: `${name} (${cleanHandle}) — NOIDA.FIT`, text: `${name}’s public Fitness ID on NOIDA.FIT`, url: shareUrl });
      setMessage("Profile shared.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await copyLink();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={copyLink} className="min-h-11 rounded-lg border border-border-strong bg-surface-elevated px-4 py-2 text-sm font-semibold text-white hover:bg-surface-hover">Copy profile link</button>
        <button type="button" onClick={share} className="min-h-11 rounded-lg bg-velocity px-4 py-2 text-sm font-bold text-background hover:bg-velocity-glow">Share Fitness ID</button>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-text-secondary">{message}</p>
      {manualCopy && <label className="mx-auto block max-w-lg text-left text-sm text-text-secondary">Profile link<input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} className="mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-white" /></label>}
    </div>
  );
}
