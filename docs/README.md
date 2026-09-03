# NOIDA.FIT — System Documentation & Agent Guide

> **"Find your people. Show up. Move together."**  
> **The internet for Noida's fitness community.**

Welcome to the central documentation hub for **NOIDA.FIT** (`noida.fit` / `@noida.fit`). This repository contains the complete specification, architectural blueprint, brand language, and technical roadmap for building the city-first fitness discovery and community platform for Noida and Greater Noida.

---

## ⚠️ CRITICAL NOTICE FOR FUTURE CODING AGENTS

> [!IMPORTANT]
> **READ BEFORE WRITING CODE:**  
> Before modifying or implementing any component, feature, or route in this repository, you **MUST** read this `README.md` and the relevant specification documents linked below.  
> The documents in `/docs` represent the **single source of truth** for product, design, UX, engineering, and brand decisions. Do not make arbitrary assumptions or introduce conflicting styles/architectures.

### Implementation Agent Ground Rules

1. **Read Before Coding:** Always consult the feature's corresponding UX and engineering docs before implementation.
2. **Preserve Design Consistency:** Do not introduce ad-hoc CSS styles, arbitrary Tailwind classes, or unapproved colors. All styles must map to [Design System](file:///Users/mac/Development/repos/noida.fit/docs/design/design-system.md) and [Color System](file:///Users/mac/Development/repos/noida.fit/docs/brand/color-system.md).
3. **Reuse UI Components:** Check [UI Components](file:///Users/mac/Development/repos/noida.fit/docs/design/ui-components.md) and [Component Architecture](file:///Users/mac/Development/repos/noida.fit/docs/engineering/component-architecture.md) before creating new primitives.
4. **Adhere to Scope:** Build only what is specified for **Phase 0 & Phase 1 (V1)**. Do not implement future roadmap items (e.g. standalone tracker, complex ticket checkout, algorithmic feeds, HYROX-specific workflows) unless explicitly tasked.
5. **Mobile-First Always:** Every view, card, filter, and modal must be designed and tested for real-world mobile scenarios (walking to an event, quick checking on WhatsApp link). See [Responsive Design](file:///Users/mac/Development/repos/noida.fit/docs/design/responsive-design.md).
6. **Accessibility Standard:** Strictly enforce semantic HTML and WCAG 2.1 AA contrast and focus states. See [Accessibility](file:///Users/mac/Development/repos/noida.fit/docs/design/accessibility.md).
7. **Performance & React Server Components:** Leverage Next.js 16 App Router Server Components by default. Keep client boundaries minimal (`"use client"` only for interaction). See [Performance](file:///Users/mac/Development/repos/noida.fit/docs/engineering/performance.md).
8. **SEO by Default:** Every public route must export complete Next.js metadata and structured JSON-LD schemas. See [SEO Specification](file:///Users/mac/Development/repos/noida.fit/docs/content/seo.md).
9. **No Corporate Jargon or Filler:** Never use placeholder marketing copy like *"Empowering your transformation"* or *"Unlock growth"*. Use authentic, human, local copy. See [Content Strategy](file:///Users/mac/Development/repos/noida.fit/docs/content/content-strategy.md).
10. **Real-World Purpose:** Every feature must serve the primary goal: helping real people discover, show up, and move together in Noida.

---

## What NOIDA.FIT Is (and Is NOT)

### What It Is
- **A city-first fitness discovery & community platform** for Noida & Greater Noida.
- **The central hub for local fitness culture:** Running clubs, strength groups, cycling peloton meetups, outdoor bootcamps, yoga circles, and wellness gatherings.
- **A directory of people, places, and times:** Answering *"Who is doing it + what is happening + where is it + when is it + how do I join?"*
- **A bridge between the digital platform and the physical city.**

### What It Is NOT
- ❌ **NOT another Strava clone:** We do not track GPS pace splits, elevation segments, or watt outputs. Strava asks *"How did you perform?"*; NOIDA.FIT asks *"Who are you moving with and where do you belong?"*
- ❌ **NOT a generic gym directory / Justdial:** We care about active communities, recurring workouts, and authentic organizers, not static business listings.
- ❌ **NOT an impersonal event ticketing portal (BookMyShow clone):** Focus is on community gatherings, group RSVP, social connection, and repeat participation.
- ❌ **NOT a closed-ecosystem fitness chain (Cult.fit clone):** We do not own gyms or employ captive trainers; we champion all independent local clubs and organizers.
- ❌ **NOT a niche sport-specific tracker:** In V1, we do not build dedicated workflows for HYROX, CrossFit, or triathlon formats. Everything lives under broad, inclusive fitness categories.

---

## Documentation Map

```
/docs
├── README.md                              # This document
│
├── product/
│   ├── vision.md                          # North star, vision statement & evolution ladder
│   ├── positioning.md                     # Target audience, geographic focus & boundaries
│   ├── product-principles.md              # 6 foundational product principles
│   └── roadmap.md                         # Phased implementation roadmap (V1 -> Future)
│
├── brand/
│   ├── brand-guidelines.md                # Brand personality, voice, vocabulary & tone
│   ├── logo-guidelines.md                 # NOIDA.FIT wordmark, .FIT badge & SVG implementation
│   ├── color-system.md                    # Palette, tokens, dark/light modes & contrast
│   ├── typography.md                      # Type scale, font pairings, weights & hierarchy
│   ├── photography.md                     # Visual direction: real Noida locations & candid energy
│   └── motion.md                          # Motion curves, durations & reduced-motion rules
│
├── design/
│   ├── design-system.md                   # Tailwind CSS v4 @theme, spacing, radii & shadows
│   ├── ui-components.md                   # Complete specification of core UI primitives
│   ├── responsive-design.md               # Breakpoints, mobile-first layouts & device touch targets
│   └── accessibility.md                   # WCAG 2.1 AA compliance, keyboard navigation & ARIA
│
├── ux/
│   ├── information-architecture.md        # URL routing, sitemap, dynamic slugs & navigation
│   ├── homepage.md                        # Living city hub: blueprint, hero, sections & layout
│   ├── discovery.md                       # Discovery engine: filters, category pills, sorting
│   ├── communities.md                     # Community profile UX, schedules, leader cards
│   ├── events.md                          # Event detail UX, location cards, RSVP & share
│   ├── places.md                          # Local spots: parks, stadiums, tracks & studios
│   ├── search.md                          # Natural-language intent search & structured filtering
│   └── user-flows.md                      # Key attendee & community discovery journeys
│
├── content/
│   ├── content-strategy.md                # Local tone, sector vernacular & writing rules
│   ├── editorial.md                       # Stories, weekend playbooks & organizer spotlights
│   ├── seo.md                            # Keyword matrix, Next.js metadata & JSON-LD schemas
│   └── content-seeding.md                 # Seed datasets: 6 communities, 10 events, 8 places
│
├── engineering/
│   ├── architecture.md                    # Modular monolith, Next.js 16 App Router & RSC
│   ├── folder-structure.md                # Project tree, directory conventions & import aliases
│   ├── component-architecture.md          # Component hierarchy, state boundaries & composition
│   ├── data-model.md                      # Entity models & TypeScript interfaces
│   ├── performance.md                     # Core Web Vitals, image optimization & caching
│   ├── security.md                        # UGC sanitization, rate limiting & trust controls
│   └── analytics.md                       # Telemetry schemas & Weekly Active Participants (WAP)
│
└── strategy/
    ├── competitive-positioning.md         # Strategic differentiation matrix
    └── future-vision.md                   # Long-term platform concepts (Fitness ID, Crews, Economy)
```

---

## Implementation Sequence for Agents

When implementing NOIDA.FIT, follow this strict phase order:

```text
Phase 0: Design Tokens & System Foundation
  ├── globals.css & Tailwind v4 @theme setup
  ├── Fonts (Geist Sans / Display integration)
  ├── Base primitives (Button, Badge, Input, Card, Modal)
  └── Shell layout (Header/Navbar, Footer, Mobile Navigation)
        ↓
Phase 1: Public V1 Experience (Current Target)
  ├── Mock/Seed Data Layer (data/ directory)
  ├── Homepage (/)
  ├── Discovery Hub (/discover)
  ├── Community Directory & Details (/communities, /community/[slug])
  ├── Event Directory & Details (/events, /event/[slug])
  ├── Places Directory & Details (/places, /place/[slug])
  ├── Editorial Stories (/stories, /story/[slug])
  ├── Search Experience (/search + quick search modal)
  └── Static Informational Pages (/about, /for-organizers)
        ↓
Phase 2: User Engagement (Save, Follow, RSVP)
        ↓
Phase 3: Organizer Portal (Self-serve listings & management)
        ↓
Phase 4: Ecosystem & Platform Evolution (Fitness ID, Crews, Marketplace)
```

---

## Core Product Metric

The north-star metric for NOIDA.FIT is **not** page views, impressions, or social followers:

$$\text{North Star} = \mathbf{\text{Weekly Active Participants (WAP)}}$$

A **Participant** is defined as an individual who discovers an event/community on NOIDA.FIT and physically shows up to move with others in Noida. Every feature must optimize for reducing friction between **online intent** and **offline participation**.
