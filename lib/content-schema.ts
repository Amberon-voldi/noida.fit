import { z } from "zod";
import { indiaDateTime } from "./calendar";

export const contentKinds = ["activities", "communities", "places", "events"] as const;
export type ContentKind = (typeof contentKinds)[number];

export const contentIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/, "Use a short Appwrite-safe record ID");
const id = contentIdSchema;
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase hyphenated slug").max(120);
const plainText = (max: number, min = 0) => z.string().trim().min(min).max(max).refine(value => !/<\/?[a-z][^>]*>/i.test(value), "HTML is not allowed");
const safeUrl = z.string().trim().max(2000).url().refine(value => { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }, "Only HTTPS URLs without credentials are allowed");
const imagePath = z.string().trim().max(2000).refine(value => {
  if (/[<>\\\x00-\x20]/.test(value)) return false;
  if (value.startsWith("/images/")) {
    try { return new URL(value, "https://noida.fit").pathname.startsWith("/images/") && !decodeURIComponent(value).includes(".."); } catch { return false; }
  }
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}, "Images must use /images/... or a valid HTTPS URL");
const optionalImage = imagePath.optional();
const optionalUrl = safeUrl.optional();
const category = z.enum(["running", "cycling", "strength", "sports", "wellness", "outdoor"]);
const status = z.enum(["draft", "published", "cancelled"]);
const tags = z.array(plainText(60, 1)).max(20).optional();
const common = {
  slug,
  status,
  demo: z.boolean(),
  description: plainText(12000, 20),
  tags,
};

const activityFields = {
  ...common,
  name: plainText(128, 2),
  emoji: plainText(16, 1),
  imageUrl: optionalImage,
};
const placeFields = {
  ...common,
  name: plainText(128, 2),
  category: plainText(80, 1),
  sector: plainText(100, 1),
  address: plainText(500),
  coordinates: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict(),
  amenities: z.array(plainText(100, 1)).max(50),
  activities: z.array(slug).max(50),
  activeCommunitiesCount: z.literal(0).default(0),
  publicHours: plainText(200).optional(),
  parkingInfo: plainText(500).optional(),
  priceIndicator: plainText(100).optional(),
  featured: z.boolean().default(false),
  coverImageUrl: optionalImage,
  imageUrl: optionalImage,
  website: optionalUrl,
};
const captain = z.object({ name: plainText(100, 1), role: plainText(100, 1), avatarUrl: optionalImage, bio: plainText(500).optional() }).strict();
const weekday = z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
const clockTime = z.string().regex(/^(?:0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/);
const scheduleItem = z.object({ day: weekday, time: clockTime, sessionType: plainText(120, 1), venueName: plainText(160, 1) }).strict();
const communityFields = {
  ...common,
  name: plainText(128, 2),
  category,
  activityId: id,
  tagline: plainText(250),
  baseLocation: plainText(100),
  primaryVenueSlug: slug.optional(),
  membersCount: z.literal(0).default(0),
  verified: z.boolean().default(false),
  featured: z.boolean().default(false),
  meetingDays: z.array(weekday).max(7),
  captains: z.array(captain).max(20),
  schedule: z.array(scheduleItem).max(100).optional(),
  socialLinks: z.object({ instagram: optionalUrl, whatsapp: optionalUrl, website: optionalUrl, strava: optionalUrl }).strict(),
  bannerUrl: optionalImage,
  crestUrl: optionalImage,
};
const eventFields = {
  ...common,
  title: plainText(200, 2),
  category,
  activityId: id,
  communitySlug: slug,
  communityName: plainText(128, 1),
  communityCrestUrl: optionalImage,
  venueSlug: slug,
  venueName: plainText(128, 1),
  sector: plainText(100, 1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine(value => !Number.isNaN(Date.parse(value)), "Event date is invalid"),
  startTime: clockTime,
  endTime: clockTime,
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  price: plainText(30, 1),
  capacity: z.number().int().min(1).max(100000),
  attendeesCount: z.literal(0).default(0),
  featured: z.boolean().default(false),
  organizerUserId: id.optional(),
  coverImageUrl: optionalImage,
  imageUrl: optionalImage,
  level: plainText(100).optional(),
  distance: plainText(100).optional(),
  pace: plainText(200).optional(),
  routeOverview: plainText(2000).optional(),
  whatToBring: z.array(plainText(200, 1)).max(30).optional(),
};

const withId = <T extends z.ZodRawShape>(fields: T) => z.object({ id, ...fields }).strict();
export const contentSchemas = {
  activities: withId(activityFields),
  communities: withId(communityFields),
  places: withId(placeFields),
  events: withId(eventFields),
} as const;
export const contentCreateSchemas = {
  activities: z.object(activityFields).strict(),
  communities: z.object(communityFields).strict(),
  places: z.object(placeFields).strict(),
  events: z.object(eventFields).strict(),
} as const;
export type ContentRecord = { [K in ContentKind]: z.infer<(typeof contentSchemas)[K]> }[ContentKind];

export const contentTemplates: Record<ContentKind, Record<string, unknown>> = {
  activities: { slug: "new-activity", status: "draft", demo: false, description: "A clear, welcoming description for this activity in Noida.", name: "New activity", emoji: "🏃", tags: [] },
  communities: { slug: "new-community", status: "draft", demo: false, description: "Tell people who this community welcomes, where it meets and what a first session feels like.", name: "New community", category: "running", tagline: "A friendly way to move together.", baseLocation: "Noida", activityId: "activity-running", membersCount: 0, verified: false, featured: false, meetingDays: ["Saturday"], captains: [], socialLinks: {} },
  places: { slug: "new-place", status: "draft", demo: false, description: "Describe this place, what people can do there and any access details worth knowing.", name: "New place", category: "Public Park", sector: "Noida", address: "", coordinates: { lat: 28.5355, lng: 77.391 }, amenities: [], activities: [], activeCommunitiesCount: 0, featured: false },
  events: { slug: "new-event", status: "draft", demo: false, description: "Explain the session, who it is for, where to meet and what participants should expect.", title: "New event", category: "running", activityId: "activity-running", communitySlug: "new-community", communityName: "New community", venueSlug: "new-place", venueName: "New place", sector: "Noida", date: "2026-01-01", startTime: "06:00 AM", endTime: "07:00 AM", startsAt: "2026-01-01T06:00:00+05:30", endsAt: "2026-01-01T07:00:00+05:30", price: "FREE", capacity: 20, attendeesCount: 0, featured: false, whatToBring: ["Water bottle"] },
};

export function validateRecord(kind: ContentKind, input: unknown, create = false): ContentRecord {
  return (create ? contentCreateSchemas[kind] : contentSchemas[kind]).parse(input) as ContentRecord;
}

export function validateSchedule(record: ContentRecord): void {
  if (!("startsAt" in record)) return;
  const issue = (path: string, message: string): never => { throw new z.ZodError([{ code: "custom", path: [path], message }]); };
  const start = Date.parse(record.startsAt);
  const end = Date.parse(record.endsAt);
  if (end <= start) issue("endsAt", "Event end must follow start");
  const displayStart = (() => {
    try { return indiaDateTime(record.date, record.startTime).getTime(); } catch { return issue("date", "Event date and time are invalid"); }
  })();
  if (displayStart !== start) issue("startsAt", "Start timestamp must match the date and start time in Asia/Kolkata");
  const endDate = new Date(end + 330 * 60_000).toISOString().slice(0, 10);
  if (indiaDateTime(endDate, record.endTime).getTime() !== end) issue("endsAt", "End timestamp must match the end time in Asia/Kolkata");
}
