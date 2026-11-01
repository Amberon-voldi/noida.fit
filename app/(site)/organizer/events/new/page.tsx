import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { organizerClubs, organizerVenues } from "@/lib/services/organizer-events";
import { EventEditor } from "@/components/organizer/EventEditor";

export const metadata: Metadata = { title: "New session", robots: { index: false, follow: false } };

/** Tomorrow's date in India, as the form's default. */
function tomorrowInIndia(): string {
  return new Date(Date.now() + 330 * 60_000 + 86_400_000).toISOString().slice(0, 10);
}

export default async function NewEventPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/organizer/events/new");
  const [clubs, venues] = await Promise.all([organizerClubs(session.user), organizerVenues()]);
  if (!clubs.length) redirect("/organizer");
  const tomorrow = tomorrowInIndia();
  return <EventEditor mode="create"
    clubs={clubs.map(club => ({ slug: club.slug, name: club.name }))}
    venues={venues.map(place => ({ slug: place.slug, name: place.name, detail: place.sector }))}
    initial={{ communitySlug: clubs.length === 1 ? clubs[0].slug : "", title: "", description: "", date: tomorrow, startTime: "06:00 AM", endTime: "07:00 AM", venueSlug: "", capacity: 20, price: "FREE", status: "published", whatToBring: ["Water bottle"] }} />;
}
