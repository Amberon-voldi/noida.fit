# Event Experience UX Specification — NOIDA.FIT

## 1. Event Vision: The Real-World Call to Action

The Event Detail page (`/event/[slug]`) is where online discovery converts into physical presence. 

Every pixel on this page must eliminate doubt and confusion:
- *Where exactly do I park or meet?* (e.g. *"Noida Stadium, Gate 4, near the tea stall"*).
- *What time does it actually start?* (e.g. *"Warmup at 5:45 AM, sharp start at 6:00 AM"*).
- *Is it okay if I'm a beginner?* (e.g. *"Yes, dedicated 7:00/km conversational group"*).
- *How much does it cost?* (e.g. *"100% Free community gathering"*).

---

## 2. Event Page Layout & Wireframe

```text
┌────────────────────────────────────────────────────────────────────────┐
│ BREADCRUMB: Home > Events > Saturday Sunrise Expressway Long Run       │
├────────────────────────────────────────────────────────────────────────┤
│ HERO & TITLE BLOCK                                                     │
│ Category Badge: [🏃 COMMUNITY RUN]  [FREE ATTENDANCE]  [SECTOR 137]   │
│ Title: Saturday Sunrise Expressway Long Run (10K & 16K)                │
│ Hosted by: [UPRUN Logo] UPRUN Noida Chapter • Verified Community       │
├────────────────────────────────────────────────────────────────────────┤
│ LEFT COLUMN: WORKOUT & GATHERING DETAILS (65%)                         │
│                                                                        │
│ 1. KEY TELEMETRY PILLBOX (Monospace athletic tags)                    │
│    ┌────────────────┬────────────────┬───────────────┬───────────────┐ │
│    │ 📅 DATE        │ ⏰ TIME        │ 📍 LOCATION   │ ⚡ PACE/LEVEL  │ │
│    │ Sat, Oct 14    │ 05:45 AM IST   │ Advant Navis  │ All Paces     │ │
│    └────────────────┴────────────────┴───────────────┴───────────────┘ │
│                                                                        │
│ 2. ABOUT THE GATHERING                                                 │
│    Detailed overview of the morning session: warmup, route description,│
│    hydration stops at 5K/10K marks, and post-run stretching.          │
│                                                                        │
│ 3. ROUTE & ELEVATION OVERVIEW                                          │
│    Out-and-back course along the Noida-Greater Noida Expressway        │
│    service road. Flat tarmac, minimal traffic before 7:30 AM.          │
│                                                                        │
│ 4. WHAT TO BRING & PREREQUISITES                                       │
│    • Water bottle or hydration vest                                    │
│    • Reflective gear or bright clothing (recommended for early dawn)  │
│    • Small cash/UPI for optional post-run chai                         │
│                                                                        │
│ 5. HOST / RUN CAPTAINS FOR THIS SESSION                               │
│    Card featuring Lead Captains with direct questions contact.        │
│                                                                        │
│ 6. WHO'S ATTENDING                                                     │
│    Attendee avatar stack (e.g. "34 people attending this Saturday").   │
├────────────────────────────────────────────────────────────────────────┤
│ RIGHT COLUMN: ACTION & LOCATION CARD (35% - Sticky on Desktop)         │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ RSVP / ATTENDANCE BOX                                              │ │
│ │ Price: FREE                                                        │ │
│ │ Date: Saturday, October 14, 2024                                   │ │
│ │ Time: 05:45 AM - 07:45 AM IST                                      │ │
│ │                                                                    │ │
│ │ [RSVP / I'M ATTENDING] (Opens confirmation modal + Calendar .ics)   │ │
│ │ [Save to Bookmarks]                                                │ │
│ │                                                                    │ │
│ │ [Share via WhatsApp]  [Copy Event Link]  [Instagram Share Sheet]   │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ EXACT MEETING LOCATION & MAP                                       │ │
│ │ Venue: Advant Navis Business Park, Gate 2 Service Road             │ │
│ │ Sector: Sector 142, Noida                                          │ │
│ │ [Interactive Map Pin / Directions Button]                          │ │
│ │ Parking: Free service road parking available before 7:00 AM        │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ MOBILE STICKY BOTTOM ACTION BAR (Viewport < 768px only)                │
│ [Sat, 5:45 AM • Free]                 [RSVP FOR EVENT BUTTON (Primary)]│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Interaction Patterns

### 1. The RSVP Action (V1 Flow)
- Since V1 does not require full authentication:
  - User taps **"RSVP / I'm Attending"**.
  - A clean modal asks for: First Name, Optional Email or WhatsApp number (for cancellation/rain alert).
  - On submit: Instant confirmation tick, 1-click **"Add to Google Calendar"** / **"Download .ics"** button, and direct link to join the morning WhatsApp coordination chat.

### 2. Social Sharing Mechanics
- **WhatsApp Share:** Formatted message:
  ```text
  🏃 Let's do this Saturday morning run in Noida!
  Saturday Sunrise Expressway Long Run (10K & 16K)
  📅 Sat, 5:45 AM | Sector 142, Advant Navis
  Hosted by UPRUN
  RSVP here: https://noida.fit/event/sunrise-expressway-long-run
  ```
- **Native Web Share API:** Utilizes `navigator.share()` on mobile devices for seamless Instagram DM and WhatsApp forwarding.
