import type { Directory } from "@/lib/data";
import type { Activity } from "@/types/activity";
import type { Event } from "@/types/event";

export type SearchParams = Record<string, string | string[] | undefined>;
export type DirectoryType = "events" | "communities" | "places";
export interface DirectoryFilters {
  q: string;
  activity: string;
  date: string;
  sector: string;
  price: string;
  time: string;
  type: string;
  category: string;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const option = (value: string) => value.toLowerCase() === "all" ? "" : value.toLowerCase();
const DAY = 86_400_000;

export function readFilters(params: SearchParams, type?: DirectoryType): DirectoryFilters {
  const rawType = option(first(params.type));
  return {
    q: first(params.q).trim().slice(0, 160),
    activity: option(first(params.activity)),
    date: option(first(params.date)),
    sector: first(params.sector).trim().slice(0, 100),
    price: option(first(params.price) || first(params["free-paid"])),
    time: option(first(params.time)),
    type: type ?? ({ event: "events", community: "communities", place: "places" }[rawType] || rawType),
    category: first(params.category).toLowerCase() === "all" ? "" : first(params.category),
  };
}

export function filterUrl(path: string, filters: DirectoryFilters, changes: Partial<DirectoryFilters> = {}): string {
  const params = new URLSearchParams();
  Object.entries({ ...filters, ...changes }).forEach(([key, value]) => { if (value) params.set(key, value); });
  return `${path}${params.size ? `?${params.toString()}` : ""}`;
}

const indiaDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

export function indiaDate(now = new Date()): string {
  return indiaDateFormatter.format(now);
}

function hourOf(time: string): number {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return Number.NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23)) return Number.NaN;
  return (match[3] ? hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0) : hour) + minute / 60;
}

export function eventTimestamp(event: Event, end = false): number {
  const stored = Date.parse((end ? event.endsAt : event.startsAt) ?? "");
  if (Number.isFinite(stored)) return stored;
  const hour = hourOf(end ? event.endTime : event.startTime);
  if (!Number.isFinite(hour)) return Number.NaN;
  const dayStart = Date.parse(`${event.date}T00:00:00+05:30`);
  const overnight = end && hour < hourOf(event.startTime);
  return dayStart + Math.round(hour * 3_600_000) + (overnight ? DAY : 0);
}

export function eventIsUpcoming(event: Event, now = new Date()): boolean {
  const end = eventTimestamp(event, true);
  return event.status !== "cancelled" && event.status !== "draft" && (Number.isFinite(end) ? end >= now.getTime() : event.date >= indiaDate(now));
}

export function matchesActivity(activity: Activity, category?: string, activityId?: string): boolean {
  return activity.id === activityId || activity.slug === activityId || activity.slug === category;
}

const QUERY_SYNONYMS: Record<string, string> = {
  run: "running", runs: "running", runner: "running", runners: "running",
  cycle: "cycling", cycles: "cycling", bike: "cycling", ride: "cycling", rides: "cycling",
  sec: "sector", yogi: "yoga",
};
const STOP_WORDS = new Set(["near", "me", "in", "the", "and", "for", "a", "at", "this", "club", "clubs", "group", "groups", "community", "communities", "event", "events", "session", "sessions"]);

function queryMatches(terms: string[], fields: Array<string | undefined>): boolean {
  if (!terms.length) return true;
  const words = new Set(normalize(fields.filter(Boolean).join(" ")).split(" ").map(word => QUERY_SYNONYMS[word] ?? word));
  return terms.every(term => words.has(term));
}

/** Small, explicit intent vocabulary; dates always use Noida's timezone. */
function queryIntent(filters: DirectoryFilters): DirectoryFilters {
  const terms = normalize(filters.q).split(" ");
  const has = (...words: string[]) => words.some((word) => terms.includes(word));
  const dates = ["today", "tomorrow", "weekend"];
  const times = ["morning", "evening", "daytime"];
  const intent = new Set([...dates, ...times, "free", "paid"]);
  return {
    ...filters,
    q: terms.filter((term) => !intent.has(term)).join(" "),
    date: filters.date || dates.find((word) => has(word)) || "",
    time: filters.time || times.find((word) => has(word)) || "",
    price: filters.price || (has("free") ? "free" : has("paid") ? "paid" : ""),
    type: filters.type || (has("club", "clubs", "group", "groups", "community", "communities") ? "communities" : has("event", "events", "session", "sessions") ? "events" : ""),
  };
}

