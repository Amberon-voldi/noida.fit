import type { FitnessProfile } from "@/types/user";

export function ActivitySummary({ stats }: { stats: FitnessProfile["stats"] }) {
  const metrics = [
    { label: "Verified activities", value: stats.verifiedActivities },
    { label: "Events attended", value: stats.eventsAttended },
    { label: "Communities followed", value: stats.communitiesJoined },
    { label: "Week streak", value: stats.streakWeeks },
  ].filter((metric) => metric.value !== null && metric.value !== undefined);

  if (!metrics.length) return null;
  return (
    <dl className="account-stat-grid">
      {metrics.map(({ label, value }) => <div key={label} className="account-stat"><dd className="text-2xl font-bold leading-none text-white">{value}</dd><dt className="mt-2 text-[11px] leading-snug text-text-secondary">{label}</dt></div>)}
    </dl>
  );
}
