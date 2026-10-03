"use client";

import { Bookmark, Check, LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUrl, refreshParticipation, useParticipation } from "./useParticipation";

interface Props { itemId: string; itemType: "event" | "place" | "community"; action: "saved" | "follow"; compact?: boolean }

export function EntityToggleButton({ itemId, itemType, action, compact = false }: Props) {
  const router = useRouter();
  const state = useParticipation();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const selected = action === "saved"
    ? state.savedItems.some(item => item.itemId === itemId && item.itemType === itemType)
    : state.memberships.some(item => item.communityId === itemId && item.status === "active");
  const label = action === "saved" ? selected ? "Saved" : "Save" : selected ? "Following" : "Follow";

  async function toggle() {
    if (!state.authenticated && !state.error) { router.push(loginUrl()); return; }
    setPending(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/participation/${action}`, {
        method: selected ? "DELETE" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "saved" ? { itemId, itemType } : { communityId: itemId }),
      });
      if (response.status === 401) { router.push(loginUrl()); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update. Please try again.");
      await refreshParticipation();
      setMessage(action === "saved" ? selected ? "Removed from saved" : "Saved to your account" : selected ? "Unfollowed community" : "Following community");
      router.refresh();
    } catch (reason) { setError(true); setMessage(reason instanceof Error ? reason.message : "Please try again."); }
    finally { setPending(false); }
  }

  return <span className="relative inline-flex flex-col items-start gap-1">
    <button type="button" onClick={toggle} disabled={pending || !state.loaded} aria-pressed={selected}
      aria-label={`${label} ${itemType}`} className={`motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-60 ${compact ? "min-w-11" : "min-w-24"} ${selected ? "border-velocity/40 bg-velocity/10 text-velocity" : "border-border-strong bg-surface-elevated text-foreground hover:border-velocity/60"}`}>
      <span key={pending ? "pending" : selected ? "selected" : "idle"} className="toggle-state-icon" data-selected={!pending && selected}>
        {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true"/> : selected ? <Check size={15} aria-hidden="true"/> : action === "saved" ? <Bookmark size={15} aria-hidden="true"/> : <UserPlus size={15} aria-hidden="true"/>}
      </span>
      {label}
    </button>
    {message && <span className={`max-w-56 text-xs ${error ? "text-red-300" : "sr-only"}`} role={error ? "alert" : "status"}>{message}</span>}
  </span>;
}