function dateMatches(date: string, window: string, today: Date): boolean {
  if (!window) return true;
  const target = Date.parse(`${date}T00:00:00Z`);
  if (window === "today") return target === today.getTime();
  if (window === "tomorrow") return target === today.getTime() + DAY;
  if (window === "week") return target >= today.getTime() && target < today.getTime() + DAY * 7;
  if (window === "weekend") {
    const untilSaturday = today.getUTCDay() === 0 ? -1 : (6 - today.getUTCDay() + 7) % 7;
    const saturday = today.getTime() + untilSaturday * DAY;
    return target >= Math.max(today.getTime(), saturday) && target < saturday + 2 * DAY;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(window) && date === window;
}

function priceMatches(value: string, price: string): boolean {
  if (!price) return true;
  const normalized = value.trim();
  const free = /^(free|0(?:\.00)?|₹\s*0(?:\.00)?)(?:\s|$)/i.test(normalized);
  // Unknown venue fees are neither free nor paid; never infer a price from arbitrary digits.
  const paid = !free && (/^(?:₹|INR\s*|Rs\.?\s*)[1-9][\d,]*(?:\.\d+)?/i.test(normalized) || /^(?:paid|entry fee applies)(?:\s|;|$)/i.test(normalized));
  return price === "free" ? free : price === "paid" ? paid : false;
}

const ACTIVITY_CATEGORIES: Record<string, string> = {
  yoga: "wellness", mobility: "wellness", meditation: "wellness", pilates: "wellness",
  football: "sports", badminton: "sports", basketball: "sports", tennis: "sports", swimming: "sports", skating: "sports",
  calisthenics: "strength", hiking: "outdoor",
};

export function filterDirectory(directory: Directory, input: DirectoryFilters, now = new Date()) {
  const filters = queryIntent(input);
  const terms = normalize(filters.q).split(" ").filter(word => word && !STOP_WORDS.has(word)).map(word => QUERY_SYNONYMS[word] ?? word);
  let today: Date | undefined;
  const matchesDate = (date: string) => !filters.date || dateMatches(date, filters.date, today ??= new Date(`${indiaDate(now)}T00:00:00Z`));
  const sector = filters.sector ? ` ${normalize(filters.sector)} ` : "";
  // Request-local indexes preserve first-match semantics, including ID/slug collisions.
  const activities = new Map<string, Activity>();
  for (const activity of directory.activities) {
    if (!activities.has(activity.id)) activities.set(activity.id, activity);
    if (!activities.has(activity.slug)) activities.set(activity.slug, activity);
  }
  const selected = activities.get(filters.activity);
  const activityMatch = (category?: string, activityId?: string) => !filters.activity || (selected ? matchesActivity(selected, category, activityId) : filters.activity === category);
  const sectorMatch = (value: string) => !sector || ` ${normalize(value)} `.includes(sector);
  const show = (type: DirectoryType) => !filters.type || filters.type === type;
  const events = show("events") ? directory.events.filter((event) => {
    const activityName = event.activityId ? activities.get(event.activityId)?.name : undefined;
    const hour = hourOf(event.startTime);
    const timeMatch = !filters.time || (filters.time === "morning" ? hour >= 5 && hour < 8.5 : filters.time === "evening" ? hour >= 17 && hour < 21.5 : (filters.time === "day" || filters.time === "daytime") && hour >= 8.5 && hour < 17);
    return eventIsUpcoming(event, now) && activityMatch(event.category, event.activityId) && sectorMatch(event.sector) && matchesDate(event.date) && timeMatch && priceMatches(event.price, filters.price) && queryMatches(terms, [event.title, event.description, activityName, event.category, event.communityName, event.venueName, event.sector, event.level, ...(event.tags ?? [])]);
  }).sort((a, b) => (eventTimestamp(a) || 0) - (eventTimestamp(b) || 0)) : [];
  // Date/time apply only to scheduled events. A community has no assumed joining fee.
  const eventOnly = !!filters.date || !!filters.time;
  const communities = show("communities") && !eventOnly && !filters.price ? directory.communities.filter((community) => {
    const activityName = community.activityId ? activities.get(community.activityId)?.name : undefined;
    return activityMatch(community.category, community.activityId) && sectorMatch(community.baseLocation) && queryMatches(terms, [community.name, community.tagline, community.description, community.baseLocation, activityName, community.category, ...(community.tags ?? [])]);
  }) : [];
  const venueActivities = new Map<string, string[]>();
  if (show("places") && !eventOnly && (filters.activity || terms.length)) {
    for (const event of directory.events) {
      const linked = venueActivities.get(event.venueSlug) ?? [];
      linked.push(event.activityId ?? "", event.category);
      venueActivities.set(event.venueSlug, linked);
    }
  }
  const places = show("places") && !eventOnly ? directory.places.filter((place) => {
    const linkedActivities = venueActivities.get(place.slug) ?? [];
    const placeActivities = [...(place.activities ?? []), ...linkedActivities].flatMap((value) => {
      const activity = activities.get(value);
      const slug = activity?.slug ?? value;
      return [value, slug, activity?.name ?? "", ACTIVITY_CATEGORIES[slug] ?? ""];
    });
    const activityMatches = !filters.activity || placeActivities.some((value) => value === filters.activity || value === selected?.id || value === selected?.slug);
    return activityMatches && (!filters.category || place.category === filters.category) && sectorMatch(`${place.sector} ${place.address}`) && priceMatches(place.priceIndicator ?? "", filters.price) && queryMatches(terms, [place.name, place.category, place.description, place.address, place.sector, ...placeActivities, ...place.amenities]);
  }) : [];
  return { events, communities, places, total: events.length + communities.length + places.length };
}
