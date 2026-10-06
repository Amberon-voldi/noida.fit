# NOIDA.FIT — MVP Scope & Feature Map

> A concise scope document for product planning, demos, stakeholder reviews, and engineering decisions.

## 1. MVP promise

> **Help a person in Noida find a real fitness session, make a plan, show up, and keep a privacy-controlled record of participation.**

The MVP is not trying to be every fitness product. It owns the local discovery-to-participation loop.

```text
Discover a local option
        ↓
Understand the session
        ↓
Save / follow / RSVP
        ↓
Show up at the place and time
        ↓
Organizer verifies attendance
        ↓
Fitness ID records participation
```

## 2. MVP acceptance criteria

The MVP is meaningful when all of the following are true:

- A visitor can browse the public directory without signing in.
- A visitor can filter by activity, date/time, sector, price, and content type.
- An event page makes the first visit understandable: what, when, where, host, access, and practical notes.
- A member can create an account and gets a private Fitness ID by default.
- A member can save an event, community, or place.
- A member can follow a community.
- A member can RSVP to an event with capacity and timing rules.
- A member can show a short-lived participant check-in QR, including with a private profile.
- An authorized club/venue operator scans that QR for an assigned event during the event window; the participant needs a confirmed RSVP.
- A successful check-in creates one verified participation record.
- The member can see the private participation passport and truthful totals.
- The member can choose whether their profile, activity totals, and followed communities are public.
- Public views never expose email, account IDs, RSVP history, saved items, or detailed private history.
- Demo content is visibly labelled and never presented as a confirmed real-world booking.

## 3. MVP modules

### Module A — Public discovery

**Routes:** `/`, `/discover`, `/search`, `/activities`, `/events`, `/communities`, `/places`

**Purpose:** make local fitness supply searchable and legible.

**Included:**

- Published events, communities, activities, and places.
- URL-driven search and filtering.
- Activity, type, sector, date, time, and price filters.
- Responsive cards and detail links.
- SEO metadata and structured discovery pages.
- Mobile-first navigation and shareable URLs.

**Not included:**

- Personalized algorithmic feed.
- GPS tracking or performance dashboards.
- Generic scraped business listings.

### Module B — Event commitment

**Routes:** `/event/[slug]`, `/api/participation/rsvp`

**Purpose:** convert discovery into a concrete plan.

**Included:**

- Event details, practical notes, host, place, date/time, and sector.
- Save event.
- RSVP and cancel RSVP.
- Capacity-aware seat allocation.
- Start-time/cancellation rules.
- Calendar export and share actions.
- Account view of upcoming plans.

**Important semantics:**

- RSVP means “I plan to attend.”
- RSVP does not prove attendance.
- RSVP does not charge payment or reserve paid inventory.
- A full event rejects new reservations rather than silently overbooking.

### Module C — Community relationship

**Routes:** `/communities`, `/community/[slug]`, `/api/participation/follow`

**Purpose:** help a person find a repeatable local rhythm.

**Included:**

- Community profile and recurring schedule.
- Meeting geography and associated events/places.
- Captains/organizer information where available.
- Follow and unfollow.
- Save community.
- Organizer-controlled external links where present.

**Important semantics:**

- Follow is a private preference in NOIDA.FIT.
- Follow is not verified offline membership.
- There is no native community chat or self-serve membership workflow in the current MVP.

### Module D — Account and plans

**Routes:** `/signup`, `/login`, `/account`

**Purpose:** give participants a secure place to manage intent and identity.

**Included:**

- Appwrite email/password authentication.
- Upcoming confirmed RSVPs.
- Saved items across events, communities, and places.
- Followed communities.
- Next confirmed plan.
- Profile and privacy settings.
- Organizer tools when the account is authorized.

**Not included:**

- Public feed.
- Direct messages.
- Social follower graph.
- Automated paid memberships.

### Module E — Fitness ID

**Routes:** `/fitness-id`, `/@username`, legacy `/fitness-id/[slug]`

**Purpose:** create an identity for local participation without turning the product into a performance leaderboard.

**Included:**

- Random Fitness ID number, separate from the Appwrite account ID.
- Display name, username, city, member-since date, and optional bio/avatar.
- Front/back member card interaction.
- Private-by-default visibility.
- Separate controls for public profile, activity totals, and followed communities.
- Public profile route for members who opt in.
- Profile QR only for public profiles.
- Public-safe DTO boundary.

**What the Fitness ID is not:**

- Government ID.
- Event ticket.
- Gym membership card.
- Organizer authorization.
- Entry pass.
- Proof of attendance by itself.

### Module F — Movement passport

**Location:** `/account` and the private Fitness ID experience.

**Purpose:** give participation a truthful memory.

**Included:**

- Private dated participation records.
- Verification status labels.
- Verified activity totals.
- Events attended count.
- Community-follow count/relationship summary where applicable.
- Week-streak calculation based on valid verified records.
- Empty state that clearly says RSVP/save does not create attendance.

**Data rule:**

```text
Only organizer-verified check-ins count as verified activity.
```

The passport does not invent achievements, turn RSVPs into attendance, or publish detailed locations by default.

