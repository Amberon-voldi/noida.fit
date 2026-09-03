# Codebase Folder Structure & Organization — NOIDA.FIT

## 1. Repository Layout Philosophy

The NOIDA.FIT repository uses Next.js 16's App Router rooted directly at the project top-level (without an extraneous `src/` wrapper), consistent with the existing repository initialization and `tsconfig.json` path mapping (`@/* -> ./*`).

---

## 2. Complete Folder Tree Specification

```text
noida.fit/
├── app/                                 # Next.js App Router root
│   ├── layout.tsx                       # Root HTML shell, fonts & meta
│   ├── page.tsx                         # Homepage (/)
│   ├── globals.css                      # Tailwind v4 import & CSS @theme
│   ├── favicon.ico                      # Site favicon
│   ├── not-found.tsx                    # Custom branded 404 page
│   ├── error.tsx                        # Global error boundary
│   │
│   ├── discover/                        # Unified discovery hub
│   │   ├── page.tsx
│   │   └── loading.tsx
│   │
│   ├── communities/                     # Community directory
│   │   ├── page.tsx
│   │   └── [slug]/                      # Dynamic community hub
│   │       ├── page.tsx
│   │       └── not-found.tsx
│   │
│   ├── events/                          # Event calendar
│   │   ├── page.tsx
│   │   └── [slug]/                      # Dynamic event details
│   │       ├── page.tsx
│   │       └── not-found.tsx
│   │
│   ├── places/                          # Places & venues directory
│   │   ├── page.tsx
│   │   └── [slug]/                      # Dynamic place details
│   │       └── page.tsx
│   │
│   ├── stories/                         # Editorial magazine
│   │   ├── page.tsx
│   │   └── [slug]/                      # Dynamic editorial article
│   │       └── page.tsx
│   │
│   ├── search/                          # Search results page
│   │   └── page.tsx
│   │
│   ├── about/                           # About & manifesto
│   │   └── page.tsx
│   │
│   ├── for-organizers/                  # Community leader intake
│   │   └── page.tsx
│   │
│   ├── sitemap.ts                       # Dynamic XML sitemap generator
│   └── robots.ts                        # SEO robots.txt generator
│
├── components/                          # Reusable UI component catalog
│   ├── brand/                           # Logo, crests, brand marks
│   │   ├── Logo.tsx
│   │   └── Favicon.tsx
│   │
│   ├── layout/                          # Global shell components
│   │   ├── Navbar.tsx
│   │   ├── MobileNav.tsx
│   │   └── Footer.tsx
│   │
│   ├── ui/                              # Foundational design primitives
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Modal.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── cards/                           # Reusable content card entities
│   │   ├── EventCard.tsx
│   │   ├── CommunityCard.tsx
│   │   ├── PlaceCard.tsx
│   │   └── StoryCard.tsx
│   │
│   └── features/                        # Domain-specific interactive widgets
│       ├── discovery/                   # Discovery filters & view toggle
│       │   ├── FilterBar.tsx
│       │   └── CategoryPills.tsx
│       ├── search/                      # Global command search modal
│       │   ├── SearchModal.tsx
│       │   └── SearchBar.tsx
│       └── events/                      # RSVP & calendar widgets
│           ├── RSVPModal.tsx
│           └── AddToCalendar.tsx
│
├── data/                                # Seed & mock content storage
│   └── seed/
│       ├── communities.json             # Seed communities
│       ├── events.json                  # Seed gatherings
│       ├── places.json                  # Seed tracks & parks
│       └── stories.json                 # Seed editorial articles
│
├── lib/                                 # Shared logic & data access
│   ├── data/                            # Decoupled Data Access Layer
│   │   ├── communities.ts
│   │   ├── events.ts
│   │   ├── places.ts
│   │   └── stories.ts
│   ├── utils.ts                         # Tailwind clsx/twMerge helpers
│   ├── date.ts                          # IST time & date formatting
│   └── search.ts                        # Client-side tokenizer & matcher
│
├── types/                               # TypeScript domain definitions
│   ├── community.ts
│   ├── event.ts
│   ├── place.ts
│   ├── story.ts
│   └── filters.ts
│
├── config/                              # Static configuration constants
│   ├── site.ts                          # Site metadata, domains, socials
│   └── navigation.ts                    # Header/footer link registries
│
├── public/                              # Static public assets (SVGs, imagery)
└── docs/                                # Institutional project documentation
```

---

## 3. Path Alias Discipline

Always use the root `@/*` alias defined in `tsconfig.json`:
- **Correct:** `import { Button } from "@/components/ui/Button";`
- **Correct:** `import { getUpcomingEvents } from "@/lib/data/events";`
- **Avoid:** Relative traverse imports like `../../../components/ui/Button`.
