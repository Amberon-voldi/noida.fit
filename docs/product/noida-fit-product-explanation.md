# NOIDA.FIT — Platform & Product Explanation

> **Find your people. Show up. Move together.**
>
> This is the plain-language product brief for founders, teammates, organizers, partners, and anyone evaluating the current NOIDA.FIT build.

---

## 1. Executive summary

**NOIDA.FIT is a city-first fitness discovery and participation platform for Noida and Greater Noida.** It helps a person answer five practical questions:

1. **Who** is moving together?
2. **What** activity or session is happening?
3. **Where** does it happen?
4. **When** does it happen?
5. **How** can I join or show up?

The product starts with public discovery and ends with an offline action: a person finds a suitable event, community, or place; saves or follows it; RSVPs; arrives; and, when the organizer verifies attendance, records that participation on their privacy-controlled **Fitness ID**.

NOIDA.FIT is deliberately not a performance-tracking app, a generic gym directory, or a closed fitness chain. Its job is to make local fitness culture easier to discover and easier to participate in.

### The product in one sentence

> **NOIDA.FIT is the searchable, trusted front door to the fitness communities, sessions, and places of Noida.**

### The current implementation in one sentence

> Users can discover published events, communities, activities, and places; create an account; save items; follow communities; RSVP to events; check in with an organizer QR; and manage a private-by-default Fitness ID and participation passport.

---

## 2. The problem

Noida has runners, cyclists, strength groups, sports communities, parks, stadiums, studios, and recurring meetups. The supply exists, but the information is fragmented:

- Event announcements live in Instagram stories, WhatsApp groups, and scattered posts.
- New residents do not know which group welcomes beginners or where a session actually starts.
- A person may know the activity they want but not the right sector, time, venue, or organizer.
- Organizers repeatedly answer the same questions about meeting points, pace, equipment, and access.
- Existing fitness products often focus on individual performance, paid classes, or static business listings.
- Showing interest digitally is not the same as actually participating physically.

The key gap is not another workout plan. It is **local coordination and confidence**:

> “I want to move this week. Where are my people, and can I confidently show up?”

---

## 3. Product goal and aim

### Primary goal

Reduce the distance between **online intent** and **offline participation** for fitness in Noida and Greater Noida.

### What success looks like

A person should be able to:

1. Discover a relevant local option quickly.
2. Understand the time, sector, meeting point, host, cost, and expectations.
3. Decide whether the activity is right for them.
4. Commit through a save, follow, or RSVP.
5. Show up in the real world.
6. Receive a trustworthy participation record when attendance is verified.

### What the product optimizes for

- **Participation over page views.**
- **Local density over geographic breadth.**
- **Clarity over feature count.**
- **Community over vanity metrics.**
- **Real-world trust over unverified claims.**
- **Fast mobile discovery over prolonged screen time.**

### North-star metric

**Weekly Active Participants (WAP)**: people who use NOIDA.FIT to discover or commit to an activity and physically participate in a local gathering during the week.

WAP is a product definition and measurement direction. The current repository documents the metric taxonomy; a full production analytics pipeline is a separate launch-readiness task.

---

## 4. Positioning: what NOIDA.FIT is and is not

| NOIDA.FIT is | NOIDA.FIT is not |
| --- | --- |
| A city-first discovery layer for local fitness | A Strava-style GPS, pace, or performance tracker |
| A directory of active communities, events, activities, and places | A dead list of gyms or phone numbers |
| A bridge from discovery to physical participation | A closed corporate gym membership ecosystem |
| A lightweight participation and attendance layer | A BookMyShow-style ticketing marketplace |
| A privacy-conscious local identity for participation | A follower-driven social network or public leaderboard |
| Infrastructure for independent organizers | A replacement for the organizer’s community, WhatsApp, or external channel |

### Competitive distinction

- **Strava asks:** “How did you perform?”
- **Cult.fit asks:** “Which class in our ecosystem will you book?”
- **BookMyShow asks:** “Which commercial ticket will you buy?”
- **WhatsApp asks:** “Can you find the right group message?”
- **NOIDA.FIT asks:** “What is happening near you, who is hosting it, and how can you show up?”

---

## 5. Who the product serves

### 5.1 Participants and newcomers

People who live, work, study, or spend time in Noida and Greater Noida and want to:

- Find a running club or cycling crew.
- Join a sports or strength group.
- Discover outdoor workouts, mobility, yoga, or wellness sessions.
- Find a park, track, venue, or studio where activity already happens.
- Attend without needing a private referral first.
- Keep a trustworthy personal record of verified participation.

