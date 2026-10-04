"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { getProfileUrl } from "@/components/profile/links";

interface ProfileActionsProps {
  handle: string;
  name: string;
}

export function ProfileActions({ handle, name }: ProfileActionsProps) {
  const [message, setMessage] = useState("");
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const shareUrl = getProfileUrl(cleanHandle);

  async function copyLink() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Profile link copied.");
    } catch {
      setMessage("Share is unavailable here. Copy the profile URL from your browser.");
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
    <div className="profile-actions">
      <button type="button" onClick={share} aria-label="Share Fitness ID" title="Share Fitness ID" className="profile-share-button motion-press"><Share2 className="h-4 w-4" aria-hidden="true" /></button>
      <p role="status" aria-live="polite" className="profile-share-status">{message}</p>
    </div>
  );
}
