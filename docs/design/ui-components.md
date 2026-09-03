# UI Component Specifications — NOIDA.FIT

This document establishes the UI component catalog, state patterns, and API interfaces for NOIDA.FIT. All components must be built as reusable, accessible components inside `components/ui/` or `components/features/`.

---

## 1. Navigation Components

### `Navbar` (`components/layout/Navbar.tsx`)
- **Container:** `sticky top-0 z-[500] w-full border-b border-border-subtle bg-background/80 backdrop-blur-md`.
- **Left:** `Logo` component (links to `/`).
- **Center (Desktop):** Navigation links:
  - *Discover* (`/discover`)
  - *Communities* (`/communities`)
  - *Events* (`/events`)
  - *Places* (`/places`)
  - *Stories* (`/stories`)
- **Right (Desktop):**
  - Quick Search Trigger button (`Cmd+K` shortcut badge, opens search modal).
  - Primary CTA: *"Explore Noida Fitness"* (`Button variant="primary" size="sm"`).
- **Mobile Treatment:**
  - Compact header (height `56px` or `64px`).
  - Search icon button + Mobile menu hamburger button (`aria-label="Open navigation menu"`).
  - Fullscreen/Slide-over drawer (`components/layout/MobileNav.tsx`) with animated backdrop.

---

## 2. Button Primitives (`components/ui/Button.tsx`)

### Props Interface
```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

### Visual Specifications
- **`primary`:** Solid Velocity Accent (`bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-sm hover:shadow-glow active:scale-[0.98] transition-all`).
- **`secondary`:** Dark Surface (`bg-surface-elevated hover:bg-surface-hover text-slate-100 border border-border-subtle hover:border-border-strong font-medium active:scale-[0.98]`).
- **`outline`:** Transparent with border (`border border-border-subtle hover:border-emerald-500/50 hover:bg-surface text-slate-200`).
- **`ghost`:** Borderless hover (`hover:bg-surface-hover text-slate-300 hover:text-white`).
- **`destructive`:** Red warning (`bg-rose-600 hover:bg-rose-500 text-white font-medium`).
- **`loading`:** Disabled state, pointer-events none, spinning SVG spinner, preserving button width.
- **`disabled`:** `opacity-50 cursor-not-allowed pointer-events-none`.

---

## 3. Card Catalog

### 1. `EventCard` (`components/cards/EventCard.tsx`)
Displays an upcoming fitness gathering or meetup.
- **Header/Visual:** Aspect ratio `16:9` image thumbnail or category gradient placeholder.
- **Date Badge:** Top-left overlay pill: Date (`SAT, OCT 12`) + Time (`06:00 AM`).
- **Price Tag:** Top-right overlay pill (`FREE` or `₹200`).
- **Body Content:**
  - Activity category tag (e.g. `COMMUNITY RUN`).
  - Event Title (H3, 1–2 lines clamp).
  - Host Community row (avatar thumbnail + community name).
  - Location row: Sector / Venue (e.g. `Noida Stadium, Gate 4, Sec. 21A`).
- **Footer:** Attendee count indicator (e.g. `24 attending`) + *"View Details"* link.

### 2. `CommunityCard` (`components/cards/CommunityCard.tsx`)
Showcases an active fitness club or group.
- **Header:** Wide club banner with overlapping square club crest/avatar.
- **Badges:** Verified badge (`Verified Community`), Category pill (`Running Club`).
- **Details:**
  - Community Name (H3).
  - Primary Sector / Base of operations (e.g. `Sector 137 & Expressway`).
  - Active Members count (e.g. `340+ members`).
  - Meeting Frequency tag (e.g. `Runs Tue, Thu, Sun`).
- **Action:** *"Join Community"* / *"View Schedule"* link.

### 3. `PlaceCard` (`components/cards/PlaceCard.tsx`)
Spotlights a track, park, gym, or sports ground.
- **Visual:** Photo of the track, court, or facility.
- **Type Badge:** `Public Track`, `Sports Complex`, `Running Route`, `Boutique Studio`.
- **Details:** Name, Sector address, Key amenities (e.g. `Floodlights`, `Synthetic Track`, `Free Parking`).
- **Associated Activity:** Number of active communities operating here.

### 4. `StoryCard` (`components/cards/StoryCard.tsx`)
Editorial / Culture magazine feature.
- **Visual:** `3:2` documentary photo.
- **Metadata:** Read time (`4 min read`), Category (`COMMUNITY SPOTLIGHT`).
- **Headline:** Bold editorial title + 2-line excerpt.

---

## 4. Badge Primitives (`components/ui/Badge.tsx`)

| Badge Variant | Visual Styling | Real-World Context |
| :--- | :--- | :--- |
| **Upcoming / Today** | `bg-emerald-950/80 text-emerald-400 border border-emerald-800/50` | Happening in the next 24 hours. |
| **Free Access** | `bg-sky-950/80 text-sky-400 border border-sky-800/50` | Open community workout; zero ticket cost. |
| **Verified** | `bg-indigo-950/80 text-indigo-300 border border-indigo-800/50` | Officially verified club leaders. |
| **Popular / Hot** | `bg-orange-950/80 text-orange-400 border border-orange-800/50`| 50+ RSVPs; high city engagement. |
| **Sector Tag** | `bg-surface-elevated text-slate-300 border border-border-subtle font-mono`| `SEC. 104`, `EXPRESSWAY`. |

---

## 5. Form & Filter Components

- **`SearchInput`:** Magnifying glass icon, clear button (`x`), placeholder text: *"Search running clubs, track sessions, sectors..."*.
- **`FilterPill`:** Toggle button (`active: bg-emerald-500 text-slate-950`, `inactive: bg-surface-elevated text-slate-300 border border-border-subtle`).
- **`SelectDropdown`:** Custom styled menu matching `--bg-surface`, with keyboard arrow navigation.
- **`DateFilterPicker`:** Quick-select pills: *Today*, *Tomorrow*, *This Weekend*, *Next 7 Days*.

---

## 6. Feedback & Loading States

- **`SkeletonCard`:** Shimmering animated pulse (`bg-surface-elevated animate-pulse rounded-lg`) mirroring the exact height and image aspect ratio of `EventCard` and `CommunityCard`. Eliminates Cumulative Layout Shift (CLS).
- **`EmptyState`:**
  - Illustrated or icon-driven layout (e.g. running shoe outline).
  - Clear message: *"No events found in Sector 62 for this weekend."*
  - Actionable reset: *"Clear Filters"* or *"Explore All Noida Events"*.
- **`FeedbackToast`:** Dismissible floating pill at bottom-center (`z-[1200]`) for actions like *"Event link copied to clipboard"* or *"Event saved"*.
