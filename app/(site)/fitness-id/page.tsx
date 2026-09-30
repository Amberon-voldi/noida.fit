import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="text-center"><h1 className="text-3xl font-bold text-white">Your Fitness ID</h1><p className="mt-2 text-sm text-text-secondary">Your place in Noida’s fitness community.</p></header>
      <div className="flex justify-center"><FitnessCard user={profile} /></div>
      {profile.visibility === "public" ? <ProfileActions handle={profile.handle} name={profile.name} /> : <p className="text-center text-sm text-text-secondary">Your profile is private. It cannot be viewed by anyone else.</p>}
      <section aria-label="Your participation totals"><ActivitySummary stats={profile.stats} /></section>
      <p className="text-center text-sm text-text-secondary">Manage your profile, sharing preferences and participation in <Link href="/account" className="text-white underline">your account</Link>.</p>
    </div>
  );
}
