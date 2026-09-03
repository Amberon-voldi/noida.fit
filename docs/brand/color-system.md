# Color System & Design Tokens — NOIDA.FIT

## 1. Overview & Color Philosophy

The NOIDA.FIT color system is engineered to feel **contemporary, urban, energetic, and premium**.

Instead of generic gym blacks or childish neon yellows, the palette uses a sophisticated **Deep Obsidian & Midnight Slate** foundation paired with a high-visibility **Electric Emerald / Kinetic Mint** velocity accent. This creates high contrast for outdoor, mobile sunlight readability while establishing a clean editorial presence.

---

## 2. Color Palette & Hex Specifications

### Dark Mode (Primary Default Theme)

| Token Name | Hex Code | HSL Value | Description / Usage |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#090A0F` | `230°, 25%, 5%` | Primary background. Deep obsidian tone, eliminating harsh pure black OLED smear while maintaining deep contrast. |
| `--bg-surface` | `#11141D` | `225°, 26%, 9%` | Card backgrounds, search panels, and dropdown containers. |
| `--bg-surface-elevated`| `#191E2C` | `224°, 28%, 14%`| Modal dialogues, floating action buttons, sticky navigation bar. |
| `--bg-surface-hover` | `#22293C` | `223°, 27%, 18%`| Hover state for interactive cards and list rows. |
| `--border-subtle` | `#1E2436` | `225°, 28%, 16%`| Default border for dividers, section splits, and card outlines. |
| `--border-strong` | `#333C57` | `225°, 26%, 27%`| Active filters, input borders on focus, and highlighted cards. |
| `--text-primary` | `#F8FAFC` | `210°, 40%, 98%`| Headings, card titles, key metric numbers. Pure readability. |
| `--text-secondary` | `#94A3B8` | `215°, 16%, 65%`| Subheadings, card metadata (date, sector, group size). |
| `--text-muted` | `#64748B` | `215°, 16%, 47%`| Captions, timestamps, disabled indicators. |
| `--accent-velocity` | `#10B981` | `160°, 84%, 39%`| **The Spark / Velocity:** CTAs, active pills, category tags, map pins. |
| `--accent-velocity-glow`| `#34D399` | `156°, 72%, 67%`| Hover highlight, focus rings, status indicators. |
| `--accent-energy` | `#F97316` | `25°, 95%, 53%` | Secondary warmth: Long runs, sunrise sessions, hot events. |

### Light Mode (Secondary Adaptive Theme)

| Token Name | Hex Code | HSL Value | Description / Usage |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#F8FAFC` | `210°, 40%, 98%` | Crisp, clean, paper-white canvas. |
| `--bg-surface` | `#FFFFFF` | `0°, 0%, 100%` | Pure white card surfaces. |
| `--bg-surface-elevated`| `#F1F5F9` | `210°, 40%, 96%` | Floating elements, toolbars, elevated cards. |
| `--border-subtle` | `#E2E8F0` | `214°, 32%, 91%` | Light dividers and card boundaries. |
| `--border-strong` | `#CBD5E1` | `214°, 20%, 80%` | Form inputs and active boundary states. |
| `--text-primary` | `#0F172A` | `222°, 47%, 11%` | Deep charcoal for maximum contrast. |
| `--text-secondary` | `#475569` | `215°, 25%, 35%` | Body copy and secondary labels. |
| `--text-muted` | `#94A3B8` | `215°, 16%, 65%` | Secondary metadata. |
| `--accent-velocity` | `#059669` | `161°, 94%, 30%` | High-contrast accessible green. |
| `--accent-energy` | `#EA580C` | `24°, 94%, 50%` | Warm highlight. |

---

## 3. Semantic Status Colors

Used for badges, feedback alerts, and real-time event status:

| Semantic State | Color Token | Hex Code | Light Surface | Real-World Context |
| :--- | :--- | :--- | :--- | :--- |
| **Upcoming / Live Today** | `emerald-500` | `#10B981` | `#059669` | Event happening today or ongoing morning session. |
| **Warning / Almost Full** | `amber-500` | `#F59E0B` | `#D97706` | Only 5 spots left for weekend long run; registration closing. |
| **Cancelled / Rescheduled**| `rose-500` | `#F43F5E` | `#E11D48` | Rain alert; workout relocated or postponed. |
| **Informational / Free** | `sky-500` | `#0EA5E9` | `#0284C7` | Free community meetup; open to all paces. |
| **Verified Community** | `indigo-400` | `#818CF8` | `#4F46E5` | Officially recognized Noida community with verified leaders. |

---

## 4. Interactive States Specification

To ensure interactive consistency across all buttons, cards, and links:

| Component State | Background Treatment | Border Treatment | Text / Content Treatment |
| :--- | :--- | :--- | :--- |
| **Default** | `var(--bg-surface)` | `1px solid var(--border-subtle)` | `var(--text-primary)` |
| **Hover** | `var(--bg-surface-hover)` | `1px solid var(--border-strong)` | Lift / color accent shift |
| **Active / Pressed**| Darker surface (`#0D1017`) | `1px solid var(--accent-velocity)` | Scale `0.98` |
| **Focused (Keyboard)**| Current surface | Double ring: `2px solid var(--accent-velocity)` with `2px offset` | Unchanged |
| **Disabled** | `rgba(255, 255, 255, 0.05)` | `1px solid rgba(255, 255, 255, 0.08)` | `var(--text-muted)` with `opacity: 0.5` |

---

## 5. Tailwind CSS v4 `@theme` Configuration Mapping

In Next.js 16 + Tailwind CSS v4, theme tokens are defined directly in CSS using `@theme` and custom properties in `app/globals.css`:

```css
@import "tailwindcss";

:root {
  /* Default: Dark Theme */
  --background: #090a0f;
  --foreground: #f8fafc;
  --surface: #11141d;
  --surface-elevated: #191e2c;
  --surface-hover: #22293c;
  --border-subtle: #1e2436;
  --border-strong: #333c57;
  --text-muted: #94a3b8;
  
  --accent-velocity: #10b981;
  --accent-velocity-glow: #34d399;
  --accent-energy: #f97316;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-elevated: var(--surface-elevated);
  --color-surface-hover: var(--surface-hover);
  --color-border-subtle: var(--border-subtle);
  --color-border-strong: var(--border-strong);
  --color-muted: var(--text-muted);
  --color-velocity: var(--accent-velocity);
  --color-velocity-glow: var(--accent-velocity-glow);
  --color-energy: var(--accent-energy);
}
```
