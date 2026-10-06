import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, QrCode } from "lucide-react";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { ensureProfileForUser, toFitnessProfile } from "@/lib/appwrite/profiles";
import { getAccountParticipation } from "@/lib/participation";
import { ActivitySummary } from "@/components/profile/ActivitySummary";
import { MemberIdentity } from "@/components/profile/MemberIdentity";

export const metadata: Metadata = { title: "My Fitness ID — NOIDA.FIT", robots: { index: false, follow: false } };

export default async function MyFitnessIdPage() {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?callbackUrl=/fitness-id");
  const [stored, participation] = await Promise.all([ensureProfileForUser(user), getAccountParticipation(user.$id)]);
  const profile = toFitnessProfile(stored, participation);
  const isPublic = profile.visibility === "public";

  return <div className="fitness-id-page mx-auto max-w-3xl px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
    <h1 className="sr-only">Your Fitness ID</h1>
    <Link href="/account" className="fitness-id-return"><ArrowLeft size={14} aria-hidden="true" />Account</Link>
    <section className="fitness-id-showcase" aria-label="Your member card">
      <MemberIdentity profile={profile}>
        <div className="identity-owner-links"><Link href="/check-in"><QrCode size={16} aria-hidden="true" />Show check-in QR</Link><Link href="/account#settings" aria-label="Privacy settings">Privacy</Link>{isPublic && <Link href={`/@${profile.slug}`} className="identity-preview" aria-label="Preview public profile" title="Preview public profile"><ArrowUpRight size={16} aria-hidden="true" /></Link>}</div>
      </MemberIdentity>
    </section>
    <section className="fitness-id-totals" aria-label="Your participation totals"><div><h2 className="text-lg font-semibold text-white">Participation</h2><Link href="/account#passport" className="fitness-id-owner-link">Movement passport<ArrowUpRight size={14} aria-hidden="true" /></Link></div><ActivitySummary stats={profile.stats} /></section>
    <p className="fitness-id-footnote">Attendance totals count organizer-verified records, not RSVPs.</p>
  </div>;
}
