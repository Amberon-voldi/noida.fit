import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getEvents } from "@/lib/data";
import { OrganizerTokenForm } from "@/components/participation/OrganizerTokenForm";

export const metadata: Metadata = { title: "Organizer check-in", description: "Time-limited event check-in codes.", robots: { index: false, follow: false } };

export default async function OrganizerPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/organizer");
  const events = (await getEvents()).filter(event => session.user.labels?.includes("admin") || event.organizerUserId === session.user.id);
  return <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
    <p className="font-mono text-xs uppercase tracking-widest text-velocity">Organizer tools</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight">Event check-in QR</h1>
    <p className="mt-3 text-sm leading-relaxed text-text-secondary">Display this code at your meeting point. Attendees need a confirmed RSVP and their own account. Codes open 30 minutes before the start and expire in 15 minutes.</p>
    {events.length ? <div className="mt-8 rounded-xl border border-border-subtle bg-surface p-5 sm:p-7"><OrganizerTokenForm events={events.map(event => ({id:event.id,title:event.title,date:event.date}))} /></div>
    : <div className="mt-8 rounded-xl border border-border-subtle p-6"><h2 className="font-semibold">No events assigned to you</h2><p className="mt-2 text-sm text-text-secondary">An administrator can assign your account as an event organizer. Attendees cannot generate attendance codes.</p><Link href="/for-organizers" className="mt-4 inline-block text-velocity underline">About listing an event</Link></div>}
  </div>;
}