### 5.2 Community leaders and organizers

Run captains, coaches, studio owners, and independent organizers who need to:

- Make their group discoverable.
- Publish a clear schedule and meeting point.
- Reduce repeated “where/when/how?” messages.
- Coordinate RSVPs for a session.
- Verify attendance at the meeting point.
- Build trust without losing ownership of their community.

### 5.3 Local ecosystem partners

Places, cafes, sports venues, recovery businesses, and future brands that want to support authentic local fitness culture. This is a future commercial opportunity, not the current MVP’s primary job.

---

## 6. The product model: four layers

NOIDA.FIT can be understood as four connected product layers:

```text
DISCOVER  →  COMMIT  →  SHOW UP  →  REMEMBER
   │            │          │            │
Find local   Save/follow  RSVP + QR    Fitness ID +
options      and plan     attendance   private passport
```

### Layer 1 — Discover

The public web experience makes local activity searchable:

- Events and sessions.
- Communities and clubs.
- Activities and categories.
- Places, tracks, parks, venues, and studios.
- Search and URL-based filters by activity, sector, date, time, price, and type.

### Layer 2 — Commit

A signed-in member can turn interest into a plan:

- Save an event, community, or place.
- Follow a community.
- RSVP to an event.
- Add an event to a calendar through the event flow.
- Return to the account to see upcoming plans.

### Layer 3 — Show up

Attendance is not inferred from a page view, save, or RSVP. An authorized organizer creates a short-lived signed check-in QR/link. A confirmed attendee checks in during the event window.

### Layer 4 — Remember

The successful check-in produces a verified participation record. The member’s Fitness ID can show carefully selected aggregate facts, while the detailed movement passport remains private.

---

## 7. Current MVP: what is built today

The current codebase is more advanced than the original early roadmap documents. The following is the practical MVP boundary based on the running implementation.

### MVP capability map

| Capability | Current state | User value |
| --- | --- | --- |
| Public homepage | Implemented | Establishes the local fitness hub and routes people into discovery |
| Unified discovery | Implemented | Search and filter events, communities, activities, and places |
| Event directory and detail pages | Implemented | Gives a concrete session with time, place, host, and participation actions |
| Community directory and pages | Implemented | Helps people evaluate a group’s rhythm, location, and external channels |
| Places directory and pages | Implemented | Connects venues and local geography to activity |
| Activity directory | Implemented | Organizes broad categories without sport-specific overbuilding |
| Email/password authentication | Implemented | Gives members an account-backed identity and private workspace |
| Saves | Implemented | Lets people keep events, communities, and places for later |
| Community follows | Implemented | Lets members keep track of communities they care about |
| Event RSVP/cancel | Implemented | Creates a confirmed plan with capacity and timing rules |
| Calendar export/share actions | Implemented in event flow | Helps turn intent into a real plan |
| Fitness ID | Implemented | Gives the member a local participation identity |
| Public profile controls | Implemented | Lets members choose whether and what to share |
| Organizer check-in | Implemented for authorized organizers | Creates a trusted attendance signal |
| Participation passport | Implemented privately | Shows the member’s recorded history and verification status |
| Organizer workspace | Implemented for assigned organizers/admins | Generates check-in codes and shows privacy-safe event attendance |
| Self-serve listing management | Not implemented | Organizer intake remains email/review based |
| Payments/ticketing | Not implemented | Listed prices are informational; RSVP does not charge |
| GPS/performance tracking | Not implemented by design | Keeps the product focused on community discovery |
| Native Strava/Health integrations | Not active | Integration boundaries are documented, not presented as live capability |
| Editorial story detail pages | Partial | `/stories` exists; full story detail publishing is not the current core flow |

### The smallest complete MVP loop

```text
Open noida.fit
  → Search/filter for a session
  → Read the event details
  → Sign in or create an account
  → RSVP
  → Arrive at the meeting point
  → Scan organizer’s check-in QR
  → See verified participation on the private passport
```

This loop is the product’s proof of value. Everything else should strengthen this path or make the local directory more useful.

---

## 8. Fitness ID: the identity layer of the MVP

### 8.1 What it is

The **Fitness ID** is a member-facing identity card and profile for participation in the NOIDA.FIT community. It is designed to answer:

