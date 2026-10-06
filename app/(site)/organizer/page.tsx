import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCommunities, getOrganizerEvents } from "@/lib/data";
import { getOrganizerEventSummaries } from "@/lib/services/organizer";
import { isAdminUser } from "@/lib/services/participation";
import { OrganizerWorkspace } from "@/components/organizer/OrganizerWorkspace";

export const metadata: Metadata = { title: "Organizer workspace", description: "Manage assigned NOIDA.FIT sessions and event check-in.", robots: { index: false, follow: false } };

export default async function OrganizerPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/organizer");
  const isAdmin = isAdminUser(session.user);
  const [events, communities] = await Promise.all([
    getOrganizerEvents(session.user.id, isAdmin),
    getCommunities(),
  ]);
  const summaries = await getOrganizerEventSummaries(session.user, events);
  return <OrganizerWorkspace events={events} summaries={summaries} communities={communities} isAdmin={isAdmin} />;
}
