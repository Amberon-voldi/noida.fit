import "server-only";

import { cache } from "react";
import type { Community } from "@/types/community";
import type { Event } from "@/types/event";
import type { Place } from "@/types/place";
import type { Activity } from "@/types/activity";
import { appwriteCollections } from "@/lib/appwrite/config";
import { listAppwriteDocuments, Query } from "@/lib/appwrite/database";
import type { AppwriteDocument } from "@/lib/appwrite/database";

type ContentDocument = Record<string, unknown>;

function decodePayload<T extends object>(document: AppwriteDocument<ContentDocument>): T {
  if (typeof document.payload !== "string") throw new Error(`Malformed Appwrite content document ${document.$id}`);
  let payload: unknown;
  try {
    payload = JSON.parse(document.payload);
  } catch {
    throw new Error(`Malformed Appwrite content payload ${document.$id}`);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Malformed Appwrite content payload ${document.$id}`);
  }
  return { ...(payload as Record<string, unknown>), id: document.$id } as T;
}

function decodeActivity(document: AppwriteDocument<ContentDocument>): Activity {
  const activity = decodePayload<Activity>(document);
  return {
    ...activity,
    id: document.$id,
    slug: String(document.slug ?? activity.slug),
    name: String(document.name ?? activity.name),
    status: String(document.status ?? activity.status ?? "published") as Activity["status"],
    demo: Boolean(document.demo ?? activity.demo),
  };
}

function decodeCommunity(document: AppwriteDocument<ContentDocument>): Community {
  const community = decodePayload<Community>(document);
  return {
    ...community,
    id: document.$id,
    slug: String(document.slug ?? community.slug),
    activityId: document.activityId ? String(document.activityId) : community.activityId,
    status: String(document.status ?? community.status ?? "published") as Community["status"],
    demo: Boolean(document.demo ?? community.demo),
  };
}

function decodeEvent(document: AppwriteDocument<ContentDocument>): Event {
  const event = decodePayload<Event>(document);
  return {
    ...event,
    id: document.$id,
    slug: String(document.slug ?? event.slug),
    title: String(document.title ?? event.title),
    activityId: document.activityId ? String(document.activityId) : event.activityId,
    communitySlug: String(document.communitySlug ?? event.communitySlug),
    venueSlug: String(document.venueSlug ?? event.venueSlug),
    sector: String(document.sector ?? event.sector),
    date: String(document.date ?? event.date),
    startsAt: String(document.startsAt ?? event.startsAt),
    endsAt: String(document.endsAt ?? event.endsAt),
    featured: Boolean(document.featured ?? event.featured),
    capacity: typeof document.capacity === "number" ? document.capacity : event.capacity,
    organizerUserId: typeof document.organizerUserId === "string" ? document.organizerUserId : undefined,
    status: String(document.status ?? event.status ?? "published") as Event["status"],
    demo: Boolean(document.demo ?? event.demo),
  };
}

function decodePlace(document: AppwriteDocument<ContentDocument>): Place {
  const place = decodePayload<Place>(document);
  return {
    ...place,
    id: document.$id,
    slug: String(document.slug ?? place.slug),
    sector: String(document.sector ?? place.sector),
    featured: Boolean(document.featured ?? place.featured),
    status: String(document.status ?? place.status ?? "published") as Place["status"],
    demo: Boolean(document.demo ?? place.demo),
  };
}

const loadActivities = cache(async (): Promise<Activity[]> => {
  const documents = await listAppwriteDocuments<ContentDocument>(appwriteCollections.activities, [Query.equal("status", "published")]);
  return documents.map(decodeActivity);
});

const loadCommunities = cache(async (): Promise<Community[]> => {
  const [documents, memberships] = await Promise.all([
    listAppwriteDocuments<ContentDocument>(appwriteCollections.communities, [Query.equal("status", "published")]),
    listAppwriteDocuments<{communityId: string; status: string}>(appwriteCollections.memberships, [Query.select(["communityId", "status"])]),
  ]);
  const counts = new Map<string, number>();
  for (const member of memberships) if (member.status === "active") counts.set(member.communityId, (counts.get(member.communityId) ?? 0) + 1);
  return documents.map(document => ({ ...decodeCommunity(document), membersCount: counts.get(document.$id) ?? 0 }));
});

const loadEvents = cache(async (): Promise<Event[]> => {
  const [documents, rsvps] = await Promise.all([
    listAppwriteDocuments<ContentDocument>(appwriteCollections.events, [Query.equal("status", "published")]),
    listAppwriteDocuments<{eventId: string; status: string}>(appwriteCollections.rsvps, [Query.select(["eventId", "status"])]),
  ]);
  const counts = new Map<string, number>();
  for (const rsvp of rsvps) if (rsvp.status === "confirmed") counts.set(rsvp.eventId, (counts.get(rsvp.eventId) ?? 0) + 1);
  return documents.map(document => ({ ...decodeEvent(document), attendeesCount: counts.get(document.$id) ?? 0 })).sort((a, b) => (a.startsAt ?? a.date).localeCompare(b.startsAt ?? b.date));
});

const loadPlaces = cache(async (): Promise<Place[]> => {
  const documents = await listAppwriteDocuments<ContentDocument>(appwriteCollections.places, [Query.equal("status", "published")]);
  return documents.map(decodePlace);
});

export async function getActivities(): Promise<Activity[]> {
  return loadActivities();
}

export async function getActivityBySlug(slug: string): Promise<Activity | undefined> {
  return (await loadActivities()).find((activity) => activity.slug === slug);
}

export async function getCommunities(): Promise<Community[]> {
  return loadCommunities();
}

export async function getFeaturedCommunities(): Promise<Community[]> {
  return (await loadCommunities()).filter((community) => community.featured);
}

export async function getCommunityBySlug(slug: string): Promise<Community | undefined> {
  return (await loadCommunities()).find((community) => community.slug === slug);
}

export async function getEvents(): Promise<Event[]> {
  return loadEvents();
}

export async function getUpcomingEvents(): Promise<Event[]> {
  return (await loadEvents()).filter((event) => Date.parse(event.endsAt ?? `${event.date}T23:59:59+05:30`) > Date.now() && event.status === "published");
}

export async function getFeaturedEvents(): Promise<Event[]> {
  return (await getUpcomingEvents()).filter((event) => event.featured);
}

export async function getEventBySlug(slug: string): Promise<Event | undefined> {
  return (await loadEvents()).find((event) => event.slug === slug);
}

export async function getEventById(id: string): Promise<Event | undefined> {
  return (await loadEvents()).find((event) => event.id === id);
}

export async function getEventsByCommunity(communitySlug: string): Promise<Event[]> {
  return (await loadEvents()).filter((event) => event.communitySlug === communitySlug);
}

export async function getPlaces(): Promise<Place[]> {
  return loadPlaces();
}

export async function getPlaceBySlug(slug: string): Promise<Place | undefined> {
  return (await loadPlaces()).find((place) => place.slug === slug);
}

export interface DirectorySearchResults {
  activities: Activity[];
  communities: Community[];
  events: Event[];
  places: Place[];
}

export interface Directory {
  activities: Activity[];
  communities: Community[];
  events: Event[];
  places: Place[];
}

export async function getDirectory(): Promise<Directory> {
  const [directoryActivities, directoryCommunities, directoryEvents, directoryPlaces] = await Promise.all([
    loadActivities(), loadCommunities(), loadEvents(), loadPlaces(),
  ]);
  return { activities: directoryActivities, communities: directoryCommunities, events: directoryEvents, places: directoryPlaces };
}

export async function searchDirectory(query: string): Promise<DirectorySearchResults> {
  const needle = query.trim().toLowerCase();
  if (!needle) return { activities: [], communities: [], events: [], places: [] };

  const directory = await getDirectory();
  const matches = (value: string | undefined) => value?.toLowerCase().includes(needle) ?? false;
  return {
    activities: directory.activities.filter((activity) => [activity.name, activity.description, activity.slug, ...(activity.tags ?? [])].some(matches)),
    communities: directory.communities.filter((community) => [community.name, community.tagline, community.description, community.category, community.baseLocation, ...community.meetingDays].some(matches)),
    events: directory.events.filter((event) => [event.title, event.description, event.category, event.communityName, event.venueName, event.sector, event.level].some(matches)),
    places: directory.places.filter((place) => [place.name, place.category, place.sector, place.address, place.description, ...place.amenities].some(matches)),
  };
}
