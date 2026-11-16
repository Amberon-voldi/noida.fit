"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Messages for the `?payment=` outcome the PayU return route adds (app/api/payments/payu/return). */
const NOTICES = {
  paid: { text: "Payment received. Your ticket is confirmed; show your .fit ID at check-in.", tone: "border-velocity/60 bg-velocity/10 text-white" },
  failed: { text: "The payment didn’t go through, so you don’t have a ticket yet. Your spot stays held for a little while: try again to confirm it.", tone: "border-rose-400/60 bg-rose-400/10 text-rose-200" },
  pending: { text: "We’re still confirming your payment with PayU. Your ticket is confirmed once it clears, so there’s no need to pay again.", tone: "border-border-strong bg-surface text-text-secondary" },
  refund: { text: "Your payment came through, but this ticket couldn’t take it: it may already be paid for, or the event filled up. It has been flagged for a refund.", followUp: true, tone: "border-rose-400/60 bg-rose-400/10 text-rose-200" },
} as const;

/** Shown after PayU sends the member back. The query value is then dropped so a refresh or shared link doesn't repeat it. */
export function PaymentReturnNotice({ outcome }: { outcome?: string }) {
  useEffect(() => {
    if (!outcome) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [outcome]);

  const notice = outcome && Object.hasOwn(NOTICES, outcome) ? NOTICES[outcome as keyof typeof NOTICES] : null;
  if (!notice) return null;
  return <p role="status" className={`rounded-lg border px-4 py-3 text-sm ${notice.tone}`}>{notice.text}{"followUp" in notice && <> See the <Link href="/refund-policy" className="font-semibold underline underline-offset-2">refund policy</Link> to follow up.</>}</p>;
}
