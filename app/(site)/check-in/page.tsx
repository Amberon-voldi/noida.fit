import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { ensureProfileForUser } from "@/lib/appwrite/profiles";
import { createParticipantCheckInToken } from "@/lib/participation";
import { CheckInForm, type ParticipantPass } from "@/components/participation/CheckInForm";

export const metadata: Metadata = { title: "My check-in QR — NOIDA.FIT", description: "Show your participant QR to the club or venue operator.", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function CheckInPage() {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?callbackUrl=/check-in");
  const profile = await ensureProfileForUser(user);
  let pass: ParticipantPass | null = null;
  try { pass = await createParticipantCheckInToken(user.$id); } catch { /* No signing secrets or SDK failures in browser output. */ }
  return <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
    <p className="eyebrow">Participant check-in</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Show your check-in QR</h1>
    <p className="mt-3 text-sm leading-relaxed text-text-secondary">You show the QR. The club or venue operator scans it. No camera is needed on your phone, and private profiles can check in too.</p>
    <div className="mt-6 rounded-2xl border border-border-subtle bg-surface p-4 sm:p-6"><CheckInForm initialPass={pass} displayName={profile.displayName} fitnessId={profile.fitnessId} initialError={pass ? "" : "Check-in QR is temporarily unavailable. Try refreshing or ask the organizer to check the server setup."} /></div>
    <Link href="/organizer" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-velocity">Running a session? Open the operator scanner</Link>
  </div>;
}
