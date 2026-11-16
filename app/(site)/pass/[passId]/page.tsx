import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { GuestPass } from "@/components/gifts/GuestPass";
import { TicketConfirmation, type BookedTicket } from "@/components/participation/TicketConfirmation";
import { seeYouLabel } from "@/lib/calendar";
import { formatDate } from "@/lib/config";
import { parseEventPrice } from "@/lib/pricing";
import { getGuestPass } from "@/lib/services/gifts";

type Props = { params: Promise<{ passId: string }>; searchParams: Promise<{ claimed?: string | string[] }> };

/** Metadata and page share one read per request. */
const load = cache((passId: string) => getGuestPass(passId));

/** The link is the ticket: never indexed, and kept out of Referer headers sent to other sites. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await load((await params).passId);
  return { title: view ? `Guest pass · ${view.event.title}` : "Guest pass", robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function GuestPassPage({ params, searchParams }: Props) {
  const { passId } = await params;
  const view = await load(passId);
  if (!view) notFound();
  const { event, pass, state } = view;
  const pricing = parseEventPrice(event.price);
  const ticket: BookedTicket = {
    eventId: event.id, eventSlug: event.slug, title: event.title, date: event.date, dateLabel: formatDate(event.date), startTime: event.startTime, endTime: event.endTime,
    venueName: event.venueName, sector: event.sector, communityName: event.communityName, category: event.category, image: event.coverImageUrl ?? event.imageUrl,
    seatNumber: pass.seatNumber, kind: "gift", ...(pricing.kind === "paid" ? { priceLabel: pricing.label } : {}), holder: pass.name,
    countdown: seeYouLabel(event.date, event.startTime),
  };
  // Straight from claiming the gift: celebrate once, then the pass is underneath.
  const fresh = (await searchParams).claimed === "1" && state === "valid";
  return <div className="px-4 pb-8 pt-5 sm:py-12">
    {fresh && <TicketConfirmation ticket={ticket} clearParam="claimed" guest />}
    <GuestPass passId={pass.id} ticket={ticket} state={state} checkedInAt={pass.checkedInAt}
      directions={event.demo ? undefined : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueName}, ${event.sector}, Noida`)}`} />
  </div>;
}
