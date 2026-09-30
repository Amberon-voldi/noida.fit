import type { Metadata } from "next";
import { DirectoryView } from "@/components/discovery/DirectoryView";
import type { SearchParams } from "@/components/discovery/filter";

export const metadata: Metadata = {
  title: "Running Tracks, Parks & Fitness Places in Noida",
  description: "Explore tracks, parks, courts, studios, and cycling corridors across Noida and Greater Noida. Find venue notes and the communities that meet there.",
  alternates: { canonical: "/places" },
};

export default async function PlacesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <DirectoryView params={await searchParams} path="/places" type="places" title="Where the city moves." eyebrow="TRACKS, PARKS, COURTS & STUDIOS" description="Start with a landmark you know. Explore local training grounds, read the visit notes, and find the communities that call them home." />;
}