- Who is this member?
- Are they sharing a public profile or keeping it private?
- What verified participation totals have they chosen to show?
- Which communities have they chosen to share?
- How can another person open their public profile?

It is not an official government ID, admission pass, event ticket, or proof of identity outside NOIDA.FIT.

### 8.2 Why it matters

Most fitness identity is fragmented across:

- GPS files and performance apps.
- Gym memberships.
- WhatsApp groups.
- Instagram posts.
- Personal memory.

The Fitness ID provides a local, community-oriented identity that values **showing up with people** rather than only recording isolated metrics.

### 8.3 What the member receives

The current Fitness ID includes:

- A generated NOIDA.FIT Fitness ID number.
- Display name and username/handle.
- City/region.
- Member-since date.
- Optional bio and avatar fields.
- Public/private profile state.
- Optional aggregate verified activity totals.
- Optional followed-community display.
- A QR code on the public card back that opens the public profile.
- A private movement passport with dated participation records.

### 8.4 Privacy defaults

New profiles are private by default:

```text
Profile visibility: Private
Show activity totals: Off
Show followed communities: Off
```

The member must explicitly make the profile public. Activity and community sharing are separate controls, so a member can choose a narrower public footprint.

### 8.5 Public profile boundary

A public profile may expose:

- Display name.
- Username/handle.
- City.
- Bio, if provided.
- Fitness ID number.
- Member-since date.
- Aggregate verified activity totals, if enabled.
- Followed communities and count, if enabled.

It does **not** expose:

- Email address.
- Appwrite account ID.
- Saved items.
- RSVP history.
- Detailed attendance history.
- Private settings.
- Provider tokens or credentials.

### 8.6 What counts as verified activity

Only organizer-verified attendance records count toward the verified totals and streak logic.

```text
Page view          ≠ attendance
Save               ≠ attendance
Follow             ≠ attendance
RSVP               ≠ attendance
Organizer check-in = verified participation record
```

A check-in requires:

1. A NOIDA.FIT account.
2. A confirmed RSVP.
3. A valid organizer-issued signed token/QR.
4. A check-in within the event window.

The system prevents duplicate attendance records for the same event/member pair and can repair an incomplete derived participation record on retry.

### 8.7 Two QR concepts — keep them separate

| QR | Purpose | Who creates it | Meaning |
| --- | --- | --- | --- |
| Profile QR | Opens a public member profile | Generated for a public Fitness ID | “View this member’s public profile” |
| Event check-in QR | Records attendance for one event | Authorized organizer/admin | “Verify my attendance at this event” |

The profile QR is not an entry ticket or attendance pass. The event check-in QR is not a public profile link.

---

## 9. Feature explanations

### 9.1 Discovery

The discovery layer is the public acquisition and utility surface. A person does not need an account to browse.

**Inputs:** activity, type, sector, date, time of day, price, and text intent.

**Outputs:** relevant published events, communities, activities, and places.

**Principle:** show enough local context to make a first visit feel possible: start time, meeting point, sector, host, level, price, distance/pace where available, and what to bring.

### 9.2 Events

An event is a specific gathering with:

- Title and activity.
- Date, start/end time, and IST display.
- Venue, sector, and meeting details.
- Hosting community/organizer.
- Description and practical notes.
- Capacity and RSVP state.
- Save, share, calendar, directions, and RSVP/cancel actions.

RSVP is a commitment record, not proof of attendance. Event prices are informational only in the current product; there is no payment or inventory checkout.

### 9.3 Communities

A community is a recurring local group or organizer-led culture. A community page can include:

- Name, category, location, and description.
- Meeting days and recurring schedule.
- Captains or leaders where available.
- Associated venue and upcoming sessions.
- External channels when provided.
- Follow, save, and share actions.

Current “follow” is a NOIDA.FIT preference. It is not the same as verified offline membership or a native in-app chat/community membership.

### 9.4 Places

Places create the geographic layer of the platform:

- Parks, tracks, stadiums, trails, courts, and studios.
- Sector/address and coordinates.
- Activities, amenities, hours, access, parking, and cost notes where known.
- Associated events and communities.

The product should prioritize active places connected to real sessions over a generic business directory.

### 9.5 Account

The account is the member’s private operating space:

- Fitness ID and privacy controls.
- Next confirmed plan.
- Upcoming RSVPs.
- Saved items.
- Followed communities.
- Private movement passport.
- Connected-service availability information.
- Sign out and account settings.

The account is intentionally not a public social feed.

### 9.6 Organizer workspace

