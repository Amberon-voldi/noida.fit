import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfileByUsername } from "@/lib/appwrite/profiles";
import { getCommunities } from "@/lib/data";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ActivitySummary } from "@/components/profile/ActivitySummary";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { getProfileUrl } from "@/components/profile/links";

type Props = { params: Promise<{ slug: string }> };
// Visibility changes must apply on the next request, not after a static cache TTL.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getPublicProfileByUsername((await params).slug);
  if (!profile) return { title: "Profile not found — NOIDA.FIT", robots: { index: false, follow: false } };
  const title = `${profile.name} (@${profile.slug}) — NOIDA.FIT`;
  const description = `Public Fitness ID for ${profile.name} on NOIDA.FIT.`;
  const url = getProfileUrl(profile.slug);
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "profile" } };
}

export default async function PublicProfilePage({ params }: Props) {
  const profile = await getPublicProfileByUsername((await params).slug);
  if (!profile) notFound();
  const communities = profile.showCommunities ? (await getCommunities()).filter((community) => profile.communityMemberships.includes(community.slug)) : [];
  const jsonLd = { "@context": "https://schema.org", "@type": "ProfilePage", url: getProfileUrl(profile.slug), mainEntity: { "@type": "Person", name: profile.name, alternateName: profile.handle, url: getProfileUrl(profile.slug) } };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="space-y-3 text-center"><h1 className="break-words text-2xl font-bold text-white">{profile.name}’s Fitness ID</h1><p className="text-sm text-text-secondary">@{profile.slug} · {profile.city}</p></header>
      <div className="flex justify-center"><FitnessCard user={profile} /></div>
      <ProfileActions handle={profile.handle} name={profile.name} />
      {profile.bio && <p className="whitespace-pre-wrap break-words text-center text-sm leading-relaxed text-text-secondary">{profile.bio}</p>}
      <section aria-label="Shared participation totals"><ActivitySummary stats={profile.stats} /></section>
      {profile.showCommunities && <section aria-labelledby="public-communities" className="space-y-3"><h2 id="public-communities" className="text-lg font-semibold text-white">Communities followed</h2>{communities.length ? <ul className="space-y-3">{communities.map((community) => <li key={community.slug}><Link href={`/community/${community.slug}`} className="block rounded-xl border border-border-subtle bg-surface p-4 text-sm font-semibold text-white hover:text-velocity">{community.name}</Link></li>)}</ul> : <p className="text-sm text-text-secondary">No public communities to show.</p>}</section>}
      <p className="text-center text-xs leading-relaxed text-text-secondary">This member chose to share this profile. Attendance totals count organizer-verified records only. Their email, saved plans, RSVPs and detailed history stay private.</p>
    </div>
  );
}
