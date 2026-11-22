import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { isMediaPath } from "@/lib/media";
import { getManagedEventRecord, organizerClubs, organizerVenues } from "@/lib/services/organizer-events";
import { EventEditor, type EditorValues } from "@/components/organizer/EventEditor";
import { isPayuConfigured } from "@/lib/payments/payu";

export const metadata: Metadata = { title: "New session", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ from?: string | string[] }> };

/** Tomorrow's date in India, as the form's default. */
function tomorrowInIndia(): string {
  return new Date(Date.now() + 330 * 60_000 + 86_400_000).toISOString().slice(0, 10);
}

/** A session this account manages, as a starting point for the next one: same details, a new date. */
async function copyOf(user: Parameters<typeof getManagedEventRecord>[0], eventId: string, date: string): Promise<{ values: EditorValues; title: string } | null> {
  let stored;
  try { stored = await getManagedEventRecord(user, eventId); } catch (error) {
    if (error instanceof HttpError && [400, 403, 404].includes(error.status)) return null;
    throw error;
  }
  const record = stored.record;
  const text = (key: string) => typeof record[key] === "string" ? record[key] as string : undefined;
  const banner = text("coverImageUrl");
  return {
    title: String(record.title),
    values: {
      communitySlug: String(record.communitySlug), title: String(record.title), description: String(record.description), date,
      startTime: String(record.startTime), endTime: String(record.endTime), venueSlug: String(record.venueSlug),
      capacity: Number(record.capacity) || 20, price: String(record.price), status: "published",
      level: text("level"), distance: text("distance"), pace: text("pace"), routeOverview: text("routeOverview"), lateSignup: record.lateSignup === true,
      // Only an uploaded banner can be carried over; one the team set stays with its own session.
      ...(isMediaPath(banner) ? { coverImageUrl: banner } : {}),
      whatToBring: Array.isArray(record.whatToBring) ? record.whatToBring.map(String) : [],
    },
  };
}

export default async function NewEventPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/organizer/events/new${typeof from === "string" ? `?from=${from}` : ""}`)}`);
  const [clubs, venues] = await Promise.all([organizerClubs(session.user), organizerVenues()]);
  if (!clubs.length) redirect("/organizer");
  const tomorrow = tomorrowInIndia();
  const copy = typeof from === "string" ? await copyOf(session.user, from, tomorrow) : null;
  const clubOptions = clubs.map(club => ({ slug: club.slug, name: club.name }));
  const venueOptions = venues.map(place => ({ slug: place.slug, name: place.name, detail: place.sector }));
  // A copied session keeps its club and venue only if they can still be chosen.
  if (copy && !clubOptions.some(club => club.slug === copy.values.communitySlug)) copy.values.communitySlug = clubs.length === 1 ? clubs[0].slug : "";
  if (copy && !venueOptions.some(place => place.slug === copy.values.venueSlug)) copy.values.venueSlug = "";
  return <EventEditor mode="create" payOnline={isPayuConfigured()} clubs={clubOptions} venues={venueOptions} copiedFrom={copy?.title}
    initial={copy?.values ?? { communitySlug: clubs.length === 1 ? clubs[0].slug : "", title: "", description: "", date: tomorrow, startTime: "06:00 AM", endTime: "07:00 AM", venueSlug: "", capacity: 20, price: "FREE", status: "published", whatToBring: ["Water bottle"] }} />;
}
