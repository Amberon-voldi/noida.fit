# Design System & Token Architecture — NOIDA.FIT

## 1. Design Token Architecture

The NOIDA.FIT design system is built directly on CSS Custom Properties and Tailwind CSS v4's native `@theme` engine. This ensures zero runtime CSS overhead, maximum type safety, and complete consistency across all pages and components.

---

## 2. Core Token Scales

### Spacing Scale (4px Base Unit)

| Spacing Token | CSS Pixels | Rem Equivalent | Primary UI Application |
| :--- | :--- | :--- | :--- |
| `space-1` | `4px` | `0.25rem` | Micro-spacing between icon and badge label. |
| `space-2` | `8px` | `0.5rem` | Gap between tags, inner padding for compact badges. |
| `space-3` | `12px` | `0.75rem` | Padding inside inputs, buttons, and alert strips. |
| `space-4` | `16px` | `1.0rem` | Standard card internal padding on mobile, standard grid gap. |
| `space-6` | `24px` | `1.5rem` | Card internal padding on desktop, layout section gutters. |
| `space-8` | `32px` | `2.0rem` | Space between major component blocks. |
| `space-12` | `48px` | `3.0rem` | Spacing below section titles on tablet/desktop. |
| `space-16` | `64px` | `4.0rem` | Standard vertical padding for homepage sections. |
| `space-24` | `96px` | `6.0rem` | Hero section vertical padding. |

### Border Radius Scale

> [!NOTE]
> Avoid making every container a generic bubbly rounded pill. Use intentional radii:

| Radius Token | Value | Tailwind Class | Application |
| :--- | :--- | :--- | :--- |
| `--radius-sm` | `4px` | `rounded-sm` | Code tags, micro status dots, tooltips. |
| `--radius-md` | `8px` | `rounded-md` | Buttons, form inputs, category filter pills. |
| `--radius-lg` | `12px` | `rounded-lg` | Standard cards (EventCard, PlaceCard), dropdown menus. |
| `--radius-xl` | `16px` | `rounded-xl` | Major feature cards, modal dialog containers. |
| `--radius-2xl`| `24px` | `rounded-2xl`| Hero containers, full-bleed imagery wrappers. |
| `--radius-full`| `9999px`| `rounded-full`| Circular avatars, pill status indicators. |

### Elevation & Shadows

In dark mode, physical drop shadows are often invisible. We pair subtle shadows with **refined border highlights (`1px solid var(--border-subtle)`)**:

| Elevation Token | Box Shadow Value | Usage |
| :--- | :--- | :--- |
| `--shadow-card` | `0 4px 12px rgba(0, 0, 0, 0.35)` | Resting state for cards on `--bg-base`. |
| `--shadow-card-hover` | `0 12px 28px -6px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border-strong)` | Hovered card state; provides lift and outline focus. |
| `--shadow-dropdown` | `0 16px 32px -4px rgba(0, 0, 0, 0.7)` | Dropdown menus, tooltips, popovers. |
| `--shadow-modal` | `0 24px 48px -12px rgba(0, 0, 0, 0.85)`| Global search modal (`Cmd+K`), RSVP drawer. |
| `--shadow-glow` | `0 0 20px -2px rgba(16, 185, 129, 0.25)` | Highlighting active velocity elements or primary buttons. |

### Z-Index Layering Scale

| Z-Index Token | Value | Applied Component |
| :--- | :--- | :--- |
| `--z-base` | `0` | Standard page content and background visuals. |
| `--z-card` | `10` | Elevated card surfaces and relative badges. |
| `--z-sticky` | `100` | Sticky section headers, filter toolbars. |
| `--z-navbar` | `500` | Global fixed header/navbar. |
| `--z-drawer` | `800` | Mobile navigation drawer, filter slide-over panel. |
| `--z-backdrop` | `900` | Dark overlay backdrops behind modals. |
| `--z-modal` | `1000` | Command search modal, full-screen dialogues. |
| `--z-toast` | `1200` | Feedback toasts, floating system notifications. |

---

## 3. Tailwind CSS v4 Implementation Reference

Agents must configure `app/globals.css` with these tokens:

```css
@import "tailwindcss";

:root {
  /* Surface Tokens */
  --background: #090a0f;
  --foreground: #f8fafc;
  --surface: #11141d;
  --surface-elevated: #191e2c;
  --surface-hover: #22293c;
  
  /* Border Tokens */
  --border-subtle: #1e2436;
  --border-strong: #333c57;
  
  /* Text Tokens */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  
  /* Brand Accent Tokens */
  --accent-velocity: #10b981;
  --accent-velocity-glow: #34d399;
  --accent-energy: #f97316;
  
  /* Radius Tokens */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-elevated: var(--surface-elevated);
  --color-surface-hover: var(--surface-hover);
  --color-border-subtle: var(--border-subtle);
  --color-border-strong: var(--border-strong);
  
  --color-velocity: var(--accent-velocity);
  --color-velocity-glow: var(--accent-velocity-glow);
  --color-energy: var(--accent-energy);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
}
```
