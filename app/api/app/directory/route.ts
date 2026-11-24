import { getDirectory, getUpcomingEvents } from "@/lib/data";
import { jsonError } from "@/lib/http";
import { PAID_TICKET_BOOKING } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * Everything the .fit app browses, in one public call: activities, clubs, places and upcoming sessions
 * (published only, with live counts), plus how paid sessions are booked. The app searches and filters it on
 * the phone, so filters answer instantly and the last copy still shows offline.
 */
export async function GET() {
  try {
    const [directory, events] = await Promise.all([getDirectory(), getUpcomingEvents()]);
    return Response.json({
      activities: directory.activities,
      communities: directory.communities,
      places: directory.places,
      events,
      paidBooking: PAID_TICKET_BOOKING,
    }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } });
  } catch (error) {
    return jsonError(error, "Sessions, clubs and places could not be loaded. Pull to refresh.");
  }
}
