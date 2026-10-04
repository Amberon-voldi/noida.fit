import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfileByUsername } from "@/lib/appwrite/profiles";
import { getCommunities } from "@/lib/data";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ActivitySummary } from "@/components/profile/ActivitySummary";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { getProfileUrl } from "@/components/profile/links";
import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";

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
    <div className="fitness-id-page public-fitness-id-page mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="fitness-id-hero public-fitness-id-hero"><div><p className="eyebrow">PUBLIC FITNESS ID</p><h1 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-5xl">{profile.name}’s Fitness ID</h1><p className="mt-3 flex items-center gap-2 text-sm text-text-secondary"><span className="font-mono text-velocity">@{profile.slug}</span><span aria-hidden="true">·</span><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{profile.city}</p></div><span className="account-status account-status-public"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Shared by member</span></header>
      <div className="fitness-id-layout">
        <section className="fitness-id-showcase" aria-labelledby="public-fitness-card-heading"><div className="fitness-id-showcase-heading"><div><p className="eyebrow">MEMBER PASS</p><h2 id="public-fitness-card-heading" className="mt-1 text-xl font-bold text-white">A quick introduction</h2></div><span className="fitness-id-handle">Scan or share</span></div><FitnessCard user={profile} className="mt-5" /><ProfileActions handle={profile.handle} name={profile.name} /></section>
        <aside className="fitness-id-guide public-fitness-id-summary"><p className="eyebrow">ABOUT THIS MEMBER</p>{profile.bio ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">{profile.bio}</p> : <p className="mt-2 text-sm leading-relaxed text-text-secondary">A member of Noida’s local fitness community.</p>}<Link href="/discover" className="button-secondary mt-5 w-full">Find your next session<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></aside>
      </div>
      <section className="fitness-id-totals" aria-label="Shared participation totals"><div><p className="eyebrow">VERIFIED PROGRESS</p><h2 className="mt-1 text-xl font-bold text-white">What they’ve shared</h2></div><ActivitySummary stats={profile.stats} /></section>
      {profile.showCommunities && <section aria-labelledby="public-communities" className="fitness-id-communities"><div className="fitness-id-section-heading"><div><p className="eyebrow">THEIR PEOPLE</p><h2 id="public-communities" className="mt-1 text-xl font-bold text-white">Communities followed</h2></div></div>{communities.length ? <ul className="fitness-id-community-list">{communities.map((community) => <li key={community.slug}><Link href={`/community/${community.slug}`} className="fitness-id-community-link"><span>{community.name}</span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></li>)}</ul> : <p className="mt-3 text-sm text-text-secondary">No public communities to show.</p>}</section>}
      <p className="text-center text-xs leading-relaxed text-text-secondary">This member chose to share this profile. Attendance totals count organizer-verified records only. Their email, saved plans, RSVPs and detailed history stay private.</p>
    </div>
  );
}