Authorized organizers/admins can:

- View assigned events.
- See confirmed RSVP counts.
- Generate a time-limited event check-in QR/link during the event window.
- See a privacy-safe attendee list with display names and attendance state.

The workspace does not currently provide self-serve event publishing, content editing, payments, or broad messaging.

---

## 10. Core user journeys

### Journey A — New participant finds a first session

```text
Instagram/WhatsApp/direct link
  → noida.fit or /discover
  → Filter “running”, “this weekend”, and a sector
  → Open event
  → Read time, gate/meeting point, host, level, and what to bring
  → Sign up / sign in
  → RSVP
  → Add to calendar or share
  → Show up
```

### Journey B — Participant finds a regular community

```text
/communities
  → Filter or search by activity/location
  → Open community page
  → Review schedule, place, vibe, and external links
  → Follow/save the community
  → Open an upcoming session or organizer channel
```

### Journey C — Member builds a verified Fitness ID

```text
Create account
  → Private Fitness ID is created
  → RSVP to an event
  → Attend the event
  → Organizer displays check-in QR
  → Member checks in with confirmed RSVP
  → Verified participation record is created
  → Private passport and aggregate totals update
  → Member may later choose public visibility and sharing controls
```

### Journey D — Organizer verifies the room

```text
Authorized organizer signs in
  → /organizer
  → Select assigned event
  → Generate signed QR during allowed window
  → Attendees scan/use /check-in
  → System validates token, event, RSVP, and time window
  → Attendance is recorded once
```

---

## 11. Trust, safety, and honesty model

NOIDA.FIT has two trust boundaries:

### Content trust

- Published content is managed server-side.
- Organizers currently submit listings by email for review.
- Demo listings are explicitly labelled and must not be treated as confirmed gatherings, partnerships, travel advice, payment inventory, or verified attendance.
- There is no claim that every community, venue, or schedule is verified unless the product explicitly says so.

### Participation trust

- RSVP is a plan.
- Check-in is an attendance signal under a defined condition.
- Only organizer-verified records affect attendance totals.
- Signed check-in tokens expire and are limited to the event window.
- Organizer access is limited to assigned events or admin access.
- Public DTOs exclude private account and history data.

### Product language rule

Do not use “verified” to describe a member, community, venue, or activity unless the data and authority support it. A visual badge must never imply identity verification, payment, access entitlement, or attendance if it only represents a profile state.

---

## 12. Technical product architecture

```text
Next.js 16 App Router / React 19
            │
            ├── Public server-rendered routes
            │     ├── Homepage
            │     ├── Discovery/search
            │     ├── Events/communities/places/activities
            │     └── About/organizer information
            │
            ├── Authenticated routes
            │     ├── Account
            │     ├── Fitness ID
            │     ├── Public profile
            │     ├── Organizer workspace
            │     └── Attendee check-in
            │
            ├── Server APIs
            │     ├── Auth
            │     ├── Profile and public profile
            │     ├── RSVP
            │     ├── Save/follow
            │     └── Organizer/attendee check-in
            │
            └── Appwrite
                  ├── Auth identity
                  ├── Published directory collections
                  ├── Private profile documents
                  ├── RSVP/save/follow records
                  ├── Check-ins
                  └── Derived participation records
```

### Core domain entities

- **Activity:** broad category such as running, cycling, strength, sports, wellness, or outdoor.
- **Community:** recurring group or organizer-led culture.
- **Event:** one scheduled gathering.
- **Place:** physical location.
- **Profile:** private member settings and public-share controls.
- **Fitness ID:** stable public-facing member identity identifier.
- **RSVP:** confirmed intent to attend an event.
- **Saved item:** private bookmark for an event, place, or community.
- **Membership/follow:** private relationship to a community.
- **Check-in:** organizer-authorized attendance record.
- **Participation:** derived history record with status and source.

### Implementation principles

- Server-rendered public discovery by default.
- Authenticated mutations derive ownership from the session.
- No browser-side device-only RSVP state.
- Explicit DTO field selection prevents private fields leaking to public views.
- Atomic/unique document creation protects RSVP seat allocation and duplicate participation.
- Rate limiting, same-origin checks, bounded inputs, and signed check-in tokens protect mutation paths.

---

## 13. Product metrics

### North star

**Weekly Active Participants (WAP)**

### Supporting metrics

