import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserBySlug, getCommunityBySlug } from "@/lib/data";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ProfileActions } from "@/components/profile/ProfileActions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const user = getUserBySlug(slug);
  if (!user) return { title: "Profile Not Found — NOIDA.FIT" };

  const handle = user.handle || `@${user.slug.replace(/^@/, "")}`;
  return {
    title: `${user.name} (${handle}) — Official Noida Fitness ID`,
    description: `Official digital fitness card and profile for ${user.name} on NOIDA.FIT. ${user.stats.eventsAttended} events attended · ${user.stats.streakWeeks}w streak.`,
    alternates: { canonical: `/${handle}` },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params;
  const user = getUserBySlug(slug);
  if (!user) notFound();

  const memberCommunities = user.communityMemberships
    .map((s) => getCommunityBySlug(s))
    .filter(Boolean);

  const handle = user.handle || `@${user.slug.replace(/^@/, "")}`;
  const memberSinceFormatted = new Date(user.joinedAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-full pb-20 overflow-x-hidden">
      {/* Ambient Atmospheric Backdrop */}
      <div className="relative isolate pt-8 sm:pt-14 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-border-subtle bg-gradient-to-b from-[#0e121d] via-[#090a0f] to-[#090a0f]">
        {/* Ambient Glow Orbs */}
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 -z-10 w-[500px] h-[300px] bg-gradient-to-tr from-[#9ddc2e]/10 to-[#06b6d4]/10 blur-[100px] pointer-events-none rounded-full"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-4xl text-center">
          {/* Centerpiece: Interactive 3D Flipping Card */}
          <div className="mb-6 flex justify-center">
            <FitnessCard user={user} showControls={true} />
          </div>

          {/* Share & Copy Action Toolbar */}
          <div className="mt-5">
            <ProfileActions handle={handle} name={user.name} />
          </div>

          {user.bio && (
            <p className="mt-4 text-xs sm:text-sm text-[#94a3b8] max-w-lg mx-auto italic leading-relaxed">
              &ldquo;{user.bio}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Main Content: Stats, Badges, Communities */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 space-y-12">
        {/* Bento Stats Row */}
        <section aria-label="Activity Summary">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center relative overflow-hidden group hover:border-[#9ddc2e]/40 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#9ddc2e]/40" />
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {user.stats.eventsAttended}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Events Attended</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Verified sessions</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center relative overflow-hidden group hover:border-orange-500/40 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500/50" />
              <p className="text-2xl sm:text-3xl font-black text-orange-400 font-mono">
                {user.stats.streakWeeks}w 🔥
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Current Streak</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Weeks active</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500/50" />
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {user.stats.communitiesJoined}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Communities</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Active squads</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center relative overflow-hidden group hover:border-purple-500/40 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500/50" />
              <p className="text-xs sm:text-sm font-mono font-bold text-white mt-1.5 truncate">
                {user.turfSector ? user.turfSector.split("·")[0] : "Sector 21A"}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Primary Turf</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Home training base</p>
            </div>
          </div>
        </section>

        {/* Badges Showcase */}
        <section aria-labelledby="badges-heading">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2
                id="badges-heading"
                className="text-lg sm:text-xl font-bold text-white flex items-center gap-2"
              >
                <span>Verified Badges & Trophies</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white/[0.06] text-[#9ddc2e]">
                  {user.badges.length}
                </span>
              </h2>
              <p className="text-xs text-[#64748b] mt-0.5">
                Earned by checking in at community runs, rides, and workouts in Noida.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {user.badges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-2xl bg-surface/70 border border-border-subtle p-4 flex items-start gap-4 hover:border-border-strong hover:bg-surface-elevated/80 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-white/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                  {badge.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white truncate">
                      {badge.name}
                    </h3>
                    <span className="text-[10px] font-mono text-[#9ddc2e] uppercase font-semibold">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">
                    {badge.description}
                  </p>
                  <p className="text-[10px] font-mono text-[#64748b] mt-1.5">
                    Earned {new Date(badge.earnedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}

            {/* Teaser for Next Badge */}
            <div className="rounded-2xl border border-dashed border-border-subtle/80 p-4 flex items-center gap-4 bg-white/[0.01]">
              <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-xl flex-shrink-0 text-[#64748b]">
                🔒
              </div>
              <div>
                <p className="text-sm font-semibold text-[#94a3b8]">Expressway Century II</p>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Complete 200km total logged on the Expressway corridor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Member Communities */}
        {memberCommunities.length > 0 && (
          <section aria-labelledby="communities-heading">
            <h2
              id="communities-heading"
              className="text-lg sm:text-xl font-bold text-white mb-4"
            >
              Communities & Squads ({memberCommunities.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {memberCommunities.map((community) => community && (
                <Link
                  key={community.slug}
                  href={`/community/${community.slug}`}
                  className="group rounded-2xl bg-surface/70 border border-border-subtle p-5 hover:border-[#9ddc2e]/40 hover:bg-surface-elevated/80 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#9ddc2e] font-semibold">
                        {community.category}
                      </span>
                      <span className="text-xs text-[#64748b] group-hover:text-white group-hover:translate-x-0.5 transition-all">
                        View squad →
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#9ddc2e] transition-colors">
                      {community.name}
                    </h3>
                    <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2 leading-relaxed">
                      {community.tagline}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-xs text-[#64748b]">
                    <span>📍 {community.baseLocation}</span>
                    <span className="font-mono">{community.membersCount}+ members</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer Identity Note */}
        <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748b]">
          <p>
            Member ID: <span className="font-mono text-white">{user.cardNumber ?? user.id}</span> · Member since {memberSinceFormatted}
          </p>
          <p>
            Verified by NOIDA.FIT Open Community Protocol
          </p>
        </div>
      </div>
    </div>
  );
}
