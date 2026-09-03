# Responsive Design & Mobile-First UX — NOIDA.FIT

## 1. The Mobile-First Imperative

Fitness platforms are fundamentally **mobile-context software**. Users rarely browse NOIDA.FIT from a dual-monitor office desktop. 

### Real-World User Scenarios
1. **The 5:30 AM Transit Check:** A runner in a cab or walking toward Sector 21A checking which stadium gate the group is meeting at.
2. **The WhatsApp Viral Link:** Someone taps a link shared inside their apartment complex's cycling WhatsApp group.
3. **The Instagram Story Referral:** A user taps `@noida.fit` from an Instagram story on mobile and needs instant, frictionless comprehension within 3 seconds.
4. **The Bright Sunlight Condition:** An athlete standing in the middle of a park under direct sunlight checking the workout route on their screen.

---

## 2. Breakpoint Matrix

NOIDA.FIT follows standard Tailwind CSS responsive tiers:

| Breakpoint Tier | Min Width | Target Devices | Layout Behavior |
| :--- | :--- | :--- | :--- |
| **Small Mobile (`base`)** | `< 390px` | iPhone SE, Galaxy A series | Single column (`grid-cols-1`). Edge-to-edge cards with 16px side padding. Sticky bottom action bar for primary CTA. |
| **Standard Mobile (`sm`)** | `640px` | iPhone 14/15/16, Pixel 8, Galaxy S24 | Single column with generous breathing room. Horizontal category pill scroll list. |
| **Tablet (`md`)** | `768px` | iPad, iPad Mini, Surface Go | 2-column card grid (`grid-cols-2`). Visible desktop navigation links replace hamburger menu. |
| **Laptop (`lg`)** | `1024px` | MacBook Air, 13" Laptops | 3-column event grid (`grid-cols-3`). Persistent sidebar filter panel on `/discover`. |
| **Desktop (`xl`)** | `1280px` | Desktop Monitors, 15"/16" Laptops | Max-width content container (`max-w-7xl mx-auto px-8`). Split layout on event & community detail pages. |
| **Ultra-Wide (`2xl`)** | `1536px` | 27"+ Monitors, 4K Displays | Strict container clamping to prevent excessive line lengths. |

---

## 3. Mobile Ergonomics & Touch Guidelines

### 1. The 44px Minimum Touch Target Rule
- Every interactive element (buttons, icon triggers, filter pills, checkboxes, navigation links) must have an accessible hit area of **at least 44x44px**, even if the visual icon is smaller (achieved via negative margin or padding utilities: `p-2.5` or `min-h-[44px]`).

### 2. Thumb-Zone Optimization
- On mobile screens, place high-frequency action items (e.g. *"RSVP"*, *"Join Community"*, *"Share"*) within the lower half of the screen.
- On dynamic detail pages (`/event/[slug]`), implement a **sticky bottom bar on mobile**:
  - Displays event time, price, and a full-width *"RSVP"* button.
  - Automatically hidden on desktop where side-rail buttons are visible.

### 3. Horizontal Swiping for Category Pills
- Filter categories (e.g. *All*, *Running*, *Cycling*, *Strength*, *Badminton*) on mobile must use horizontal scrolling with hidden scrollbars (`overflow-x-auto no-scrollbar flex space-x-2 py-1`) to enable quick one-thumb swiping.

---

## 4. Outdoor Sunlight Readability Standard

To guarantee legibility during early morning and daytime outdoor meetups:
1. Primary text must achieve a minimum contrast ratio of **7:1** against backgrounds (surpassing standard WCAG AA 4.5:1).
2. Avoid low-contrast gray text on dark slate surfaces for critical information like gate numbers, sector codes, and meeting times.
3. Use bold weights (600/700) for key metrics to resist glare on mobile glass screens.
