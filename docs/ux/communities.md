# Community Experience UX Specification — NOIDA.FIT

## 1. The Role of Communities in NOIDA.FIT

Communities are the **atomic unit of human connection** on NOIDA.FIT.

A community is not a corporate brand; it is a living collective of people who show up at dawn, share the pavement, encourage each other up flyovers, and drink chai together afterwards.

The Community Hub (`/community/[slug]`) acts as the club's **official digital clubhouse**: an authoritative, beautiful home where newcomers can immediately understand the culture, meeting spots, pace groups, and weekly schedule without having to navigate messy WhatsApp group history.

---

## 2. Community Hub Layout & Wireframe

```text
┌────────────────────────────────────────────────────────────────────────┐
│ COVER BANNER: Wide panoramic photo of the community on home turf      │
│ [Verified Community Badge]                                             │
├────────────────────────────────────────────────────────────────────────┤
│ COMMUNITY MASTHEAD                                                     │
│ [Club Crest]  UPRUN (Noida Chapter)                                    │
│               Category: Running Club • Base: Sector 137 & Expressway   │
│               380+ Active Runners • Meets: Tue, Thu, Sat, Sun          │
│                                                                        │
│               [Join Community (WhatsApp / IG)]   [Share Profile]       │
├────────────────────────────────────────────────────────────────────────┤
│ TABBED NAVIGATION: [Overview] [Weekly Schedule] [Upcoming Events] [Crew]│
├────────────────────────────────────────────────────────────────────────┤
│ LEFT / MAIN COLUMN (65%):                                              │
│                                                                        │
│ 1. ABOUT THE COMMUNITY                                                 │
│    Who we are, our philosophy, pace groups (from 5:00/km to 7:30/km),  │
│    and what first-timers should expect on their first morning.         │
│                                                                        │
│ 2. WEEKLY RECURRING SCHEDULE                                           │
│    ┌──────────┬──────────┬───────────────────────┬───────────────────┐ │
│    │ Day      │ Time     │ Session Type          │ Location          │ │
│    ├──────────┼──────────┼───────────────────────┼───────────────────┤ │
│    │ Tuesday  │ 05:45 AM │ Track Intervals       │ Noida Stadium G4  │ │
│    │ Thursday │ 05:45 AM │ Tempo & Strides       │ Advant Service Rd │ │
│    │ Saturday │ 06:00 AM │ Weekend Long Run      │ Sector 137 Metro  │ │
│    │ Sunday   │ 06:30 AM │ Social Recovery + Chai│ Sector 104        │ │
│    └──────────┴──────────┴───────────────────────┴───────────────────┘ │
│                                                                        │
│ 3. UPCOMING SCHEDULED GATHERINGS                                       │
│    List/Grid of EventCards hosted specifically by this club.           │
│                                                                        │
│ 4. PHOTO GALLERY / THE VIBE                                            │
│    6-image mosaic of real members, finish lines, and morning coffee.   │
├────────────────────────────────────────────────────────────────────────┤
│ RIGHT / SIDEBAR COLUMN (35%):                                          │
│                                                                        │
│ 1. COMMUNITY CAPTAINS / LEADERSHIP                                     │
│    Avatar, name, role (e.g. "Run Captain"), short bio.                 │
│                                                                        │
│ 2. HOME TURF / PRIMARY VENUE                                           │
│    Mini-map preview of Noida Stadium / Sector 137 with directions.     │
│                                                                        │
│ 3. OFFICIAL CHANNELS & SOCIALS                                         │
│    [💬 Official WhatsApp Community]                                    │
│    [📸 Instagram @uprun.noida]                                         │
│    [⚡ Strava Club Page]                                               │
│                                                                        │
│ 4. COMMUNITY RULES & GUIDELINES                                        │
│    "No runner left behind", "Headlamps recommended for dawn starts".   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Components & Information Specs

### 1. Verification & Trust Badges
- **Verified Community:** Awarded to established, active clubs with verified captains and recurring sessions.
- **New Community:** For newly formed groups in emerging sectors (e.g. Greater Noida West).

### 2. The Recurring Schedule Table
One of the most requested features by real runners:
- Many groups do not create separate calendar invites for every single Tuesday track session; they have a permanent rhythm.
- The Weekly Recurring Schedule table makes this permanent rhythm crystal clear.

### 3. Frictionless "Join Community" CTA
- In V1, clicking *"Join Community"* opens a clean modal with direct external connection links:
  - Primary: Direct invite link to the club's WhatsApp Community / Group.
  - Secondary: Follow their verified Instagram page.
  - Tertiary: Join their Strava club.
- This immediately connects the user with real humans without requiring a long login/registration flow.

### 4. Pace & Level Inclusivity Matrix
Every community page must declare its welcoming policy:
- Beginners welcome? (Yes/No)
- Pace bands accommodated (e.g. *Walk-Run*, *6:30–7:00 min/km*, *Sub-5:00 min/km*).
- Gear required (e.g. running shoes, water bottle, helmet for cyclists).