| Metric | What it tells us |
| --- | --- |
| Discovery-to-action conversion | Whether pages lead to saves, follows, RSVPs, or organizer-channel clicks |
| RSVP-to-check-in rate | Whether digital commitment becomes physical participation |
| Repeat participation rate | Whether people find a sustainable local rhythm |
| Sector coverage density | Whether Noida coverage is becoming useful rather than thin |
| Community activation | Whether listed groups receive meaningful discovery and joins |
| Event freshness/accuracy | Whether published schedules stay useful and trustworthy |
| Search/filter demand | What activities, sectors, times, and gaps people are asking for |

### Guardrail metrics

Do not optimize only for:

- Raw page views.
- Infinite browsing time.
- Follower count.
- Notification volume.
- Unverified “members” or “attendance” numbers.

The product should help people close the app and go outside.

---

## 14. Roadmap

### Now — make the local loop reliable

- Keep discovery dense and accurate across Noida.
- Replace demo records with organizer-confirmed listings.
- Improve event freshness, corrections, and listing operations.
- Validate the RSVP → arrival → check-in experience with real users.
- Instrument privacy-conscious funnel metrics.
- Clarify public profile/QR/check-in language.
- Test the Fitness ID with participants and organizers, not only screenshots.

### Next — organizer and participation operations

- Self-serve organizer onboarding and publishing review.
- Recurring event creation and edits.
- Better roster, waitlist, and cancellation operations.
- Organizer announcements for weather or venue changes.
- Corrections/support flow for attendance records.
- Optional reminders and notifications with explicit consent.

### Later — network effects

- Crews for small training groups.
- Richer community graph across people, events, and places.
- Meaningful milestone/badge system with explicit rules.
- Verified community affiliations where the organizer controls the relationship.
- Brand partnerships and sponsorships that support, rather than distort, local communities.

### Explicitly not the current MVP

- GPS route tracking, pace splits, heart-rate telemetry, or leaderboards.
- Payment checkout or paid inventory management.
- A closed gym/class subscription product.
- Public detailed attendance histories by default.
- Algorithmic social feed or follower competition.
- Unofficial scraping of Cult.fit, FITPASS, Strava, or other services.
- A claim that demo records represent live confirmed sessions.

---

## 15. Current gaps and documentation notes

The repository contains older planning documents written for an earlier phased roadmap. The current build has already implemented parts of those later phases, including saves, follows, RSVPs, organizer check-in, and Fitness ID. When there is a conflict:

1. Treat the running implementation and root `README.md` as the source of current behavior.
2. Treat older UX/roadmap documents as intent or historical planning unless confirmed in code.
3. Treat the documents in this product explanation as a current, human-readable product summary.

Important current boundaries:

- Seed content is demo/fictional and not suitable for travel or payment decisions.
- Listing submission is email-based; self-serve organizer publishing is not live.
- RSVP does not charge money or reserve paid inventory.
- Stories are not the core MVP loop; `/stories` is currently limited compared with the original information architecture.
- External community links remain organizer-controlled; NOIDA.FIT does not provide native community chat.
- Strava, Apple Health, Cult.fit, and FITPASS integrations are not active user-facing capabilities.
- WAP and funnel metrics are defined, but a full production analytics implementation remains a separate task.

---

## 16. Product vocabulary

| Term | Meaning |
| --- | --- |
| **Participant** | A person who uses NOIDA.FIT to find/commit to a local activity and physically takes part |
| **Community** | A recurring local group or organizer-led fitness culture |
| **Event** | One scheduled gathering at a defined time and place |
| **Place** | A track, park, venue, court, route, or studio connected to activity |
| **RSVP** | A confirmed plan to attend; not proof of attendance |
| **Follow** | A private NOIDA.FIT relationship to a community; not offline membership |
| **Save** | A private bookmark for later |
| **Check-in** | A signed, organizer-authorized attendance action during the event window |
| **Verified participation** | A participation record derived from an accepted organizer check-in |
| **Fitness ID** | A privacy-controlled member identity/profile for NOIDA.FIT participation |
| **Movement passport** | The member’s private chronological participation history |
| **Public profile** | The subset of Fitness ID fields a member explicitly chooses to expose |

---

## 17. The final product test

A product decision is probably aligned if it makes this sentence easier to complete honestly:

> “I found a session in Noida, I know exactly where and when to go, I know who is hosting it, I felt comfortable showing up, and my participation was recorded on my terms.”

If a feature adds screen time, vanity, or complexity without improving that sentence, it is probably not a priority.
