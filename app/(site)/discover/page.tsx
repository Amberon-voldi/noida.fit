import type { Metadata } from "next";
import { DirectoryView } from "@/components/discovery/DirectoryView";
import type { SearchParams } from "@/components/discovery/filter";

export const metadata: Metadata = {
  title: "Discover Noida Fitness — Events, Communities & Places",
  description: "Find your next run, ride, workout, or game across Noida and Greater Noida. Filter local sessions, communities, and places by activity, sector, and time.",
  alternates: { canonical: "/discover" },
};

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <DirectoryView params={await searchParams} path="/discover" title="Discover" />;
}
