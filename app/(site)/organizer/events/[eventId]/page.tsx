import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizerEvents } from "@/lib/data";
import { HttpError } from "@/lib/http";
import { getOrganizerEventSummary } from "@/lib/services/organizer";
import { isGiftLinksConfigured, isGuestPassesConfigured, listGiftLinks } from "@/lib/services/gifts";
import { isAdminUser } from "@/lib/services/participation";
import { EventDashboard } from "@/components/organizer/EventDashboard";
import { DASHBOARD_TABS, type DashboardTab } from "@/components/organizer/labels";

export const metadata: Metadata = { title: "Session dashboard", description: "Guests, check-in, revenue and gift links for one NOIDA.FIT session.", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ eventId: string }>; searchParams: Promise<{ tab?: string | string[] }> };

export default async function EventDashboardPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { tab } = await searchParams;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/organizer/events/${eventId}`)}`);
  // Same scope as the workspace list: only events this account manages (all, for admins).
  const event = (await getOrganizerEvents(session.user.id, isAdminUser(session.user))).find(item => item.id === eventId);
  if (!event) notFound();
  const [summary, giftLinks] = await Promise.all([
    getOrganizerEventSummary(session.user, event),
    isGiftLinksConfigured() ? listGiftLinks(session.user, eventId).catch(error => {
      if (error instanceof HttpError && error.code === "GIFTS_NOT_CONFIGURED") return null;
      throw error;
    }) : null,
  ]);
  // On the day, the desk is what an organizer opens the session for.
  const initialTab: DashboardTab = DASHBOARD_TABS.find(item => item === tab) ?? (summary.checkInWindow === "open" ? "checkin" : "overview");
  return <EventDashboard summary={summary} giftLinks={giftLinks} guestPasses={isGuestPassesConfigured()} initialTab={initialTab} />;
}
