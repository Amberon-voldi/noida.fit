# Logo & Brand Identity Guidelines — NOIDA.FIT

## 1. Primary Wordmark Concept

The NOIDA.FIT brand identity is anchored by a high-impact, typographic wordmark:

$$\mathbf{\text{NOIDA.FIT}}$$

The identity communicates **civic pride, forward motion, and digital infrastructure**. It is designed to be instantly recognizable on mobile screens, race day banners, social avatars, and city running bibs.

### Anatomy of the Wordmark

```text
  ┌─────────────────┐ ┌───────────────┐
  │   N O I D A     │ │   . F I T     │
  └─────────────────┘ └───────────────┘
     Base City Name     Velocity TLD Mark
   (Bold, Heavy Sans)  (Accent Pill or Color)
```

1. **`NOIDA` (The Foundation):** Rendered in uppercase, extra-bold geometric sans-serif (e.g., Geist Sans 800/900 weight) with tight tracking (`-0.03em`). Represents stability, civic scale, and local density.
2. **`.FIT` (The Velocity Dot & Extension):**
   - The period (`.`) functions as both an internet domain dot and an energetic spark (rendered in our vibrant velocity accent color).
   - `FIT` can be rendered in medium/semi-bold weight, or enclosed inside a sleek high-contrast badge/pill, emphasizing the digital ecosystem (`noida.fit`).

---

## 2. Logo Variants

### Variant A: Dark Surface Primary (Default Website Theme)
- `NOIDA`: Pure White (`#FFFFFF` or `#F8FAFC`).
- `.`: Velocity Volt / Cyan (`#00F0FF` or `#10B981` / `#CCFF00`).
- `FIT`: Velocity Accent or Light Silver (`#E2E8F0`).
- Background: Deep Obsidian / Charcoal (`#090A0F`).

### Variant B: Light Surface Variant
- `NOIDA`: Deep Charcoal / Obsidian (`#0F172A`).
- `.`: Electric Velocity Accent (`#008080` / `#059669` / `#FF5500`).
- `FIT`: Deep Slate (`#334155`).
- Background: Pure White / Off-white (`#FFFFFF` / `#F8FAFC`).

### Variant C: Monochrome (Single Color)
- Used for high-contrast print, single-color race bibs, or strict black & white documentation.
- Solid Black (`#000000`) on white, or Solid White (`#FFFFFF`) on dark backgrounds.

### Variant D: Icon & Favicon (`N.` or `[N]`)
- For app icons, favicons, and social avatar frames where full wordmarks become illegible.
- Capital letter `N` with an energetic velocity dot `.` at the bottom right, enclosed in a rounded squircle (`border-radius: 22%`).

---

## 3. Safe Area & Sizing Specifications

### Clear Space Rule
- The minimum clear space around the wordmark is equal to the height of the letter **`N`** on all sides.
- No text, graphics, icons, or container borders may encroach within this boundary.

```text
      ┌──────────────────────────────────────┐
      │               [ h(N) ]               │
      │   [h(N)]   NOIDA.FIT   [h(N)]        │
      │               [ h(N) ]               │
      └──────────────────────────────────────┘
```

### Minimum Sizing
- **Digital Screen (Desktop / Web):** Minimum height 24px (wordmark width ~110px).
- **Mobile Navbar:** Optimal height 28px.
- **Print / Physical Merchandise:** Minimum width 35mm.
- **Favicon / App Icon:** 32x32px, 48x48px, 192x192px (icon variant `N.`).

---

## 4. Incorrect Usage (What NOT to Do)

To maintain brand integrity, avoid the following misuses:
- ❌ **Do not distort:** Never stretch, skew, or compress the wordmark proportions.
- ❌ **Do not alter the case:** Never write `noida.fit` or `Noida.Fit` in the primary display logo (the domain in body copy may be lowercase, but the logo is uppercase `NOIDA.FIT`).
- ❌ **Do not change font styling:** Never substitute the wordmark with serif, script, or decorative comic fonts.
- ❌ **Do not add heavy drop shadows:** Never use fuzzy or multi-colored drop shadows.
- ❌ **Do not rotate:** The wordmark must always sit horizontally on a flat baseline.
- ❌ **Do not add unrelated clip-art:** Never attach generic running shoes, barbells, or flame icons to the logo.

---

## 5. Next.js Implementation Specification

All logos in the frontend must be implemented as clean, scalable SVG React components or SVG assets rather than raster PNGs.

### SVG Component Reference (`components/brand/Logo.tsx`)

```tsx
import React from "react";

interface LogoProps {
  variant?: "light" | "dark" | "monochrome";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ variant = "dark", className = "", size = "md" }: LogoProps) {
  const heightMap = {
    sm: "h-6", // 24px
    md: "h-8", // 32px
    lg: "h-11", // 44px
  };

  const textColor = variant === "light" ? "fill-slate-900" : "fill-white";
  const dotColor = "fill-emerald-400"; // Or token var(--color-accent)
  const fitColor = variant === "light" ? "fill-slate-600" : "fill-slate-300";

  return (
    <svg
      viewBox="0 0 160 36"
      aria-label="NOIDA.FIT Home"
      className={`${heightMap[size]} w-auto ${className}`}
      role="img"
    >
      {/* NOIDA */}
      <text
        x="0"
        y="28"
        fontFamily="var(--font-geist-sans), sans-serif"
        fontWeight="900"
        fontSize="30"
        letterSpacing="-0.04em"
        className={textColor}
      >
        NOIDA
      </text>

      {/* DOT */}
      <circle cx="106" cy="25" r="4.5" className={dotColor} />

      {/* FIT */}
      <text
        x="115"
        y="28"
        fontFamily="var(--font-geist-sans), sans-serif"
        fontWeight="700"
        fontSize="30"
        letterSpacing="-0.02em"
        className={fitColor}
      >
        FIT
      </text>
    </svg>
  );
}
```
