import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizerEvents } from "@/lib/data";
import { getOrganizerEventSummaries } from "@/lib/services/organizer";
import { organizerClubs } from "@/lib/services/organizer-events";
import { isAdminUser } from "@/lib/services/participation";
import { OrganizerWorkspace } from "@/components/organizer/OrganizerWorkspace";

export const metadata: Metadata = { title: "Organizer workspace", description: "Manage NOIDA.FIT sessions: guests, revenue, gift links and check-in.", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ view?: string | string[] }> };

export default async function OrganizerPage({ searchParams }: Props) {
  const { view } = await searchParams;
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/organizer");
  const isAdmin = isAdminUser(session.user);
  const [events, communities] = await Promise.all([
    getOrganizerEvents(session.user.id, isAdmin),
    // Clubs this account runs, including any whose organizers the team set before their first session.
    organizerClubs(session.user),
  ]);
  const summaries = await getOrganizerEventSummaries(session.user, events);
  return <OrganizerWorkspace events={events} summaries={summaries} communities={communities} isAdmin={isAdmin} view={view === "drafts" || view === "past" ? view : "upcoming"} />;
}
