"use client";

import { Share2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { getProfileUrl } from "@/components/profile/links";
import "./profile-actions.css";

export interface ProfileActionsProps {
  handle: string;
  name: string;
}

export function ProfileActions({ handle, name }: ProfileActionsProps) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const inFlight = useRef(false);
  const id = useId();
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const shareUrl = getProfileUrl(cleanHandle);

  async function share() {
    // The ref also guards two activations before React updates the disabled state.
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setMessage("");
    setManualUrl(null);

    try {
      if (typeof navigator.share === "function") {
        setMessage("Opening sharing…");
        try {
          await navigator.share({ title: `${name} (${cleanHandle}) — NOIDA.FIT`, text: `${name}’s public Fitness ID on NOIDA.FIT`, url: shareUrl });
          setMessage("Profile shared.");
          return;
        } catch (error) {
          // Canceling the native sheet is not an error or permission to copy.
          if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") {
            setMessage("");
            return;
          }
        }
      }

      setMessage("Copying profile link…");
      try {
        if (typeof navigator.clipboard?.writeText !== "function") throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(shareUrl);
        setMessage("Profile link copied.");
      } catch {
        // /account and /fitness-id are not share targets. Only expose the
        // canonical public URL, and only when both automatic options fail.
        setManualUrl(shareUrl);
        setMessage("Sharing is unavailable here. Select and copy your public profile link below.");
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="profile-actions">
      <button type="button" onClick={share} disabled={pending} aria-busy={pending} aria-label="Share public profile" aria-describedby={`${id}-status`} title="Share public profile" className="profile-share-button"><Share2 size={18} aria-hidden="true" /></button>
      <p id={`${id}-status`} role="status" aria-live="polite" aria-atomic="true" className="profile-share-status">{message}</p>
      {manualUrl && <label className="profile-share-fallback" htmlFor={`${id}-url`}><span>Public profile URL</span><input id={`${id}-url`} type="text" readOnly value={manualUrl} onFocus={event => event.currentTarget.select()} className="profile-share-url" /></label>}
    </div>
  );
}
