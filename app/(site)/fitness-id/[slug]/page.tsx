import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfileByUsername } from "@/lib/appwrite/profiles";
import { getCommunities } from "@/lib/data";
import { ActivitySummary } from "@/components/profile/ActivitySummary";
import { MemberIdentity } from "@/components/profile/MemberIdentity";
import { getProfileUrl } from "@/components/profile/links";
import { ArrowUpRight } from "lucide-react";

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
  const hasSharedStats = Object.values(profile.stats).some(value => value !== null && value !== undefined);

  return (
    <div className="fitness-id-page public-fitness-id-page mx-auto max-w-3xl px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="sr-only">{profile.name}’s Fitness ID</h1>
      <section className="fitness-id-showcase" aria-label="Public member card"><MemberIdentity profile={profile} /></section>
      {hasSharedStats && <section className="fitness-id-totals" aria-label="Shared participation totals"><div><h2 className="text-lg font-semibold text-white">Participation</h2></div><ActivitySummary stats={profile.stats} /></section>}
      {profile.showCommunities && <section aria-labelledby="public-communities" className="fitness-id-communities"><div className="fitness-id-section-heading"><div><h2 id="public-communities" className="text-lg font-semibold text-white">Communities followed</h2></div></div>{communities.length ? <ul className="fitness-id-community-list">{communities.map((community) => <li key={community.slug}><Link href={`/community/${community.slug}`} className="fitness-id-community-link"><span>{community.name}</span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></li>)}</ul> : <p className="mt-3 text-sm text-text-secondary">No public communities to show.</p>}</section>}
      <p className="fitness-id-footnote">Attendance totals count organizer-verified records. Email, plans and detailed history stay private.</p>
      <Link href="/discover" className="fitness-id-owner-link">Find your next session<ArrowUpRight size={14} aria-hidden="true" /></Link>
    </div>
  );
}
