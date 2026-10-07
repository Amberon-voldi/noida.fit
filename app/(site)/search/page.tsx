import type { Metadata } from "next";
import { DirectoryView } from "@/components/discovery/DirectoryView";
import type { SearchParams } from "@/components/discovery/filter";

export const metadata: Metadata = {
  title: "Search Noida Fitness",
  description: "Search Noida and Greater Noida fitness communities, open workouts, and places. Find a sport, sector, familiar venue, or local group.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <DirectoryView params={await searchParams} path="/search" title="Search" />;
}
