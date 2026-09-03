# Typography System — NOIDA.FIT

## 1. Typographic Direction

The typography of NOIDA.FIT strikes a deliberate balance between **Modern Editorial Design** and **High-Performance Digital Utility**.

Headlines are bold, geometric, confident, and tight—conveying athletic momentum and civic stature. Body copy is clean, neutral, and hyper-legible across all screen densities, especially under bright outdoor ambient sunlight when athletes view schedules on mobile devices.

---

## 2. Font Families

### Primary Font: `Geist Sans` (from `next/font/google`)
- **Role:** Headings, Display, UI Elements, Body Text, Buttons, Badges.
- **Why Geist:** High x-height, contemporary proportions, optimized geometric clarity, zero render latency via Next.js automated font self-hosting.
- **CSS Variable:** `--font-geist-sans`

### Monospace / Telemetry Font: `Geist Mono`
- **Role:** Timestamps, Sector IDs (`SEC. 21A`), distance tags (`12.4 KM`), paces (`5:30 /KM`), dates.
- **Why:** Delivers an authentic athletic stopwatch feel without cluttering editorial layouts.
- **CSS Variable:** `--font-geist-mono`

---

## 3. Typographic Hierarchy & Scale

| Style Level | Font Size (Desktop) | Font Size (Mobile) | Weight | Line Height | Tracking | Tailwind Equivalent | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | `4rem` (64px) | `2.5rem` (40px) | 900 Black | `1.05` | `-0.04em` | `text-4xl md:text-6xl font-black tracking-tight` | Homepage Hero headline only. |
| **Heading 1 (H1)**| `2.5rem` (40px) | `2rem` (32px) | 800 ExtraBold | `1.15` | `-0.03em` | `text-3xl md:text-4xl font-extrabold tracking-tight` | Page titles (Community name, Event name, Discover). |
| **Heading 2 (H2)**| `1.875rem` (30px) | `1.5rem` (24px) | 700 Bold | `1.2` | `-0.025em`| `text-2xl md:text-3xl font-bold tracking-tight` | Major section headers ("Happening This Week"). |
| **Heading 3 (H3)**| `1.375rem` (22px) | `1.25rem` (20px) | 700 Bold | `1.3` | `-0.02em` | `text-xl md:text-2xl font-bold` | Card titles (Event Card, Community Card, Place Card). |
| **Heading 4 (H4)**| `1.125rem` (18px) | `1rem` (16px) | 600 SemiBold | `1.4` | `-0.01em` | `text-base md:text-lg font-semibold` | Sub-sections, modal headers, organizer names. |
| **Body Large** | `1.125rem` (18px) | `1rem` (16px) | 400 Regular | `1.6` | `normal` | `text-base md:text-lg leading-relaxed` | Hero lead paragraph, editorial article intros. |
| **Body (Default)**| `1rem` (16px) | `0.9375rem` (15px)| 400 Regular | `1.6` | `normal` | `text-sm md:text-base leading-relaxed` | General descriptions, about sections, guidelines. |
| **Body Small** | `0.875rem` (14px) | `0.875rem` (14px) | 400 Regular | `1.5` | `normal` | `text-sm text-muted` | Secondary card info, venue address, captions. |
| **Caption / Tiny**| `0.75rem` (12px) | `0.75rem` (12px) | 500 Medium | `1.4` | `+0.02em`| `text-xs text-muted tracking-wide` | Timestamps, photo credits, copyright notices. |
| **Button Text** | `0.9375rem` (15px)| `0.9375rem` (15px)| 600 SemiBold | `1` | `normal` | `text-sm font-semibold tracking-wide` | Interactive buttons, action triggers. |
| **Navigation** | `0.875rem` (14px) | `1rem` (16px) | 500 Medium | `1` | `normal` | `text-sm font-medium` | Desktop & mobile header links. |
| **Category Pill** | `0.8125rem` (13px)| `0.75rem` (12px) | 600 SemiBold | `1` | `+0.03em`| `text-xs font-semibold uppercase tracking-wider` | Badges, category filters, verified tags. |
| **Metadata Tag** | `0.8125rem` (13px)| `0.75rem` (12px) | 500 Medium Mono | `1.2`| `normal` | `font-mono text-xs text-velocity` | Sector ID, Start Time (`05:45 AM`), Cost (`FREE`). |

---

## 4. Typography Implementation Guidelines for Next.js

1. **Hierarchy Discipline:** Every page must contain exactly one `<h1>` tag for SEO and screen-reader hierarchy. Never use multiple `<h1>` elements on a single page.
2. **Contrast Standards:** Heading text must always use `var(--text-primary)` (slate-50 / pure white) on dark backgrounds to ensure a minimum contrast ratio of 12:1 against surface colors.
3. **No Decorative Clutter:** Avoid italicizing entire sentences or applying synthetic letter-spacing expansions to lowercase body text.
4. **Number Formatting:** Use `font-mono` when displaying numerical telemetry (dates, times, sector codes, distances) to ensure consistent tabular width.
