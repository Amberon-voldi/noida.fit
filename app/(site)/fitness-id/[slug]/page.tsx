import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfileByUsername } from "@/lib/appwrite/profiles";
import { getCommunities } from "@/lib/data";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ActivitySummary } from "@/components/profile/ActivitySummary";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { getProfileUrl } from "@/components/profile/links";
import { ArrowUpRight, Globe2, MapPin } from "lucide-react";

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
    <div className="fitness-id-page public-fitness-id-page mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="fitness-id-hero public-fitness-id-hero"><div><p className="eyebrow">MEET THE COMMUNITY</p><h1 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{profile.name}’s Fitness ID</h1><p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-secondary"><span className="font-mono text-velocity">@{profile.slug}</span><span aria-hidden="true">·</span><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{profile.city}</p></div><span className="fitness-id-public-label"><Globe2 size={14} aria-hidden="true" />Public profile</span></header>
      <div className="fitness-id-layout">
        <section className="fitness-id-showcase" aria-label="Public member card"><FitnessCard user={profile} actions={<ProfileActions handle={profile.handle} name={profile.name} />} /></section>
        <aside className="fitness-id-context public-fitness-id-summary"><p className="eyebrow">A LITTLE ABOUT THEM</p><h2>Part of a city<br />that moves.</h2>{profile.bio ? <p className="whitespace-pre-wrap break-words">{profile.bio}</p> : <p>A member of Noida’s local fitness community.</p>}<Link href="/discover" className="button-secondary mt-5">Find your next session<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link><p className="fitness-id-context-note">This QR opens their profile, not an event ticket or check-in.</p></aside>
      </div>
      {hasSharedStats && <section className="fitness-id-totals" aria-label="Shared participation totals"><div><p className="eyebrow">ON THEIR TERMS</p><h2 className="mt-1 text-xl font-bold text-white">What they’ve shared</h2></div><ActivitySummary stats={profile.stats} /></section>}
      {profile.showCommunities && <section aria-labelledby="public-communities" className="fitness-id-communities"><div className="fitness-id-section-heading"><div><p className="eyebrow">THEIR PEOPLE</p><h2 id="public-communities" className="mt-1 text-xl font-bold text-white">Communities followed</h2></div></div>{communities.length ? <ul className="fitness-id-community-list">{communities.map((community) => <li key={community.slug}><Link href={`/community/${community.slug}`} className="fitness-id-community-link"><span>{community.name}</span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></li>)}</ul> : <p className="mt-3 text-sm text-text-secondary">No public communities to show.</p>}</section>}
      <p className="fitness-id-footnote">Shared by this member. Attendance totals count organizer-verified records only. Their email, plans and detailed history stay private.</p>
    </div>
  );
}
