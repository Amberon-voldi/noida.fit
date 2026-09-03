# Product Implementation Roadmap — NOIDA.FIT

This roadmap outlines the staged delivery plan for NOIDA.FIT, establishing clear operational boundaries between **Now (V1)**, **Later (V2/V3)**, and **Eventually (Platform Scale)**.

---

## Roadmap Overview

```text
┌────────────────────────────────────────────────────────┐
│ NOW: Phase 0 & Phase 1                                 │
│ Public Discovery, Community Index, Events, Places      │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ LATER: Phase 2                                         │
│ User Interaction, Bookmarks, Following, RSVPs          │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ LATER: Phase 3                                         │
│ Organizer OS: Self-Serve Publishing & Member Mgmt      │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ EVENTUALLY: Phase 4                                    │
│ Fitness ID, Crews, Community Graph, Brand Marketplace  │
└────────────────────────────────────────────────────────┘
```

---

## Detailed Phases

### Phase 0: System Foundation & Design Infrastructure (NOW)
**Objective:** Establish the design tokens, layout shell, and component primitives in Next.js 16 and Tailwind CSS v4.

- [x] Repository setup with Next.js 16 App Router, React 19, and Tailwind v4 (`@tailwindcss/postcss`).
- [ ] CSS token system definition in `app/globals.css` with `@theme` directives:
  - Color tokens (Background, Foreground, Primary, Velocity Accent, Muted, Border).
  - Typography scale with `next/font/google` (Geist Sans / Geist Mono or Display pairing).
  - Spacing, border radius, and elevation tokens.
- [ ] Base reusable UI primitives:
  - `Button` (Primary, Secondary, Ghost, Destructive, Outline).
  - `Badge` (Upcoming, Verified, Free, Community, Category).
  - `Input`, `SearchInput`, and `Select` components.
  - `Card` container primitives.
  - `Skeleton` and empty state components.
- [ ] Global application shell:
  - Sticky `Navbar` with logo, navigation links, quick search trigger, and primary CTA.
  - Mobile slide-out navigation menu with accessible backdrop.
  - Comprehensive `Footer` with local sector links, social links (`@noida.fit`), and newsletter hook.

---

### Phase 1: Public Discovery Experience (NOW — V1 Launch)
**Objective:** Deliver an unauthenticated, blisteringly fast, SEO-optimized public discovery platform powered by high-fidelity local seed data.

- [ ] **Homepage (`/`):**
  - High-impact Editorial Hero with primary CTA *"Explore Noida Fitness"*.
  - *Happening This Week* curated event carousel / grid.
  - *Featured Communities* highlight cards with member counts and weekly meeting spots.
  - *Explore by Activity* category pills (Running, Strength, Cycling, Sports, Wellness).
  - *City Activity Map Preview* highlighting active sectors (Noida Stadium, Expressway, Sector 137, etc.).
  - *From the Journal / Stories* editorial spotlight.
  - Clear community submission callout for local organizers.
- [ ] **Discovery Hub (`/discover`):**
  - Unified search and filter interface across Events, Communities, and Places.
  - Filter by Activity, Location (Sector / Neighborhood), Time of Day, and Date.
  - Instant client-side filtering over structured static datasets.
  - Grid / List toggle with responsive card layouts.
- [ ] **Community Directory & Profiles:**
  - Community index page (`/communities`) with search and filter.
  - Dynamic Community detail pages (`/community/[slug]`):
    - Name, badge, category, meeting location, and member count.
    - Weekly recurring schedule table (e.g. Tue 6 AM track workout, Sat 6 AM long run).
    - Leadership / Run Captain profile cards.
    - Upcoming events hosted by this community.
    - Direct *"Join Community"* button (links to WhatsApp group, Strava club, or Instagram).
- [ ] **Event Directory & Details:**
  - Event index page (`/events`) with upcoming date filters (Today, This Weekend, Next Week).
  - Dynamic Event detail pages (`/event/[slug]`):
    - Date, start/end time, duration, and exact venue with map pin.
    - Hosting community and lead organizer.
    - What to bring, fitness level requirement, and distance/pace guidelines.
    - Direct *"RSVP / Attend"* action and native mobile share sheet integration.
- [ ] **Places & Venues (`/places`, `/place/[slug]`):**
  - Index of iconic Noida fitness spots: Noida Stadium, City Park Greater Noida, Okhla Bird Sanctuary route, Biodiversity Park, boutique functional gyms.
  - Detail page linking places to the communities and events that utilize them.
- [ ] **Editorial Stories (`/stories`, `/story/[slug]`):**
  - Markdown-driven local guides (e.g. *"Top 5 Weekend Running Routes in Noida"*, *"Meet the Captains of Noida Runners Club"*).
- [ ] **Search Experience (`/search` and modal):**
  - Keyboard-accessible search modal (`Cmd+K` / `Ctrl+K`) supporting instant search across communities, events, and venues.
- [ ] **Static Pages:**
  - `/about` (The NOIDA.FIT mission, ethos, and story).
  - `/for-organizers` (Information and submission intake form for local club leaders).

---

### Phase 2: User Engagement & Social Proof (LATER — V2)
**Objective:** Add user identity, personal bookmarks, event reminders, and community follow mechanics.

- [ ] Lightweight Authentication (Mobile OTP / Magic Link / Google Auth via Supabase or NextAuth).
- [ ] User Profile:
  - Bookmarked / saved events.
  - Followed communities with push/email notifications for new events.
  - RSVP history ("Events I'm attending").
- [ ] RSVP & Attendance System:
  - 1-click RSVP with automatic Google Calendar / Apple Calendar `.ics` download.
  - Waitlists for capacity-capped workouts.
  - Automated WhatsApp/SMS event reminders 12 hours prior to start time.
- [ ] Social Sharing:
  - Dynamic Open Graph event ticket graphics for Instagram Stories and WhatsApp statuses.

---

### Phase 3: Organizer OS & Self-Serve Publishing (LATER — V3)
**Objective:** Empower club captains, studio owners, and coaches to manage their own presence and rosters.

- [ ] Organizer Dashboard:
  - Self-serve community page creation and verification workflow.
  - Event creation wizard with recurring date support (e.g. *"Every Thursday at 6:00 AM"*).
  - Attendee roster management with CSV export.
  - Check-in QR code scanner for event day attendance verification.
- [ ] Community Announcements:
  - Broadcast updates to followed members (e.g. *"Rain alert: moving track session from Stadium to Underpass"*).
- [ ] Ticketing & Paid Sessions (Optional):
  - Integration with local payment gateways (Razorpay / UPI) for paid workshops or masterclasses.

---

### Phase 4: Platform Scale & Community Economy (EVENTUALLY — V4+)
**Objective:** City-wide fitness graph, user identity, and brand partnerships.

- [ ] **Fitness ID:** Verified participation badge system proving real-world attendance across Noida clubs.
- [ ] **Crews:** Micro-groups of friends tracking shared attendance and organizing private training sessions.
- [ ] **City Fitness Graph:** Data-driven map of active fitness density across Noida sectors.
- [ ] **Brand & Sponsorship Marketplace:** Connecting verified Noida running clubs with sportswear, footwear, and nutrition sponsors for race bibs, gear demos, and hydration stations.
