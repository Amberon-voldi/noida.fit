# Engineering Architecture & System Design — NOIDA.FIT

## 1. Architectural Style: The Modular Monolith

NOIDA.FIT is engineered as a **lean, highly maintainable Modular Monolith** built on:
- **Framework:** Next.js `16.3.4` (App Router)
- **Runtime & UI:** React `19.2.8`
- **Styling:** Tailwind CSS `^4.0` (with `@tailwindcss/postcss`)
- **Language:** TypeScript `^5.0` (Strict mode)

> [!CAUTION]
> **NO MICROSERVICES:**  
> Do not introduce distributed microservices, Docker clusters, message queues (Kafka/RabbitMQ), or separate standalone backend API servers for V1. The entire platform runs within the Next.js App Router.

---

## 2. Server Components (RSC) vs. Client Components

Following modern React 19 architecture:

```text
┌──────────────────────────────────────────────────────────────┐
│ Server Component (RSC) — Default                             │
│ • Fetches mock data / DB queries                             │
│ • Renders semantic HTML markup                               │
│ • Zero JavaScript sent to client bundle                      │
│ • Generates SEO meta & JSON-LD schemas                       │
│                                                              │
│   ┌────────────────────────────────────────────────────────┐ │
│   │ Client Component ("use client") — Isolated Leaf Nodes  │ │
│   │ • SearchBar (debounced input, keyboard shortcuts)      │ │
│   │ • FilterPills (interactive state toggle)               │ │
│   │ • RSVPModal (interactive drawer & form submit)         │ │
│   │ • MobileNavDrawer (animated slide-out menu)            │ │
│   └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### The Golden Rule of Boundaries
1. Keep client boundaries at the **leaves** of the component tree.
2. Never mark an entire page (`page.tsx`) as `"use client"` unless strictly necessary. Fetch data in the Server Component page and pass structured data as props to lightweight interactive Client Components.

---

## 3. Next.js 16 Breaking Conventions & Agent Alert

> [!IMPORTANT]
> **As noted in `AGENTS.md` and Next.js 15/16 documentation:**  
> Dynamic route `params` and `searchParams` are **asynchronous Promises**.

### Dynamic Route Parameter Pattern in Next.js 16
```tsx
// app/community/[slug]/page.tsx
interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CommunityPage({ params }: PageProps) {
  // MUST await params in Next.js 15/16
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);

  if (!community) {
    notFound();
  }

  return <CommunityView community={community} />;
}
```

---

## 4. Data Access Layer (DAL)

In V1, all data is managed through a clean, decoupled Data Access Layer (`lib/data/`):
- `lib/data/communities.ts`: `getCommunities()`, `getCommunityBySlug(slug)`
- `lib/data/events.ts`: `getUpcomingEvents()`, `getEventBySlug(slug)`, `getEventsByCommunity(slug)`
- `lib/data/places.ts`: `getPlaces()`, `getPlaceBySlug(slug)`

### Why This Matters:
- In V1, these functions query typed in-memory seed datasets (`data/seed/`).
- In Phase 2/3, when PostgreSQL / Supabase / Prisma is connected, **only the internals of these functions change**; the React pages and components remain completely untouched.

---

## 5. Streaming & Suspense Boundaries

To guarantee an instantaneous First Contentful Paint (FCP):
1. Wrap dynamic list grids in React `<Suspense fallback={<SkeletonGrid />}>`.
2. Use Next.js special files:
   - `loading.tsx` for route-level fallback skeletons.
   - `error.tsx` with `"use client"` for graceful boundary recovery.
   - `not-found.tsx` for custom 404 pages.
