# Analytics Specification & Metric Taxonomy — NOIDA.FIT

## 1. The North-Star Metric

$$\mathbf{\text{North Star Metric}} = \mathbf{\text{Weekly Active Participants (WAP)}}$$

A **Participant** is defined as an individual who utilizes NOIDA.FIT to discover an activity, commits to showing up (via RSVP, Calendar sync, or WhatsApp group entry), and physically participates in a community gathering in Noida or Greater Noida.

### Secondary Core Metrics
1. **Repeat Participation Rate:** Percentage of users who RSVP or join a community gathering for two or more consecutive weeks.
2. **Discovery-to-Action Conversion Rate:** $\frac{\text{RSVP Actions} + \text{Community Joins}}{\text{Unique Event / Community Page Views}}$.
3. **Sector Coverage Density:** Number of active weekly recurring gatherings per Noida sector.

---

## 2. Event Taxonomy & Telemetry Schema

All telemetry events must be strongly typed and dispatched via lightweight, privacy-conscious event loggers:

| Event Name | Trigger Condition | Payload Properties | Business Significance |
| :--- | :--- | :--- | :--- |
| `page_view` | User loads any route. | `{ path, referrer, userAgent }` | Traffic volume and top landing pages. |
| `search_executed` | User presses enter or selects query in search. | `{ query, queryType, resultsCount }` | Unmet demand (e.g. searching "padel in sector 62"). |
| `filter_applied` | User toggles category or sector filter. | `{ filterCategory, filterValue, activeFiltersCount }` | User preference patterns across activities. |
| `community_viewed` | User views a community hub. | `{ communitySlug, category, verified }` | Community interest and brand reach. |
| `community_joined` | User clicks "Join Community" button. | `{ communitySlug, channelType: "whatsapp" \| "instagram" \| "strava" }` | Direct member acquisition conversion. |
| `event_viewed` | User views an event detail page. | `{ eventSlug, category, sector, date, price }` | Intent to participate. |
| `event_rsvp_completed` | User submits the RSVP modal. | `{ eventSlug, communitySlug, sector, attendanceType }` | **Primary Conversion Milestone.** |
| `calendar_added` | User clicks "Add to Google/Apple Calendar". | `{ eventSlug, provider: "google" \| "ics" }` | High-intent commitment signal. |
| `share_clicked` | User clicks WhatsApp or native share sheet. | `{ eventSlug \| communitySlug, platform: "whatsapp" \| "native" }` | Viral coefficient and peer distribution. |

---

## 3. TypeScript Telemetry Interface (`types/analytics.ts`)

```typescript
export type AnalyticsEvent =
  | { name: "page_view"; properties: { path: string; referrer?: string } }
  | { name: "search_executed"; properties: { query: string; resultsCount: number } }
  | { name: "filter_applied"; properties: { category: string; value: string } }
  | { name: "community_viewed"; properties: { communitySlug: string; category: string } }
  | { name: "community_joined"; properties: { communitySlug: string; destination: string } }
  | { name: "event_viewed"; properties: { eventSlug: string; sector: string; date: string } }
  | { name: "event_rsvp_completed"; properties: { eventSlug: string; communitySlug: string } }
  | { name: "calendar_added"; properties: { eventSlug: string; provider: "google" | "ics" } }
  | { name: "share_clicked"; properties: { entitySlug: string; platform: string } };

export function trackEvent(event: AnalyticsEvent) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Telemetry] ${event.name}:`, event.properties);
  }
  // In production: send to privacy-first analytics provider (Plausible / PostHog)
}
```

---

## 4. Privacy & GDPR Compliance

- No invasive third-party ad tracking pixels (no Facebook Pixel, no intrusive cookie banners).
- IP addresses must be anonymized before hashing.
- Telemetry exists solely to improve discovery and measure civic health.
