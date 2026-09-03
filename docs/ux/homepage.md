# Homepage UX Specification — NOIDA.FIT

## 1. Product Intent

The homepage of NOIDA.FIT is **not a software sales landing page**. There are no pricing tables, feature comparison grids, or corporate logos.

Instead, the homepage is **a living digital representation of Noida's fitness culture**. Within three seconds of landing on the page, the user must feel the momentum of their own city:
- They see that real people were running at Noida Stadium this morning at 6:00 AM.
- They see a cycling ride starting at Advant Navis this Saturday.
- They discover 4 running clubs within 10 minutes of their apartment.
- They are invited to show up and move.

---

## 2. Structural Wireframe & Section Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│ NAVBAR: Logo [NOIDA.FIT] | Discover | Communities | Events | Places    │
│         [Search Cmd+K] [Explore Noida Fitness]                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. HERO SECTION                                                        │
│    Badge: "THE HEARTBEAT OF NOIDA FITNESS"                             │
│    Headline: "Find your people. Show up. Move together."               │
│    Subtext: Discover running clubs, weekend group rides, track sessions│
│             and outdoor workouts across Noida & Greater Noida.         │
│    CTAs: [Explore Noida Fitness]  [Find Your Community]                │
│    Telemetry Ticker: 12 Active Communities • 28 Weekly Gatherings      │
├────────────────────────────────────────────────────────────────────────┤
│ 2. ACTIVITY QUICK-DISCOVERY PILLS                                      │
│    [🏃 All Activities] [⚡ Running] [🚴 Cycling] [🏋️ Strength]        │
│    [🏸 Racquet Sports] [🧘 Yoga & Mobility] [🌿 Outdoor Sessions]     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. HAPPENING THIS WEEK (Upcoming Gatherings)                           │
│    Header: "This Week in the City" • View full calendar →              │
│    Grid of 3-4 EventCards (Date, Time, Sector, Host, RSVP)             │
├────────────────────────────────────────────────────────────────────────┤
│ 4. FEATURED COMMUNITIES (The Clubs Driving Noida)                      │
│    Header: "Noida's Active Communities" • Browse all 12 →              │
│    Cards: UPRUN, Noida Runners Club, Tri-City Cyclists, etc.           │
│    Displays: Leader name, regular sectors, meeting frequency, members  │
├────────────────────────────────────────────────────────────────────────┤
│ 5. CITY ACTIVITY MAP & SECTOR HUBS                                     │
│    Header: "Active Sectors Across Noida"                               │
│    Visual map preview + sector pills: Sector 21A, Expressway, Sec 137, │
│    Greater Noida West, Pari Chowk.                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 6. THE JOURNAL / EDITORIAL SPOTLIGHT                                   │
│    Header: "Stories from the Ground"                                   │
│    Featured Story: "5 Weekend Long Run Routes Along the Expressway"    │
│    Secondary Story: "How 20 Runners Built Noida's Fastest Morning Crew"│
├────────────────────────────────────────────────────────────────────────┤
│ 7. ORGANIZER CALLOUT                                                   │
│    Banner: "Lead a club or fitness community in Noida?"                │
│    Subtext: Get your schedule listed on NOIDA.FIT. Free, open, civic.  │
│    CTA: [List Your Community]                                          │
├────────────────────────────────────────────────────────────────────────┤
│ FOOTER: Multi-column sitemap, sector links, @noida.fit, RSS / ICS      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Section Specifications

### Section 1: Hero Section
- **Visual Style:** High-contrast dark obsidian background with subtle topographic or stadium track accent lines. Optional subtle warm morning light glow.
- **Typography:**
  - Kicker badge: `font-mono text-xs tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full`.
  - Main Heading: `text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white`.
  - Lead Subtext: `text-lg sm:text-xl text-slate-300 max-w-2xl mt-4 leading-relaxed`.
- **Primary CTA:** Large button *"Explore Noida Fitness"* (`href="/discover"`), with subtle velocity hover glow.
- **Secondary CTA:** Outline button *"Find Your Community"* (`href="/communities"`).
- **Social Telemetry Strip:** Clean horizontal strip highlighting real-time city numbers:
  - *12+ Active Communities* • *28+ Weekly Gatherings* • *1,400+ Active Movers*

### Section 2: Activity Quick-Discovery Pills
- Sticky or horizontal scrolling strip containing iconography and activity tags.
- Tapping a tag directly routes the user to `/discover?activity=[category]`.

### Section 3: Happening This Week
- Shows the top 3–4 upcoming public sessions occurring between today and Sunday.
- Directly uses the `EventCard` component.
- Emphasizes that sessions are open to new participants with clear pace/level guidance.

### Section 4: Featured Communities
- Carousel or responsive 3-column grid of `CommunityCard` components.
- Highlights the diversity of formats: early morning road running, track sprints, cycling groups, and outdoor calisthenics.

### Section 5: City Activity & Sector Hubs
- Grounds the digital experience in Noida's unique physical layout.
- Provides interactive sector chips:
  - *Sector 21A (Noida Stadium)*
  - *Expressway Corridor (Sec. 93A to 142)*
  - *Sector 137 & Advant Hub*
  - *Greater Noida & Pari Chowk*
  - *Okhla Bird Sanctuary Trail*

### Section 6: Stories from the Ground
- Editorial cards featuring local guides, routes, and club spotlights to boost SEO and build cultural credibility.

### Section 7: Community Leader Callout
- Clean, focused full-width banner inviting local captains, coaches, and organizers to submit their schedules for inclusion.
