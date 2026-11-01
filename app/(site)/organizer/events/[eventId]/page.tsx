import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizerEvents } from "@/lib/data";
import { getOrganizerEventSummary } from "@/lib/services/organizer";
import { isAdminUser } from "@/lib/services/participation";
import { EventDesk } from "@/components/organizer/EventDesk";

export const metadata: Metadata = { title: "Check-in desk", description: "Scan .fit IDs and track attendance for one NOIDA.FIT session.", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ eventId: string }> };

export default async function EventDeskPage({ params }: Props) {
  const { eventId } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/organizer/events/${eventId}`)}`);
  // Same scope as the workspace list: only events this account manages (all, for admins).
  const event = (await getOrganizerEvents(session.user.id, isAdminUser(session.user))).find(item => item.id === eventId);
  if (!event) notFound();
  return <EventDesk summary={await getOrganizerEventSummary(session.user, event)} />;
}
