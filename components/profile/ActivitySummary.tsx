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
    <dl className="grid grid-cols-2 gap-3">
      {metrics.map(({ label, value }) => <div key={label} className="rounded-xl border border-border-subtle bg-surface p-4 text-center"><dd className="text-2xl font-bold text-white">{value}</dd><dt className="mt-1 text-xs text-text-secondary">{label}</dt></div>)}
    </dl>
  );
}
