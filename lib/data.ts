import { communities } from "@/data/seed/communities";
import { events } from "@/data/seed/events";
import { places } from "@/data/seed/places";
import type { Community } from "@/types/community";
import type { Event } from "@/types/event";
import type { Place } from "@/types/place";

export function getCommunities(): Community[] {
  return communities;
}

export function getCommunityBySlug(slug: string): Community | undefined {
  return communities.find((c) => c.slug === slug);
}

export function getFeaturedCommunities(): Community[] {
  return communities.filter((c) => c.featured);
}

export function getUpcomingEvents(): Event[] {
  return events.slice().sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function getFeaturedEvents(): Event[] {
  return events.filter((e) => e.featured);
}

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug);
}

export function getEventsByCommunity(communitySlug: string): Event[] {
  return events.filter((e) => e.communitySlug === communitySlug);
}

export function getPlaces(): Place[] {
  return places;
}

export function getPlaceBySlug(slug: string): Place | undefined {
  return places.find((p) => p.slug === slug);
}
