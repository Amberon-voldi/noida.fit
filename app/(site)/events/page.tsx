import type { Metadata } from "next";
import { DirectoryView } from "@/components/discovery/DirectoryView";
import type { SearchParams } from "@/components/discovery/filter";

export const metadata: Metadata = {
  title: "Fitness Events in Noida",
  description: "Find upcoming group runs, rides, strength sessions, sports, and wellness gatherings in Noida and Greater Noida. Choose a date, sector, and activity.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <DirectoryView params={await searchParams} path="/events" type="events" title="Make a little room to move." eyebrow="THE COMMUNITY CALENDAR" description="Clear start times, meeting points, and the people hosting each session. Browse upcoming events or choose a day that works for you." />;
}
