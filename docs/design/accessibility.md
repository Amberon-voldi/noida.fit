# Accessibility Specification (WCAG 2.1 AA) — NOIDA.FIT

## 1. Compliance Standard

NOIDA.FIT is committed to universal civic access. All user interfaces must adhere strictly to the **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA** standard.

Fitness is for everyone. Accessibility is not an afterthought or a compliance chore; it is an engineering baseline.

---

## 2. Core Accessibility Mandates

### 1. Semantic HTML Over Generic Divs
- Never use a `<div onClick={...}>` when a native `<button>` or `<a>` is appropriate.
- Use native structural landmarks:
  - `<header>` for navigation and mastheads.
  - `<nav>` for primary and secondary navigation menus.
  - `<main>` for primary page content (only one per page).
  - `<article>` for `EventCard`, `CommunityCard`, and editorial posts.
  - `<footer>` for site footer.
  - `<section>` with `aria-labelledby` for distinct thematic page segments.

### 2. Heading Hierarchy
- Every page must have exactly one `<h1>`.
- Headings must descend sequentially (`<h1>` -> `<h2>` -> `<h3>` -> `<h4>`) without skipping levels (e.g. do not jump from `<h2>` directly to `<h4>`).

### 3. Keyboard Navigation & Focus Rings
Every interactive control must be operable entirely via keyboard:
- **Tab Key:** Moves focus sequentially through interactive elements.
- **Enter / Space:** Activates buttons, toggles, and links.
- **Escape Key:** Dismisses open modals, drawers, and dropdown menus.
- **Visible Focus Indicator:**
  - Never set `outline: none` without providing a high-contrast alternative.
  - Default focus ring: `focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background`.

### 4. Accessible Color Contrast Ratios
- **Normal Text (< 18pt / 24px):** Minimum contrast ratio of **4.5:1** against the background.
- **Large Text (≥ 18pt / 24px):** Minimum contrast ratio of **3:1**.
- **UI Components & Graphical Objects:** Minimum contrast ratio of **3:1** against adjacent background.
- All tokens in [Color System](file:///Users/mac/Development/repos/noida.fit/docs/brand/color-system.md) exceed these minimums (pure white `#F8FAFC` on `--bg-base` `#090A0F` yields a ratio of **18.2:1**).

### 5. Screen-Reader Labels & ARIA Discipline
- **Rule of ARIA:** *No ARIA is better than bad ARIA.* Rely on native HTML5 semantics first.
- **Icon-Only Buttons:** Any button lacking visible text (such as the search magnifying glass, close `X`, or mobile hamburger icon) **MUST** include an explicit `aria-label`:
  ```tsx
  <button aria-label="Close search modal" onClick={close}>
    <XIcon aria-hidden="true" />
  </button>
  ```
- **Decorative Images & Icons:** Icons used purely for decoration must have `aria-hidden="true"`.

### 6. Accessible Forms
- Every form input must be programmatically associated with a visible `<label>` using `htmlFor` matching the input `id`.
- If an input has an error, mark it with `aria-invalid="true"` and associate the error description using `aria-describedby="error-id"`.

### 7. Meaningful Image Alt Text
- Do not use redundant text like *"Image of a runner"*.
- Describe the context and geography:
  - **Good:** `alt="Group of runners stretching together at sunrise on the Noida Stadium track"`
  - **Bad:** `alt="running photo"`
- If an image is purely decorative background texture, provide `alt=""`.