### Module G — Organizer check-in

**Routes:** `/organizer`, `/check-in`, `/api/check-in/pass`, `/api/check-in/organizer` (legacy `/api/check-in` self-check-in is retired)

**Purpose:** provide a small, trustworthy bridge from a gathering to a participation record.

**Included:**

- Organizer/admin authorization.
- Assigned-event view.
- RSVP and checked-in counts.
- Privacy-safe attendee list.
- Participant shows a signed 15-minute check-in QR; club/venue operator selects an assigned event and scans it.
- Native camera detection with a lazily loaded on-device QR decoder fallback; paste-code fallback.
- Private profiles can check in without enabling public sharing.
- Active participant account/Fitness ID, confirmed RSVP and event-window enforcement.
- Duplicate-safe check-in.
- Participation repair on retry.

**Not included:**

- Self-serve event publishing.
- Bulk messaging.
- Payments.
- Automated weather alerts.
- Full roster exports.
- Open-ended organizer permissions.

## 4. Privacy state matrix

| State | Member sees | Stranger sees |
| --- | --- | --- |
| New account | Private Fitness ID, private plans, private passport | Nothing public |
| Private profile | Full own profile and history | No public profile |
| Public profile, sharing off | Full own data | Public identity fields only; no activity/community details |
| Public profile + activity on | Full own data | Aggregate verified totals selected by member |
| Public profile + communities on | Full own data | Selected followed communities and count |
| Public profile + both on | Full own data | Public-safe identity, aggregate totals, and selected communities |
| Any state | RSVP/save/follow/check-in records | Never exposed as private history through public profile |

## 5. State semantics

### Discovery

- Published → visible.
- Unpublished/cancelled → not available for new participation actions.
- Demo → visible for product demonstration but clearly labelled and not a real-world confirmation.

### RSVP

- No RSVP → action available if authenticated and event is open.
- Confirmed → event appears in plans and attendee may check in.
- Cancelled/deleted → no longer an active plan.
- Event started → new RSVP blocked.
- Event full → new RSVP blocked.

### Check-in

- Participant QR not yet valid → reject.
- Expired participant QR → reject new attendance.
- Operator not assigned to selected event → reject before resolving participant.
- Public-profile QR or retired event token → reject.
- No confirmed RSVP → reject.
- Valid attendee and event window → record once.
- Existing check-in → do not duplicate; repair derived participation if needed.

### Fitness ID

- Private by default.
- Public profile can be enabled explicitly.
- Activity and followed communities are independently shareable.
- Private profile has no public QR.
- Public profile QR opens a profile only; it is not event check-in.
- Private or public members can show a separate signed participant check-in QR at `/check-in`; it is never included in public profile output.

## 6. MVP data relationships

```text
Activity
   ├── Community
   ├── Event ────── Place
   │      │
   │      ├── RSVP ───── User/Profile
   │      ├── Check-in ─ User/Profile
   │      └── Participation record
   │
   ├── Saved item ─── User/Profile
   └── Follow ─────── User/Profile
```

## 7. Product boundaries for demos

Use these statements in demos and stakeholder conversations:

- “This is a discovery and participation product, not a performance tracker.”
- “The Fitness ID is private by default.”
- “A confirmed RSVP is a plan, not proof of attendance.”
- “Attendance totals come from organizer-verified check-ins.”
- “The profile QR opens a public profile; the organizer QR verifies an event check-in.”
- “Demo listings are examples of how the product works, not confirmed live sessions.”
- “Current listing intake is reviewed by email; self-serve organizer publishing is future work.”
- “Prices shown in listings are informational; the MVP does not take payment.”

## 8. Launch-readiness checklist

### Content

- [ ] Replace fictional/demo listings with organizer-confirmed records.
- [ ] Establish venue permissions, meeting-point accuracy, and access notes.
- [ ] Define content freshness and correction ownership.
- [ ] Add a reliable organizer verification policy.

### Product

- [ ] Observe first-time discovery and RSVP tasks with real local participants.
- [ ] Test the Fitness ID explanation and QR distinction.
- [ ] Validate check-in flow under real morning/event conditions.
- [ ] Confirm public/private expectations with users.

### Operations

- [ ] Define response SLA for listing corrections.
- [ ] Define how organizer access is granted and removed.
- [ ] Add support path for incorrect attendance records.
- [ ] Configure email verification/password recovery before broader onboarding.

### Measurement

- [ ] Implement privacy-conscious event analytics.
- [ ] Measure discovery → action → RSVP → check-in.
- [ ] Track repeat participation, not only traffic.
- [ ] Monitor sector and activity coverage density.

### Infrastructure

- [ ] Set production `NEXT_PUBLIC_SITE_URL`.
- [ ] Persist and protect `APPWRITE_CHECKIN_SECRET`.
- [ ] Use least-privilege Appwrite credentials.
- [ ] Verify deployment, auth, redirects, and Appwrite connectivity in staging.

## 9. MVP decision rule

Before adding a feature, ask:

> Does this help a person find a local activity, understand how to join, show up, or keep a truthful record of participation?

If the answer is no, the feature is probably outside the MVP.
