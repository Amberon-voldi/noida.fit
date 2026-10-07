import type { Directory } from "@/lib/data";
import type { Activity } from "@/types/activity";
import type { Event } from "@/types/event";
import type { Community } from "@/types/community";
import type { Place } from "@/types/place";
import { filterDirectory, readFilters } from "@/components/discovery/filter";

export interface HomeHighlights {
  activities: Activity[];
  events: Event[];
  communities: Community[];
  places: Place[];
  eventWindow: "week" | "upcoming";
  hasDemo: boolean;
}
const published = (item: { status?: string }) => (item.status ?? "published") === "published";
function featuredFirst<T extends { featured?: boolean }>(items: T[]): T[] {
  return [...items.filter(item => item.featured), ...items.filter(item => !item.featured)];
}
/** Bounded editorial picks from the public directory, never recommendations or fabricated activity. */
export function homeHighlights(directory: Directory, now = new Date()): HomeHighlights {
  const visible = {
    activities: directory.activities.filter(published), events: directory.events.filter(published),
    communities: directory.communities.filter(published), places: directory.places.filter(published),
  };
  const week = filterDirectory(visible, readFilters({ type: "events", date: "week" }), now).events;
  const upcoming = week.length ? week : filterDirectory(visible, readFilters({ type: "events" }), now).events;
  const preferred = ["running", "cycling", "strength", "sports", "wellness", "outdoor"];
  const activities = [...visible.activities].sort((a, b) => {
    const order = (slug: string) => preferred.includes(slug) ? preferred.indexOf(slug) : preferred.length;
    return order(a.slug) - order(b.slug);
  }).slice(0, 6);
  const events = upcoming.slice(0, 3);
  const communities = featuredFirst(visible.communities).slice(0, 3);
  const places = featuredFirst(visible.places).slice(0, 3);
  return { activities, events, communities, places, eventWindow: week.length ? "week" : "upcoming", hasDemo: [...events, ...communities, ...places, ...activities].some(item => item.demo === true) };
}
