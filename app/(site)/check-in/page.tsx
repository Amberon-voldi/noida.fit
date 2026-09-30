import type { Metadata } from "next";
import { CheckInForm } from "@/components/participation/CheckInForm";

export const metadata: Metadata = {
  title: "Event check-in — NOIDA.FIT",
  description: "Verify your attendance at a NOIDA.FIT event.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function CheckInPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-velocity">Event check-in</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Show up, then check in</h1>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">Use the signed QR or link from the event organizer. You need a confirmed RSVP and a NOIDA.FIT account to verify attendance.</p>
      <div className="mt-8 rounded-2xl border border-border-subtle bg-surface p-5 sm:p-7"><CheckInForm key={typeof params.token === "string" ? params.token : ""} initialToken={typeof params.token === "string" ? params.token.slice(0, 2048) : ""} /></div>
    </div>
  );
}
