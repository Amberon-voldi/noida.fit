import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole, ScanLine, Share2 } from "lucide-react";
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

  return (
    <div className="fitness-id-page mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-12">
      <header className="fitness-id-hero">
        <div><p className="eyebrow">YOUR DIGITAL MEMBER CARD</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">Your Fitness ID</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base">One simple way to introduce yourself, share your profile and show up in the Noida fitness scene.</p></div>
        <span className={`account-status ${profile.visibility === "public" ? "account-status-public" : "account-status-private"}`}>{profile.visibility === "public" ? "Ready to share" : "Private by default"}</span>
      </header>
      <div className="fitness-id-layout">
        <section className="fitness-id-showcase" aria-labelledby="fitness-id-card-heading"><div className="fitness-id-showcase-heading"><div><p className="eyebrow">THE CARD</p><h2 id="fitness-id-card-heading" className="mt-1 text-xl font-bold text-white">{profile.name}’s member pass</h2></div><span className="fitness-id-handle">@{profile.slug}</span></div><FitnessCard user={profile} className="mt-5" />{profile.visibility === "public" ? <ProfileActions handle={profile.handle} name={profile.name} /> : <p className="fitness-id-private-note"><LockKeyhole className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />Your profile is private. Only you can see this ID until you enable sharing in settings.</p>}</section>
        <aside className="fitness-id-guide" aria-labelledby="fitness-id-guide-heading"><p className="eyebrow">MAKE IT USEFUL</p><h2 id="fitness-id-guide-heading" className="mt-2 text-xl font-bold text-white">A card built for real-world sharing.</h2><ul className="fitness-id-guide-list"><li><span><ScanLine className="h-4 w-4" aria-hidden="true" /></span><div><strong>Flip for your QR</strong><p>Let someone open your public profile in one scan.</p></div></li><li><span><Share2 className="h-4 w-4" aria-hidden="true" /></span><div><strong>Share your handle</strong><p>Send a clean profile link after a session or meetup.</p></div></li><li><span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span><div><strong>Keep it yours</strong><p>Manage visibility, bio and shared totals from account settings.</p></div></li></ul><Link href="/account#settings" className="button-secondary mt-6 w-full">Manage profile settings<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></aside>
      </div>
      <section className="fitness-id-totals" aria-label="Your participation totals"><div><p className="eyebrow">YOUR PROGRESS</p><h2 className="mt-1 text-xl font-bold text-white">Verified at a glance</h2></div><ActivitySummary stats={profile.stats} /></section>
      <p className="text-center text-xs leading-relaxed text-text-secondary">Attendance totals count organizer-verified records only. Your email, saved plans, RSVPs and detailed history stay private.</p>
    </div>
  );
}
