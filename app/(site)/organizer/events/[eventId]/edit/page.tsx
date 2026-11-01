import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { getManagedEventRecord, organizerVenues } from "@/lib/services/organizer-events";
import { listAppwriteDocuments, Query } from "@/lib/appwrite/database";
import { appwriteCollections } from "@/lib/appwrite/config";
import { EventEditor, type EditorValues } from "@/components/organizer/EventEditor";

export const metadata: Metadata = { title: "Edit session", robots: { index: false, follow: false } };

type Props = { params: Promise<{ eventId: string }> };

export default async function EditEventPage({ params }: Props) {
  const { eventId } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/organizer/events/${eventId}/edit`)}`);
  let stored;
  try { stored = await getManagedEventRecord(session.user, eventId); } catch (error) {
    if (error instanceof HttpError && [400, 403, 404].includes(error.status)) notFound();
    throw error;
  }
  const [venues, rsvps] = await Promise.all([
    organizerVenues(),
    listAppwriteDocuments<{ status: string }>(appwriteCollections.rsvps, [Query.equal("eventId", eventId), Query.select(["status"])]),
  ]);
  const record = stored.record;
  const venueList = venues.map(place => ({ slug: place.slug, name: place.name, detail: place.sector }));
  // Keep the current venue selectable even if it has since been unpublished.
  if (!venueList.some(place => place.slug === record.venueSlug)) venueList.unshift({ slug: String(record.venueSlug), name: String(record.venueName), detail: String(record.sector) });
  const text = (key: string) => typeof record[key] === "string" ? record[key] as string : undefined;
  const initial: EditorValues = {
    title: String(record.title), description: String(record.description), date: String(record.date),
    startTime: String(record.startTime), endTime: String(record.endTime), venueSlug: String(record.venueSlug),
    capacity: Number(record.capacity), price: String(record.price), status: record.status as EditorValues["status"],
    level: text("level"), distance: text("distance"), pace: text("pace"), routeOverview: text("routeOverview"),
    whatToBring: Array.isArray(record.whatToBring) ? record.whatToBring.map(String) : [],
  };
  return <EventEditor mode="edit" eventId={eventId} expectedUpdatedAt={stored.updatedAt} clubs={[]} venues={venueList} initial={initial}
    clubName={String(record.communityName)} confirmedRsvps={rsvps.filter(rsvp => rsvp.status === "confirmed").length} />;
}
