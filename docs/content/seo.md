# SEO Strategy & Metadata Specification — NOIDA.FIT

## 1. Organic Search Objectives

NOIDA.FIT is architected to rank **#1 across Google for all high-intent local fitness and community searches** in Noida, Greater Noida, and Delhi NCR.

### Primary Keyword Targets

| Keyword Category | Target Search Queries | Primary Ranking Landing Page |
| :--- | :--- | :--- |
| **City-Wide Discovery** | *"fitness in noida"*, *"noida fitness communities"*, *"sports activities in noida"* | Homepage (`/`), `/discover` |
| **Running & Clubs** | *"running clubs in noida"*, *"running groups noida"*, *"noida marathon training"* | `/communities`, `/community/[slug]` |
| **Timely Activities** | *"fitness events in noida"*, *"fitness events this weekend noida"*, *"weekend runs noida"* | `/events`, `/event/[slug]` |
| **Local Venues** | *"running tracks in noida"*, *"noida stadium running gate 4"*, *"parks for running in noida"*| `/places`, `/place/[slug]` |
| **Cycling & Rides** | *"cycling groups in noida"*, *"expressway cycling noida"*, *"weekend cycling noida"* | `/discover?activity=cycling` |

---

## 2. Next.js 16 Metadata API Standards

Every public page must export a strongly-typed `Metadata` object or a dynamic `generateMetadata()` function using Next.js App Router conventions:

### Title Tag Formula
- **Homepage:** `NOIDA.FIT — Discover Fitness Communities & Events in Noida`
- **Hub Pages:** `[Directory Name] — NOIDA.FIT | Noida Fitness & Community`
- **Dynamic Events:** `[Event Title] — [Date] at [Venue] | NOIDA.FIT`
- **Dynamic Communities:** `[Community Name] — [Category] in [Sector], Noida | NOIDA.FIT`
- **Dynamic Places:** `[Place Name] — Track & Fitness Venue in [Sector], Noida | NOIDA.FIT`

### Meta Description Standards
- Length: **140–155 characters**.
- Must contain: Activity type, exact sector/landmark, date/time, and clear invitation to join.
- Example: *"Join the Saturday Sunrise Long Run with UPRUN along the Noida Expressway. 10K & 16K routes, all paces welcome. Sat, 5:45 AM at Advant Navis. RSVP free on NOIDA.FIT."*

---

## 3. Structured Data / JSON-LD Schemas

Search engines must receive rich schema markup embedded via `<script type="application/ld+json">`:

### 1. Schema for Event Pages (`/event/[slug]`)
```json
{
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "Saturday Sunrise Expressway Long Run",
  "description": "Weekly group long run along the Noida-Greater Noida Expressway service road.",
  "startDate": "2024-10-14T05:45:00+05:30",
  "endDate": "2024-10-14T07:45:00+05:30",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Advant Navis Business Park (Gate 2)",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Sector 142, Noida-Greater Noida Expressway",
      "addressLocality": "Noida",
      "postalCode": "201305",
      "addressCountry": "IN"
    }
  },
  "organizer": {
    "@type": "SportsTeam",
    "name": "UPRUN Noida",
    "url": "https://noida.fit/community/uprun-noida"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock",
    "url": "https://noida.fit/event/sunrise-expressway-long-run"
  }
}
```

### 2. Schema for Community Hub Pages (`/community/[slug]`)
```json
{
  "@context": "https://schema.org",
  "@type": "SportsClub",
  "name": "UPRUN Noida Chapter",
  "description": "Community running club hosting weekly interval and long run sessions in Noida.",
  "url": "https://noida.fit/community/uprun-noida",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Noida",
    "addressRegion": "Uttar Pradesh",
    "addressCountry": "IN"
  }
}
```

### 3. Schema for Venues / Places (`/place/[slug]`)
```json
{
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "name": "Noida Stadium (Sector 21A)",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Sector 21A",
    "addressLocality": "Noida",
    "postalCode": "201301",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 28.5910,
    "longitude": 77.3402
  }
}
```

---

## 4. Open Graph & Social Sharing (`og:image`)

Every dynamic page must generate custom Open Graph metadata for rich link previews in WhatsApp chats and Instagram DMs:
- **`og:type`:** `website` or `article`.
- **`og:image`:** High-contrast `1200x630px` banner displaying the event or community title, date, sector pill, and `NOIDA.FIT` wordmark.
- **`twitter:card`:** `summary_large_image`.

---

## 5. Technical SEO Hygiene

- **Sitemap (`app/sitemap.ts`):** Automatically aggregates all static routes and dynamic slugs (`/communities/*`, `/events/*`, `/places/*`, `/stories/*`) with `lastModified` timestamps and `weekly` change frequency.
- **Robots (`app/robots.ts`):** Allows complete indexing of all public paths; disallows internal dev/preview routes.
- **Canonical URLs:** Every page must specify its canonical URL to prevent duplicate content indexing caused by query parameters.
