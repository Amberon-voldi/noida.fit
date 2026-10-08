# Motion Design Specification — NOIDA.FIT

## 1. Motion Philosophy: Athletic & Purposeful

Motion on NOIDA.FIT is **restrained, responsive, and functional**. It mirrors the physics of human athleticism: snappy acceleration, controlled momentum, and instant reaction time.

We reject decorative animations that slow down the user. A user trying to see if a morning run starts in 15 minutes does not want to wait for a 3-second spinning 3D mascot or sluggish page transitions.

---

## 2. Timing Scales & Easing Functions

All animations and transitions must adhere to standardized timing tokens:

| Token Name | Duration | Easing Curve (CSS `cubic-bezier`) | Usage Scenario |
| :--- | :--- | :--- | :--- |
| **Instant Micro** | `100ms` | `cubic-bezier(0, 0, 0.2, 1)` (ease-out) | Button active/pressed states, checkbox toggles, pill clicks. |
| **Snappy Feedback**| `150ms` | `cubic-bezier(0.16, 1, 0.3, 1)` (snappy ease-out)| Tooltip popovers, badge hover shifts, dropdown menu open. |
| **Standard Interaction**| `200ms`–`250ms` | `cubic-bezier(0.16, 1, 0.3, 1)` (smooth ease-out) | Card hover lift, modal enter/exit, mobile menu drawer slide. |
| **Content Transition**| `300ms` | `cubic-bezier(0.25, 1, 0.5, 1)` | Filter layout reflow, tab panel crossfades, accordion expand. |
| **Deliberate Reveal** | `400ms` max | `cubic-bezier(0.16, 1, 0.3, 1)` | Initial hero section load on first page visit. |

---

## 3. Interactive Motion Specifications

### 1. Card Hover Interaction
Cards must feel tactile and responsive without shifting neighboring elements:
- **Transform:** `translateY(-3px)` to `-4px` max.
- **Border highlight:** Border color transitions from `var(--border-subtle)` to `var(--border-strong)`.
- **Shadow:** Subtle glow / elevation increase: `box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5)`.
- **Duration:** `200ms ease-out`.

### 2. Search Modal Overlay (`Cmd+K`)
- **Backdrop:** Fades in (`opacity: 0` to `opacity: 1`, `150ms ease-out`).
- **Modal Container:** Drops slightly from above (`translateY(-8px)` to `translateY(0)`, `scale(0.98)` to `scale(1.0)`, `200ms cubic-bezier(0.16, 1, 0.3, 1)`).

### 3. Category Filter Pills
- Clicking a category pill (e.g. "Running" or "Sector 137") triggers immediate state toggle (`100ms`).
- Content grid transitions smoothly without jarring layout breaks.

### 4. Mobile Navigation Drawer
- Slides in smoothly from right or top: `translateX(100%)` to `translateX(0)`.
- Duration: `250ms cubic-bezier(0.16, 1, 0.3, 1)`.

---

## 4. Accessibility & `prefers-reduced-motion`

Under no circumstances should motion induce vestibular disorientation or degrade accessibility.

### Mandatory CSS Media Query Rule
All custom CSS keyframes and transitions must respect user system preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

In Tailwind CSS v4 / React components:
- Use `motion-reduce:transition-none` and `motion-reduce:transform-none` for interactive elements.
- Ensure that opacity fades replace sliding transforms when reduced motion is preferred.

## 5. Introductory root landing exception: native-scroll storytelling

The introductory `/` uses bounded parallax, sliding curtains, a one-turn decorative Fitness ID preview, and a spinning/settling story wheel with staggered flying cards, controlled directly by native scroll position. These are not time-based delays before using the product: the first `/home` CTA is immediately available, and the practical home hub has no pinned storytelling scenes. Wheel/touch input is never intercepted, scrolling is never locked, and no continuous requestAnimationFrame loop is used. On-scroll text reveals stay within the 400ms budget. A visible pause control, system reduced motion, short-viewport/enlarged-text static flow, focus-safe curtains and a readable no-JavaScript baseline are required. Do not apply the spinning preview behavior to actual member cards or check-in QR credentials.

## 6. Interactive vector hero

The user-requested movement field is a decorative exception for the introductory hero only. Its orbit, gentle node drift and expanding breath use bounded CSS animations—not a continuous JavaScript frame loop or endless animation—and run only while the artwork intersects the viewport, the document is visible, landing motion is unpaused, and the layout is not static flow. Pointer movement and the native pulse button provide the ongoing interaction. The shared pause control, live reduced-motion preference, short/enlarged-text flow, pagehide and navigation stop/cancel both ambient and triggered motion. Without JavaScript or visibility observation, the original SVG remains static and usable discovery content stays available.

Pointer events are passive and schedule at most one geometry-read/write frame per input batch, with translation bounded to ±18px/±14px and tilt to ±5°. Touch movement is ignored so native scrolling remains authoritative; touch interaction uses the same native centre button as keyboard Enter/Space. Its immediate decorative ripple lasts 850ms, never blocks a CTA, and cannot stack with another ripple while one is running. No flashing, camera, sensors, tracking, canvas, WebGL, animation library, backend data or extra asset requests are involved. Decorative vectors are hidden from assistive technology; the real button has a descriptive label, a visible focus ring and a minimum 44px target.
