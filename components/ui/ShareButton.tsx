"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title, text, url, label = "Share" }: { title: string; text?: string; url?: string; label?: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function share() {
    setPending(true);
    setFeedback(null);
    const shareUrl = url ?? window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        setFeedback("Shared");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback("Link copied");
      } else {
        setFeedback("Copy the page address from your browser to share it.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFeedback("Could not share automatically. Copy the page address instead.");
    } finally {
      setPending(false);
    }
  }

  return <span className="inline-flex flex-col items-start gap-1"><button type="button" onClick={share} disabled={pending} className="button-secondary"><Share2 className="h-4 w-4" aria-hidden="true" />{pending ? "Sharing…" : label}</button>{feedback && <span className="max-w-xs text-xs text-text-secondary" role="status">{feedback}</span>}</span>;
}
