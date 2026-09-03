# Place & Venue UX Specification — NOIDA.FIT

## 1. The Place Concept

A **Place** on NOIDA.FIT is any physical location where people gather to train, run, play, or recover.

Unlike generic business listing websites (which list contact numbers for thousands of inactive commercial businesses), NOIDA.FIT focuses on **active athletic turf**:
- **Public & Civic Infrastructure:** Noida Stadium (Sector 21A), City Park (Greater Noida), Meghdootam Park (Sector 50), Biodiversity Park (Sector 91).
- **Iconic Running & Cycling Corridors:** Noida-Greater Noida Expressway service lanes, Okhla Bird Sanctuary loop.
- **Grassroots Sports Arenas & Turf Grounds:** Dribble Academy courts, local turf grounds, badminton arenas.
- **Boutique Community Studios:** Independent functional fitness boxes, pilates studios, and yoga shalas.

---

## 2. Place Detail Layout & Wireframe (`/place/[slug]`)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ COVER: High-res photograph of the track, turf, or facility             │
├────────────────────────────────────────────────────────────────────────┤
│ VENUE MASTHEAD                                                         │
│ Title: Noida Stadium (Sector 21A)                                      │
│ Category: [Public Sports Complex]  [Synthetic 400m Track]              │
│ Address: Sector 21A, Near Spice Mall / Wave City Center, Noida         │
│ Coordinates: 28.5910° N, 77.3402° E                                    │
│ [Get Directions (Google Maps)]       [Share Venue]                     │
├────────────────────────────────────────────────────────────────────────┤
│ LEFT COLUMN (65%):                                                     │
│                                                                        │
│ 1. ABOUT THIS VENUE                                                    │
│    The historic home of Noida athletics. Features an 8-lane 400m       │
│    synthetic running track, cricket stadium, squash courts, badminton  │
│    hall, and outdoor calisthenics pull-up bars.                        │
│                                                                        │
│ 2. FACILITIES & AMENITIES CHECKLIST                                    │
│    ✓ 400m Synthetic Track           ✓ Floodlights (Until 9:00 PM)      │
│    ✓ Public Washrooms               ✓ Filtered Drinking Water Station  │
│    ✓ Calisthenics / Pull-up Bars    ✓ Dedicated Parking (Gate 4)       │
│    ✓ Morning Chai & Coconut Water                                      │
│                                                                        │
│ 3. ENTRY & TIMINGS                                                     │
│    • Morning Public Hours: 05:00 AM – 09:30 AM (Free public access)    │
│    • Evening Hours: 04:30 PM – 08:30 PM                                │
│    • Track Footwear Policy: Proper running shoes; no spikes or cleats  │
│                                                                        │
│ 4. COMMUNITIES THAT TRAIN HERE                                         │
│    Cards for clubs based here:                                         │
│    • Noida Runners Club (Meets Tue & Thu at Gate 4)                    │
│    • Stadium Sprint Crew (Meets Mon, Wed, Fri at 6:00 AM)              │
│                                                                        │
│ 5. UPCOMING EVENTS AT THIS VENUE                                       │
│    Grid of upcoming workouts scheduled here over the next 14 days.     │
├────────────────────────────────────────────────────────────────────────┤
│ RIGHT COLUMN (35%):                                                    │
│                                                                        │
│ 1. INTERACTIVE MAP PREVIEW & GATE LOCATIONS                            │
│    Interactive map with key entry gates labeled:                       │
│    • Gate 4: Dedicated running track entrance & parking.               │
│    • Gate 1: Main administrative & cricket pavilion entrance.          │
│                                                                        │
│ 2. NEARBY METRO & TRANSIT ACCESS                                       │
│    • Nearest Metro: Noida Sector 16 (Blue Line) - 1.8km                │
│    • Auto/E-rickshaws available from metro station exit.               │
│                                                                        │
│ 3. POST-WORKOUT COFFEE & CHAI SPOTS NEARBY                             │
│    Local recommendations for where runners grab breakfast nearby.      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. V1 Implementation Scope

In V1, Places serve to contextualize **where communities meet**.
- Every Place page displays direct bidirectional relationships:
  - Place -> Lists all communities that train there.
  - Place -> Lists all upcoming events scheduled at that venue.
- Map integration in V1 uses lightweight interactive maps or direct external links to Google Maps navigation (`https://maps.google.com/?q=...`).
