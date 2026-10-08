# Homepage UX Specification — NOIDA.FIT

## Current implementation: landing and home are separate

- `/` is the introductory landing shown when opening the website. It tells the community/belonging story, briefly explains discovery → RSVP → operator-scanned participant QR → private passport, and offers a clear route into `/home`. It is not a directory feed and has no fake social proof or live statistics. Photography remains labelled illustrative.
- `/home` is the actual public home hub: a small guest/member greeting, compact GET search, today/weekend/free-session links, activity shortcuts, and at most three chronological session cards, three community cards and three place cards. The oversized location/date/description header, account action and account/check-in/organizer side panels are removed. Repeated home-card demo badges are replaced by one concise illustrative-listings notice when sample content is present; underlying demo flags and provenance in standard directory/detail views remain intact. Published Appwrite data is authoritative. Empty content stays empty; backend failure has a distinct retry state. Featured club/place picks fall back to existing published records, never seed substitutes. Events prefer the next seven IST days and truthfully fall back to later upcoming sessions when that week is empty.
- Guests can use both pages; account/check-in links retain their existing authentication boundaries. The home greeting uses only the signed-in member’s own first name; no private history or contact data is added.
- Logo, Home navigation, breadcrumbs and the mobile dock lead to `/home`. The dock is omitted on the introductory `/`; a “Meet NOIDA.FIT” link makes the landing reachable from the home hub/footer. Each route has its own canonical metadata; `/home` is in the sitemap.
- No automatic redirects, first-visit browser storage, geolocation inference, attendance widgets or invented community activity.
- The global loading boundary is scoped to `(site)` and `(auth)` routes. `/home` uses `(hub)` with the same site shell but no streamed loading fallback; the introductory root has no shared navbar or location strip. Both deliver usable content without JavaScript, while heavy directory/auth routes retain loading feedback. There is still one shared root layout, so moving between landing/home/directory uses normal client navigation, not separate root documents.

Route-split baseline verification, before the kinetic landing redesign: 97 unit tests, 94 focused Chromium browser tests and the read-only live-backend discovery test passed. Both new routes were checked at 320/390/768/1440px, 200% text, keyboard/reduced-motion and without JavaScript; home empty/unavailable/long-label cases also use explicitly synthetic fixtures. Lint, typecheck, production build, the 62-file browser secret scan and `git diff --check` passed (lint retains an unrelated existing reel-script warning). Guest-only desktop/mobile screenshots were visually reviewed. These checks do not replace real-device/Safari usability testing or validate a hosted deployment. No backend records/permissions were changed.

### Introductory landing choreography

The root introduction opens with a dark sports-editorial hero: oversized staggered **Find your people.** typography, a lime headline/CTA and a separate urban group-running photograph with a small illustrative caption and lime editorial tag. Copy and actions stay outside the photo; mobile stacks the composition, tablet/desktop uses two columns. It is followed by the existing dark/lime story → sliding curtains uncovering a party-style crowd photograph → a sticky Fitness ID reveal and one scroll-driven rotation → the **Show up. Keep the story.** chapter with a wheel that spins/slides into position and four staggered, flying-in process cards → an explicit `/home` CTA. The wordmark belongs to the hero, not a navbar; there is no geographic masthead. Party imagery conveys a mood and is explicitly not evidence of a fitness session or platform event. Public directory/static page introductions use compact H1s without decorative eyebrows or header descriptions. Authenticated product behavior is unchanged.

Native scrolling remains authoritative: no intercepted wheel/touch events, artificial scroll position, smooth-scroll library or continuous animation loop. Passive scroll/resize events schedule a single animation frame; an IntersectionObserver limits sticky-scene work to nearby sections. Text reveals use bounded 300ms Web Animations with at most 60ms staggering. The story wheel and cards follow reversible scroll-entry progress; card geometry is measured on untransformed wrappers so the animated child cannot feed its offset back into the next frame. Focus immediately settles a card and keeps its link fully visible. Pause state uses a stable listener lifecycle rather than tearing down preference listeners on each toggle. The pause control stops motion without changing scroll-scene length. System reduced motion, short viewports and enlarged text use readable static flow; content and links also work without JavaScript. Keyboard focus immediately uncovers community links hidden by decorative curtains. Listeners, frames, observers and reveal animations are cleaned up on navigation.

The rotating Fitness ID is a separately styled, clearly labelled **design preview**, not an account component or member record. It contains no member identity, history, valid public Fitness ID, usable check-in QR or invented attendance. Illustrative photography retains provenance labels.

Verification (2026-10-08): the baseline suite passed **106 unit tests** and **106 focused Chromium cases**, followed by **12 repeated motion cases** and the **read-only real-backend discovery smoke test**; the subsequent photo-free hero revision passed **106 unit tests** and **29 landing/home Chromium cases**. Coverage includes 320/390/768/1440px layouts, 200% text, keyboard/focus hit testing, live reduced-motion changes, pause/resume, native-scroll reversal, idle-loop/listener cleanup, and no-JavaScript entry points. Home empty/unavailable/populated/long-label boundaries use explicitly synthetic public fixtures. `npm run typecheck`, production build, the **64-file browser secret scan**, staged-source secret scan and `git diff --check` passed; lint has zero errors and one unchanged reel-script warning. Guest desktop/mobile poster, story stages and real public home screenshots were reviewed. No backend records or permissions were changed; hosted deployment, authenticated live mutations and real-device/Safari checks are not claimed.

Latest image-led hero verification (2026-10-08): **106 unit tests** and **32 Chromium cases** passed (`tests/e2e/landing.spec.ts`, `home.spec.ts`, `motion.spec.ts`). Final guest-only hero screenshots were visually reviewed at 320/390/768/1440px. Tests also cover enlarged text, reduced motion, keyboard controls, no-JavaScript content, the first discovery CTA remaining in the initial 900px-high viewport, non-overlapping copy/photo panels, and image-only depth movement with a fixed provenance caption and no exposed edges. Typecheck, production build, the **65-file browser secret scan**, lint (zero errors; the same unrelated reel-script warning) and `git diff --check` passed. The cropped 1920px WebP is 128.0 KiB and has a new asset URL to avoid reusing the rejected photograph's cached image variants. This is local browser/build evidence, not hosted deployment, authenticated backend mutation or real-device/Safari evidence.

The original wireframe below is historical design intent for a discovery home, not evidence for the example activity/counts. Its practical role now belongs to `/home`; the implemented product does not claim the illustrative telemetry or events are real.

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
