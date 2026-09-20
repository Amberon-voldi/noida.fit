import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserById, getCommunityBySlug } from "@/lib/data";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ProfileActions } from "@/components/profile/ProfileActions";

export const metadata: Metadata = {
  title: "My Fitness ID & Member Pass",
  description: "Your official Noida digital fitness card — badges, clubs, and verified attendance.",
  alternates: { canonical: "/fitness-id" },
};

export default async function MyFitnessIdPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const memberCommunities = user.communityMemberships
    .map((slug) => getCommunityBySlug(slug))
    .filter(Boolean);

  const handle = user.handle || `@${user.slug.replace(/^@/, "")}`;

  return (
    <div className="min-h-full pb-20 overflow-x-hidden">
      {/* Top Banner / Card Showcase */}
      <div className="relative isolate pt-8 sm:pt-12 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-border-subtle bg-gradient-to-b from-[#0f1422] via-[#090a0f] to-[#090a0f]">
        {/* Glow backdrop */}
        <div
          className="absolute top-8 left-1/2 -translate-x-1/2 -z-10 w-[500px] h-[280px] bg-gradient-to-tr from-[#9ddc2e]/15 to-[#06b6d4]/10 blur-[100px] pointer-events-none rounded-full"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-4xl text-center">
          {/* Center 3D Fitness Card */}
          <div className="mb-6 flex justify-center">
            <FitnessCard user={user} showControls={true} />
          </div>

          {/* Quick Actions */}
          <div className="mt-5">
            <ProfileActions handle={handle} name={user.name} />
          </div>

          {/* Direct Public Link Pill */}
          <div className="mt-4">
            <p className="text-xs text-[#64748b]">
              Your public handle:{" "}
              <Link
                href={`/${handle}`}
                className="font-mono text-white hover:text-[#9ddc2e] transition-colors underline decoration-[#9ddc2e]/50 underline-offset-4"
              >
                noida.fit/{handle}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Stats & Content Bento */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 space-y-12">
        {/* Bento Stats Row */}
        <section aria-label="My Performance Stats">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center relative overflow-hidden group hover:border-[#9ddc2e]/40 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#9ddc2e]/40" />
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {user.stats.eventsAttended}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Events Attended</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Sessions logged</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center relative overflow-hidden group hover:border-orange-500/40 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500/50" />
              <p className="text-2xl sm:text-3xl font-black text-orange-400 font-mono">
                {user.stats.streakWeeks}w 🔥
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Current Streak</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Weeks consistent</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500/50" />
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {user.stats.communitiesJoined}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">My Clubs</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Active squads</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center relative overflow-hidden group hover:border-purple-500/40 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500/50" />
              <p className="text-xs sm:text-sm font-mono font-bold text-white mt-1.5 truncate">
                {user.turfSector ? user.turfSector.split("·")[0] : "Sector 21A"}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Home Sector</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Training ground</p>
            </div>
          </div>
        </section>

        {/* Badges */}
        {user.badges.length > 0 && (
          <section aria-labelledby="my-badges-heading">
            <h2 id="my-badges-heading" className="text-lg sm:text-xl font-bold text-white mb-4">
              My Badges ({user.badges.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {user.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-2xl bg-surface/70 border border-border-subtle p-4 flex items-start gap-4 hover:border-border-strong transition-colors"
                >
                  <span className="text-3xl flex-shrink-0 p-2 rounded-xl bg-surface-elevated border border-white/5">
                    {badge.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{badge.name}</p>
                    <p className="text-xs text-[#94a3b8] mt-0.5">{badge.description}</p>
                    <p className="text-[10px] font-mono text-[#64748b] mt-1.5">
                      Earned {new Date(badge.earnedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Communities */}
        {memberCommunities.length > 0 && (
          <section aria-labelledby="my-communities-heading">
            <h2 id="my-communities-heading" className="text-lg sm:text-xl font-bold text-white mb-4">
              My Communities ({memberCommunities.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {memberCommunities.map((community) => community && (
                <Link
                  key={community.slug}
                  href={`/community/${community.slug}`}
                  className="group rounded-2xl bg-surface/70 border border-border-subtle p-5 hover:border-[#9ddc2e]/40 hover:bg-surface-elevated/80 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#9ddc2e] font-semibold">
                      {community.category}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-[#9ddc2e] transition-colors mt-1">
                      {community.name}
                    </h3>
                    <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">
                      {community.tagline}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-xs text-[#64748b]">
                    <span>📍 {community.baseLocation}</span>
                    <span>View squad →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
