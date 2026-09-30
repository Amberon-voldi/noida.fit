import type { Metadata } from "next";
import { DirectoryView } from "@/components/discovery/DirectoryView";
import type { SearchParams } from "@/components/discovery/filter";

export const metadata: Metadata = {
  title: "Fitness Communities & Clubs in Noida",
  description: "Find running clubs, cycling crews, strength groups, sports teams, and wellness circles across Noida. Explore where they meet and their weekly schedules.",
  alternates: { canonical: "/communities" },
};

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <DirectoryView params={await searchParams} path="/communities" type="communities" title="Find your people." eyebrow="LOCAL GROUPS, SHARED ROUTINES" description="A weekly rhythm beats a perfect plan. Find a community that fits your pace, schedule, and neighbourhood — then see how to join its next session." />;
}
