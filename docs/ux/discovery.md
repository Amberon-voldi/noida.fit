# Discovery Experience UX Specification — NOIDA.FIT

## 1. Discovery Architecture

The Discovery engine at `/discover` is the functional core of NOIDA.FIT. Its singular goal is to help any person in Noida find an activity, community, or venue that fits their schedule, location, and interest in **under 30 seconds**.

---

## 2. Default State (Before User Applies Filters)

When a user lands on `/discover`:
1. **Context Header:**
   - Title: **"Discover Noida Fitness"**
   - Active Counter: *"Showing 24 upcoming activities & 12 communities across Noida"*
2. **Top Filter Strip:**
   - Horizontal activity pills (*All*, *Running*, *Cycling*, *Strength*, *Badminton*, *Yoga*, *Outdoor*).
   - Date quick-toggles (*All Dates*, *Today*, *This Weekend*, *Next Week*).
3. **Default Sorting Order:**
   - **Chronological First:** Gatherings occurring soonest (Today -> Tomorrow -> Weekend) appear at the top.
   - **Featured Priority:** Verified weekly community sessions appear with an *"Every Saturday"* recurring indicator.
4. **View Toggle:**
   - Switch between **"Upcoming Events"** view, **"Active Communities"** view, and **"Places & Tracks"** view.

---

## 3. Filter Matrix & Criteria

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Search activities, sectors, clubs...]           [Sector: All Noida ▼] │
├────────────────────────────────────────────────────────────────────────┤
│ Type: [● All] [Events] [Communities] [Places]                          │
│ Date: [All] [Today] [Tomorrow] [This Weekend]                          │
│ Time: [Any Time] [Early Morning (5-8 AM)] [Evening (5-9 PM)]           │
│ Cost: [All] [Free Only] [Paid]                                         │
│ Sector: [Sector 21A] [Sector 137] [Expressway] [Greater Noida]         │
└────────────────────────────────────────────────────────────────────────┘
```

### Filter Dimensions
1. **Activity Category:**
   - `running` (Road runs, track intervals, long runs, trail).
   - `cycling` (Pace peloton, weekend expressway rides, casual cruisers).
   - `strength` (Outdoor bootcamps, calisthenics, functional circuits).
   - `sports` (Badminton, tennis, football, pickleball).
   - `wellness` (Yoga, breathwork, mobility, recovery).
2. **Timing / Window:**
   - *Early Morning (05:00 AM – 08:30 AM)* — represents ~70% of outdoor sessions.
   - *Evening (05:00 PM – 09:30 PM)* — track workouts, stadium lights, indoor gyms.
   - *Daytime (08:30 AM – 05:00 PM)* — workshops and weekend clinics.
3. **Cost Filter:**
   - *Free Community Sessions* (Zero barrier, show up and move).
   - *Paid / Ticketed* (Coached masterclasses, special workshops).
4. **Geographic Sectors:**
   - *Central Noida:* Sectors 15, 18, 21A (Stadium), 25, 34, 50.
   - *Expressway Corridor:* Sectors 93A, 104, 128, 137, 142, Advant Navis.
   - *Greater Noida West:* Gaur City, TechZone.
   - *Greater Noida Central:* Pari Chowk, Alpha, Delta, City Park.

---

## 4. Search & Keyword Filtering

The search bar accepts natural text queries and matches against:
- Event title (e.g. *"Sunrise Long Run"*)
- Community name (e.g. *"UPRUN"*, *"Noida Runners Club"*)
- Sector / landmark (e.g. *"Sector 21A"*, *"Noida Stadium"*, *"Advant"*)
- Activity type (e.g. *"track workout"*, *"cycling"*)

Search executes instantly via client-side indexing in V1, with debounce (`150ms`) to ensure zero typing lag.

---

## 5. Sorting Rules

Users can sort results by:
1. **Date: Soonest First (Default):** Ensures real-world timeliness.
2. **Popularity:** Sorted by attendee count / RSVP volume.
3. **Recently Added:** For frequent members discovering newly scheduled sessions.

---

## 6. Empty State Handling

When filters yield zero matching results:
- Never show a blank screen.
- Render the `EmptyState` component:
  - Visual: Minimalist icon (running shoe or calendar).
  - Headline: *"No fitness gatherings found matching your filters."*
  - Helpful suggestions:
    - *"Try selecting 'All Sectors' or broadening your date range."*
    - *"Many Noida communities meet early on Saturday and Sunday mornings."*
  - Primary Action Button: **"Reset All Filters"** (restores default view).
  - Secondary Action Button: **"Explore Featured Communities Instead"**.

---

## 7. Mobile UX Specifications

- On viewports `< 768px`, filters collapse into a sticky top bar with an active filter badge (e.g. *"Filters (2)"*).
- Tapping opens a bottom slide-up drawer with large touch-friendly toggle pills.
- "Apply Filters" button floating at the bottom with real-time result count (*"Show 8 Activities"*).
