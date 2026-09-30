import type { Metadata } from "next";
import { DirectoryView } from "@/components/discovery/DirectoryView";
import type { SearchParams } from "@/components/discovery/filter";

export const metadata: Metadata = {
  title: "Discover Noida Fitness — Events, Communities & Places",
  description: "Find your next run, ride, workout, or game across Noida and Greater Noida. Filter local sessions, communities, and places by activity, sector, and time.",
  alternates: { canonical: "/discover" },
};

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <DirectoryView params={await searchParams} path="/discover" title="Find your next move." eyebrow="NOIDA & GREATER NOIDA" description="A session, a group, or a place that fits your day. Start with what you enjoy, then narrow it down to your neighbourhood." />;
}
