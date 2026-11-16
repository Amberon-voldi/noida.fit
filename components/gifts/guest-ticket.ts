import type { BookedTicket } from "@/components/participation/TicketConfirmation";
import { seeYouLabel } from "@/lib/calendar";
import { formatDate } from "@/lib/config";
import { parseEventPrice } from "@/lib/pricing";
import type { Event } from "@/types/event";

/** A guest's ticket as their pass prints it: on the pass page, and on a gift link they've claimed. */
export function guestTicket(event: Event, pass: { name: string; seatNumber?: number }): BookedTicket {
  const pricing = parseEventPrice(event.price);
  return {
    eventId: event.id, eventSlug: event.slug, title: event.title, date: event.date, dateLabel: formatDate(event.date), startTime: event.startTime, endTime: event.endTime,
    venueName: event.venueName, sector: event.sector, communityName: event.communityName, category: event.category, image: event.coverImageUrl ?? event.imageUrl,
    seatNumber: pass.seatNumber, kind: "gift", ...(pricing.kind === "paid" ? { priceLabel: pricing.label } : {}), holder: pass.name,
    countdown: seeYouLabel(event.date, event.startTime),
  };
}

/** Google Maps directions to the venue. None for demo listings. */
export function venueDirections(event: Event): string | undefined {
  return event.demo ? undefined : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueName}, ${event.sector}, Noida`)}`;
}
