import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { ensureProfileForUser, profileSettings, toFitnessProfile } from "@/lib/appwrite/profiles";
import { getAccountParticipation } from "@/lib/participation";
import { getCommunities, getEvents, getPlaces, getUpcomingEvents } from "@/lib/data";
import { AccountWorkspace } from "@/components/profile/AccountWorkspace";

export const metadata: Metadata = {
  title: "My account — NOIDA.FIT",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?callbackUrl=/account");

  const [stored, participation, events, upcomingEvents, communities, places] = await Promise.all([
    ensureProfileForUser(user), getAccountParticipation(user.$id), getEvents(), getUpcomingEvents(), getCommunities(), getPlaces(),
  ]);
  return <AccountWorkspace
    profile={toFitnessProfile(stored, participation)}
    settings={profileSettings(stored)}
    email={user.email}
    canOrganize={user.labels.includes("admin") || events.some(event => event.organizerUserId === user.$id)}
    participation={participation}
    events={events}
    upcomingEvents={upcomingEvents}
    communities={communities}
    places={places}
  />;
}
