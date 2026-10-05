import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Globe2, LockKeyhole } from "lucide-react";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { ensureProfileForUser, toFitnessProfile } from "@/lib/appwrite/profiles";
import { getAccountParticipation } from "@/lib/participation";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ActivitySummary } from "@/components/profile/ActivitySummary";
import { ProfileActions } from "@/components/profile/ProfileActions";

export const metadata: Metadata = { title: "My Fitness ID — NOIDA.FIT", robots: { index: false, follow: false } };

export default async function MyFitnessIdPage() {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?callbackUrl=/fitness-id");
  const [stored, participation] = await Promise.all([ensureProfileForUser(user), getAccountParticipation(user.$id)]);
  const profile = toFitnessProfile(stored, participation);
  const isPublic = profile.visibility === "public";

  return <div className="fitness-id-page mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
    <header className="fitness-id-hero"><div><p className="eyebrow">NOIDA.FIT / MEMBER ID</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Your Fitness ID</h1><p className="mt-3 text-sm text-text-secondary">A small introduction to a city that moves.</p></div><Link href="/account" className="fitness-id-owner-link">Back to account<ArrowUpRight size={14} aria-hidden="true" /></Link></header>
    <div className="fitness-id-layout">
      <section className="fitness-id-showcase" aria-label="Your member card">
        <FitnessCard user={profile} actions={isPublic ? <ProfileActions handle={profile.handle} name={profile.name} /> : undefined} />
        <div className="fitness-id-owner-actions"><span>{isPublic ? <Globe2 size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}{isPublic ? "Public profile" : "Private · only you"}</span><Link href="/account#settings">Profile visibility<ArrowUpRight size={13} aria-hidden="true" /></Link>{isPublic && <Link href={`/@${profile.slug}`}>Preview public profile<ArrowUpRight size={13} aria-hidden="true" /></Link>}</div>
      </section>
      <aside className="fitness-id-context" aria-labelledby="fitness-id-context-heading">
        <p className="eyebrow">ON YOUR TERMS</p><h2 id="fitness-id-context-heading">Your introduction.<br />Your choice.</h2>
        <p>{isPublic ? "Share your handle after a session, or show your profile QR when you meet someone new." : "Your ID is just for you right now. You choose when to make your profile public."}</p>
        <dl><div><dt>Always private</dt><dd>Your email, saved plans, RSVPs and detailed history.</dd></div><div><dt>Only if you choose</dt><dd>Your verified totals and communities followed.</dd></div></dl>
        <Link href="/account#settings" className="fitness-id-owner-link">Manage profile settings<ArrowUpRight size={14} aria-hidden="true" /></Link>
        <p className="fitness-id-context-note">The profile QR opens a public profile. It is not an event ticket or a check-in code.</p>
      </aside>
    </div>
    <section className="fitness-id-totals" aria-label="Your participation totals"><div><p className="eyebrow">BUILT BY SHOWING UP</p><h2 className="mt-1 text-xl font-bold text-white">Your participation</h2><Link href="/account#passport" className="fitness-id-owner-link">Open your movement passport<ArrowUpRight size={14} aria-hidden="true" /></Link></div><ActivitySummary stats={profile.stats} /></section>
    <p className="fitness-id-footnote">Attendance totals count organizer-verified records only, never RSVPs.</p>
  </div>;
}
