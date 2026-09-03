# Data Models & TypeScript Type System — NOIDA.FIT

## 1. Conceptual Entity Relationship Model

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Organizer    │──────<│    Community    │>──────│      Place      │
└─────────────────┘       └────────┬────────┘       └────────┬────────┘
                                   │                         │
                                   │ 1                       │ 1
                                   │                         │
                                   ▼ *                       ▼ *
                          ┌─────────────────┐       ┌─────────────────┐
                          │      Event      │──────>│      Place      │
                          └────────┬────────┘       └─────────────────┘
                                   │
                                   │ 1
                                   ▼ *
                          ┌─────────────────┐
                          │   RSVP/Attend   │>──────┐
                          └─────────────────┘       │
                                                    ▼
                                            ┌─────────────────┐
                                            │      User       │
                                            └─────────────────┘
```

---

## 2. TypeScript Domain Definitions

Future coding agents must place these definitions inside `types/`:

### `types/community.ts`
```typescript
export type ActivityCategory =
  | "running"
  | "cycling"
  | "strength"
  | "sports"
  | "wellness"
  | "outdoor";

export interface Captain {
  name: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
}

export interface WeeklyScheduleItem {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  time: string; // e.g. "05:45 AM"
  sessionType: string; // e.g. "Track Intervals"
  venueName: string; // e.g. "Noida Stadium (Gate 4)"
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  category: ActivityCategory;
  tagline: string;
  description: string;
  baseLocation: string; // e.g. "Sector 137 & Expressway"
  primaryVenueSlug?: string;
  membersCount: number;
  verified: boolean;
  featured: boolean;
  meetingDays: string[];
  captains: Captain[];
  schedule?: WeeklyScheduleItem[];
  bannerUrl?: string;
  crestUrl?: string;
  socialLinks: {
    whatsapp?: string;
    instagram?: string;
    strava?: string;
    website?: string;
  };
}
```

### `types/event.ts`
```typescript
import { ActivityCategory } from "./community";

export interface Event {
  id: string;
  title: string;
  slug: string;
  category: ActivityCategory;
  communitySlug: string;
  communityName: string;
  communityCrestUrl?: string;
  venueSlug: string;
  venueName: string;
  sector: string; // e.g. "Sector 21A"
  date: string; // ISO format "YYYY-MM-DD"
  startTime: string; // "05:45 AM"
  endTime: string; // "07:30 AM"
  price: "FREE" | string; // "FREE" or "₹200"
  distance?: string; // "10km / 16km"
  pace?: string; // "5:30 - 7:00 min/km"
  level?: string; // "All Levels Welcome"
  description: string;
  routeOverview?: string;
  whatToBring?: string[];
  featured: boolean;
  attendeesCount: number;
  coverImageUrl?: string;
}
```

### `types/place.ts`
```typescript
export interface Place {
  id: string;
  name: string;
  slug: string;
  category: "Public Sports Complex" | "Public Park" | "Road & Expressway" | "Nature Trail & Park" | "Basketball & Turf" | "Boutique Studio";
  sector: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  amenities: string[];
  description: string;
  coverImageUrl?: string;
  activeCommunitiesCount: number;
  publicHours?: string;
  parkingInfo?: string;
}
```

### `types/story.ts`
```typescript
export interface Story {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  author: {
    name: string;
    avatarUrl?: string;
  };
  category: "Community Spotlight" | "Route Guide" | "Weekend Playbook" | "Culture";
  readTime: string;
  coverImageUrl: string;
  featured: boolean;
  relatedCommunities?: string[];
  relatedEvents?: string[];
  contentMarkdown?: string;
}
```

### `types/rsvp.ts`
```typescript
export interface RSVP {
  id: string;
  eventId: string;
  eventSlug: string;
  attendeeName: string;
  attendeeContact?: string; // Phone / WhatsApp / Email
  createdAt: string;
  status: "confirmed" | "cancelled" | "waitlist";
}
```

---

## 3. Database Migration Path (Phase 2+)

When transitioning from in-memory JSON to PostgreSQL (e.g. via Prisma or Drizzle ORM):
- Foreign Keys:
  - `Event.community_id -> Community.id`
  - `Event.place_id -> Place.id`
  - `RSVP.event_id -> Event.id`
  - `RSVP.user_id -> User.id`
- Enums for `ActivityCategory` and `EventStatus`.
- B-Tree Indexes on `slug`, `date`, `sector`, and `category` for microsecond query speeds.
