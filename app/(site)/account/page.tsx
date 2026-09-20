import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserById, getCommunityBySlug } from "@/lib/data";
import { FitnessCard } from "@/components/cards/FitnessCard";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata: Metadata = {
  title: "My Account & Fitness ID — NOIDA.FIT",
  description: "View and manage your NOIDA.FIT account, digital Fitness ID card, badges, and community memberships.",
  alternates: { canonical: "/account" },
};

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const user = getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const memberCommunities = user.communityMemberships
    .map((slug) => getCommunityBySlug(slug))
    .filter(Boolean);

  const handle = user.handle || `@${user.slug.replace(/^@/, "")}`;
  const memberSince = new Date(user.joinedAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-full pb-24 overflow-x-hidden">
      {/* Account Hero Banner */}
      <div className="relative isolate pt-8 sm:pt-12 pb-14 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-border-subtle bg-gradient-to-b from-[#0f1422] via-[#090a0f] to-[#090a0f]">
        {/* Glow backdrop */}
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 -z-10 w-[600px] h-[300px] bg-gradient-to-tr from-[#9ddc2e]/15 to-[#06b6d4]/10 blur-[110px] pointer-events-none rounded-full"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-4xl text-center">
          {/* Prominent Fitness Card Display */}
          <div className="mb-6 flex justify-center">
            <FitnessCard user={user} showControls={true} />
          </div>

          {/* Share & Copy Action Toolbar */}
          <div className="mt-4">
            <ProfileActions handle={handle} name={user.name} />
          </div>

          <div className="mt-4">
            <p className="text-xs text-[#64748b]">
              Your public profile link:{" "}
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

      {/* Account Details & Settings Bento */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 space-y-10">
        
        {/* Account Credentials & Info Card */}
        <section aria-labelledby="account-details-heading">
          <h2
            id="account-details-heading"
            className="text-lg font-bold text-white mb-4 flex items-center justify-between"
          >
            <span>Account Details</span>
            <span className="text-xs font-mono text-[#9ddc2e] bg-[#9ddc2e]/10 px-2.5 py-0.5 rounded-full border border-[#9ddc2e]/20">
              ACTIVE
            </span>
          </h2>

          <div className="rounded-2xl bg-surface/80 border border-border-subtle p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-mono text-[#64748b] uppercase">Full Name</p>
                <p className="text-sm font-semibold text-white mt-0.5">{user.name}</p>
              </div>

              <div>
                <p className="text-xs font-mono text-[#64748b] uppercase">Email Address</p>
                <p className="text-sm font-mono text-white mt-0.5">{user.email}</p>
              </div>

              <div>
                <p className="text-xs font-mono text-[#64748b] uppercase">Fitness ID Serial</p>
                <p className="text-sm font-mono font-bold text-[#9ddc2e] mt-0.5">
                  {user.cardNumber || `NF-2025-${user.id.slice(-4)}`}
                </p>
              </div>

              <div>
                <p className="text-xs font-mono text-[#64748b] uppercase">Community Handle</p>
                <p className="text-sm font-mono text-white mt-0.5">{handle}</p>
              </div>

              <div>
                <p className="text-xs font-mono text-[#64748b] uppercase">Home Turf / Sector</p>
                <p className="text-sm text-[#cbd5e1] mt-0.5">
                  {user.turfSector || "Noida Sector 21A"}
                </p>
              </div>

              <div>
                <p className="text-xs font-mono text-[#64748b] uppercase">Membership Tier</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {user.tier || "VERIFIED MEMBER"}
                </p>
              </div>
            </div>

            {user.bio && (
              <div className="pt-3 border-t border-border-subtle/60">
                <p className="text-xs font-mono text-[#64748b] uppercase">Bio</p>
                <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">{user.bio}</p>
              </div>
            )}
          </div>
        </section>

        {/* Activity Stats Summary */}
        <section aria-label="Activity Stats Summary">
          <h2 className="text-lg font-bold text-white mb-4">Activity Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {user.stats.eventsAttended}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Events Attended</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Sessions verified</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center">
              <p className="text-2xl sm:text-3xl font-black text-orange-400 font-mono">
                {user.stats.streakWeeks}w 🔥
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Current Streak</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Weeks consistent</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {user.stats.communitiesJoined}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">My Squads</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Clubs joined</p>
            </div>

            <div className="rounded-2xl bg-surface/80 border border-border-subtle p-5 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                {user.badges.length}
              </p>
              <p className="text-xs font-semibold text-[#94a3b8] mt-1">Badges Earned</p>
              <p className="text-[10px] text-[#64748b] mt-0.5">Milestones logged</p>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        {user.badges.length > 0 && (
          <section aria-labelledby="my-badges-heading">
            <h2 id="my-badges-heading" className="text-lg font-bold text-white mb-4">
              Earned Badges ({user.badges.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {user.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-2xl bg-surface/70 border border-border-subtle p-4 flex items-start gap-4"
                >
                  <span className="text-3xl flex-shrink-0 p-2 rounded-xl bg-surface-elevated border border-white/5">
                    {badge.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{badge.name}</p>
                    <p className="text-xs text-[#94a3b8] mt-0.5">{badge.description}</p>
                    <p className="text-[10px] font-mono text-[#64748b] mt-1">
                      Earned {new Date(badge.earnedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Communities */}
        {memberCommunities.length > 0 && (
          <section aria-labelledby="my-communities-heading">
            <h2 id="my-communities-heading" className="text-lg font-bold text-white mb-4">
              My Communities ({memberCommunities.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {memberCommunities.map((community) => community && (
                <Link
                  key={community.slug}
                  href={`/community/${community.slug}`}
                  className="group rounded-2xl bg-surface/70 border border-border-subtle p-5 hover:border-[#9ddc2e]/40 transition-all flex flex-col justify-between"
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

        {/* Account Actions & Sign Out */}
        <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#64748b]">
            Logged in as <span className="text-white font-mono">{user.email}</span>
          </p>
          <div className="flex items-center gap-3">
            <Link
              href={`/${handle}`}
              className="text-xs font-semibold text-[#94a3b8] hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
            >
              View Public Card ↗
            </Link>
            <SignOutButton />
          </div>
        </div>

      </div>
    </div>
  );
}
