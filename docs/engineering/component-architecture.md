# Component Architecture & Composition Patterns — NOIDA.FIT

## 1. Architectural Principles for Components

1. **Composition Over Configuration:** Avoid creating monolithic "god components" with dozens of booleans (e.g. `<Card isEvent isCommunity isLarge hasBadge hasMap />`). Instead, build distinct, composable cards (`EventCard`, `CommunityCard`) composed of smaller primitives (`Badge`, `DatePill`, `LocationTag`).
2. **Server-First Composition:** Components should default to React Server Components unless they require user interaction (form state, dropdown toggles, modal dialogs).
3. **Strict Props Interfaces:** Every component must export an explicit TypeScript interface defining its inputs.

---

## 2. Component Categorization Matrix

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Foundational UI Primitives (components/ui/)              │
│    • Button, Badge, Input, Select, Skeleton, Modal          │
│    • 100% reusable, domain-agnostic                         │
├─────────────────────────────────────────────────────────────┤
│ 2. Brand & Layout Shell (components/layout/, brand/)        │
│    • Logo, Navbar, MobileNav, Footer, SectionHeader         │
│    • Handles global navigation, responsive layout           │
├─────────────────────────────────────────────────────────────┤
│ 3. Domain Entity Cards (components/cards/)                  │
│    • EventCard, CommunityCard, PlaceCard, StoryCard         │
│    • Composes UI primitives around domain data              │
├─────────────────────────────────────────────────────────────┤
│ 4. Interactive Feature Modules (components/features/)       │
│    • FilterBar, CategoryPills, SearchModal, RSVPModal       │
│    • Contains client state, event handlers, URL sync        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Key Component Blueprint & Props Contracts

### 1. `SectionHeader` (`components/layout/SectionHeader.tsx`)
```tsx
interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  actionText?: string;
  actionHref?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  badge,
  title,
  subtitle,
  actionText,
  actionHref,
  align = "left",
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 ${
      align === "center" ? "text-center md:text-left" : ""
    }`}>
      <div>
        {badge && (
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 inline-block">
            {badge}
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-slate-400 text-sm sm:text-base mt-1 max-w-xl">
            {subtitle}
          </p>
        )}
      </div>
      {actionText && actionHref && (
        <a
          href={actionHref}
          className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 group whitespace-nowrap"
        >
          {actionText}
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </a>
      )}
    </div>
  );
}
```

### 2. `EventCard` Composition Example (`components/cards/EventCard.tsx`)
```tsx
import { Event } from "@/types/event";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export function EventCard({ event }: { event: Event }) {
  return (
    <article className="group relative flex flex-col bg-surface rounded-xl border border-border-subtle hover:border-border-strong hover:bg-surface-hover transition-all duration-200 shadow-sm hover:shadow-card-hover overflow-hidden">
      {/* Visual Header / Thumbnail */}
      <div className="relative aspect-video w-full bg-surface-elevated overflow-hidden">
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <Badge variant="today">{event.startTime}</Badge>
          <Badge variant="sector">{event.sector}</Badge>
        </div>
        <div className="absolute top-3 right-3 z-10">
          <Badge variant={event.price === "FREE" ? "free" : "default"}>
            {event.price}
          </Badge>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-5">
        <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
          {event.category}
        </span>
        <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
          <Link href={`/event/${event.slug}`} className="focus:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {event.title}
          </Link>
        </h3>
        <p className="text-xs text-slate-400 mt-2 line-clamp-1">
          📍 {event.venueName}
        </p>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border-subtle/60 flex items-center justify-between text-xs text-slate-400">
          <span>By {event.communityName}</span>
          <span className="font-semibold text-emerald-400">View Details →</span>
        </div>
      </div>
    </article>
  );
}
```

---

## 4. State Management Guidelines (V1)

- **Client-Side Filter State:** Managed via standard React `useState` / `useMemo` or URL search parameters via `useSearchParams()` for shareable filtered URLs (e.g. `/discover?activity=running&sector=137`).
- **No Global Store Bloat:** Do not install heavy state libraries like Redux or MobX. Modern React hooks (`useContext`, `useState`) and URL state are completely sufficient for V1.
