---
title: "NOIDA.FIT — Platform & MVP"
author: "NOIDA.FIT"
description: "Product explanation deck for the Noida fitness discovery and participation platform"
marp: true
theme: default
paginate: true
size: 16:9
---

# NOIDA.FIT

## Find your people. Show up. Move together.

**The city-first fitness discovery and participation platform for Noida & Greater Noida**

<div style="color:#9ddc2e; margin-top:2rem">Platform / Product / MVP explanation</div>

<!-- Speaker notes: Open with the core idea: Noida has fitness culture, but discovering and joining it is fragmented. -->

---

# The problem

## The activity exists. The information is fragmented.

- Running groups, rides, sports, parks, tracks, studios, and workouts are spread across social channels.
- Newcomers do not know **who** welcomes them, **where** to meet, or **what** to expect.
- Organizers repeat the same details across WhatsApp and Instagram.
- A digital “interested” is not the same as physically showing up.

> The missing layer is local coordination and confidence.

<!-- Speaker notes: Frame this as a discovery and participation problem, not a lack-of-fitness problem. -->

---

# The product answer

## NOIDA.FIT makes local fitness searchable, understandable, and actionable.

It answers five questions:

| Question | Product answer |
| --- | --- |
| **Who?** | Communities, organizers, captains |
| **What?** | Events, activities, sessions |
| **Where?** | Parks, tracks, courts, studios, sectors |
| **When?** | Dates, times, recurring schedules |
| **How?** | Save, follow, RSVP, join the organizer channel, show up |

<!-- Speaker notes: This five-question framework is the product’s information architecture. -->

---

# Positioning

## Community before workout

**NOIDA.FIT is:**

- A city-first discovery layer.
- A directory of active communities, events, and places.
- A bridge from online intent to offline participation.
- A privacy-conscious participation identity.

**NOIDA.FIT is not:**

- A Strava-style performance tracker.
- A generic gym directory.
- A closed fitness chain.
- A commercial ticketing marketplace.
- A follower-driven social network.

<!-- Speaker notes: The product wins by owning the civic gathering layer, not by copying existing fitness platforms. -->

---

# Who it serves

## Three sides of the local fitness ecosystem

### Participants
Find a first session, a regular group, or a place nearby.

### Organizers
Make a group discoverable, publish clear details, and verify attendance.

### Places & partners
Connect local venues and future sponsors to authentic community activity.

> The first priority is the participant ↔ organizer loop.

<!-- Speaker notes: Partners are an eventual expansion; do not let monetization lead the MVP. -->

---

# The core loop

## Discover → Commit → Show up → Remember

```text
PUBLIC DISCOVERY
Events · Communities · Activities · Places
              ↓
COMMITMENT
Save · Follow · RSVP · Calendar
              ↓
OFFLINE PARTICIPATION
Arrive at the time and place
              ↓
TRUSTED MEMORY
Organizer check-in → Fitness ID passport
```

**North star:** Weekly Active Participants (WAP)

<!-- Speaker notes: Every feature should strengthen this loop or improve the accuracy/density of local supply. -->

---

# What is in the current MVP?

## The smallest complete product

- Public homepage and unified discovery.
- Event, community, activity, and place directories.
- Search and URL-based filters.
- Account creation and sign-in.
- Saves and community follows.
- Event RSVP/cancel with capacity rules.
- Calendar/share actions.
- Private-by-default Fitness ID.
- Organizer-issued check-in QR/link.
- Private movement passport with verified records.
- Authorized organizer workspace.

> The MVP already goes beyond a static directory: it closes the loop on participation.

<!-- Speaker notes: Mention that the codebase currently contains these flows, while older roadmap documents describe some as future phases. -->

---

# MVP user journey

## From “I want to move” to “I showed up”

1. Land on `noida.fit` or `/discover`.
2. Search by activity, date, time, sector, price, or type.
3. Open an event and understand the practical details.
4. Create an account or sign in.
5. RSVP and optionally save/share/add to calendar.
6. Arrive at the organizer’s meeting point.
7. Scan the organizer’s signed check-in QR.
8. See the verified record on the private passport.

**The product’s proof of value is not a page view. It is a real arrival.**

<!-- Speaker notes: Keep this sequence concrete and easy to demo. -->

---

# Fitness ID

## A local participation identity

The Fitness ID answers:

- Who is this member?
- Are they public or private?
- What verified totals have they chosen to share?
- Which communities have they chosen to show?
- How can someone open their public profile?

It is a **member profile for NOIDA.FIT**, not a government ID, event ticket, entry pass, or organizer credential.

<!-- Speaker notes: Position the ID as identity and continuity, not as a gamified scorecard. -->

---

# Fitness ID: privacy by design

## The member controls the public footprint

New profiles start as:

```text
Profile visibility             PRIVATE
Show verified activity totals  OFF
Show followed communities      OFF
```

The member can control these independently.

### Public-safe fields can include

Name · username · city · bio · Fitness ID · member-since date · selected aggregate totals · selected communities

### Always private

Email · account ID · saves · RSVP history · detailed attendance history · private settings · tokens

<!-- Speaker notes: Emphasize that public profile DTOs intentionally exclude private records. -->

---

# Fitness ID: what counts?

## Truthful participation, not vanity metrics

```text
Page view           ≠ attendance
Save                ≠ attendance
Follow              ≠ attendance
RSVP                ≠ attendance
Organizer check-in  = verified participation
```

A verified record requires:

- A NOIDA.FIT account.
- A confirmed RSVP.
- A valid organizer-issued token/QR.
- A valid event window.

One member/event pair produces one attendance record.

<!-- Speaker notes: This distinction is central to trust. Do not present RSVP totals as attendance. -->

---

# Two QR codes, two jobs

## Keep profile sharing and event attendance separate

| Profile QR | Event check-in QR |
| --- | --- |
| Opens a public Fitness ID profile | Records attendance for one event |
| Generated for a public profile | Generated by an authorized organizer |
| For introductions and sharing | For a confirmed attendee at the meeting point |
| Not an entry pass | Not a public profile link |

> A profile QR is a link. An event QR is an attendance action.

<!-- Speaker notes: This is a key product-language rule for demos and design. -->

---

# Organizer value

## Make the work of local organizers lighter

Current organizer flow:

1. Organizer/admin signs in.
2. Opens assigned events.
3. Generates a short-lived signed QR/link in the event window.
4. Displays it at the meeting point.
5. Sees privacy-safe RSVP and checked-in counts.

Current boundary:

- Listing intake is email/review based.
- No self-serve publishing yet.
- No payments, bulk messaging, or automated weather alerts yet.

<!-- Speaker notes: Organizer trust and operational correctness are more important than a large admin feature set. -->

---

# Trust model

## Honest data creates a better local network

### Content trust

- Published content is server-managed.
- Demo listings are clearly labelled.
- Listing requests do not automatically become verified partnerships.
- Prices are informational; RSVP does not charge.

### Participation trust

- RSVP is a plan.
- Check-in is a defined attendance signal.
- Tokens are signed, time-limited, and event-specific.
- Public profile responses exclude private account/history fields.

> Do not claim “verified” unless the underlying authority and data support it.

<!-- Speaker notes: Trust is a feature. The product must be explicit about what it knows and what it does not. -->

---

# The product architecture

## Four connected layers

```text
DISCOVERY
Next.js public routes + Appwrite published content

IDENTITY
Appwrite authentication + private profile documents

PARTICIPATION
RSVP / save / follow / check-in records

MEMORY
Fitness ID + public-safe profile + private passport
```

Technical shape:

- Next.js 16 App Router / React 19.
- Server-rendered public discovery.
- Authenticated server mutations.
- Appwrite identity and persistence.
- Explicit DTO boundaries for privacy.
- HMAC-signed event check-in tokens.

<!-- Speaker notes: Keep architecture explanation at product level; the point is how trust and user value map to the system. -->

---

# How we measure success

## Optimize for participation, not attention

### North star

**Weekly Active Participants (WAP)**

### Supporting measures

- Discovery → action conversion.
- RSVP → check-in rate.
- Repeat participation rate.
- Sector coverage density.
- Community activation and freshness.
- Search/filter demand.
- Listing correction and trust signals.

### Guardrails

Avoid optimizing only for page views, passive time, follower counts, notification volume, or invented attendance.

<!-- Speaker notes: The implementation documents the metric taxonomy; a production analytics pipeline is still a launch-readiness task. -->

---

# Roadmap

## Build density before breadth

### Now

- Confirm and maintain real Noida listings.
- Make discovery fast and accurate.
- Validate RSVP → arrival → check-in.
- Improve Fitness ID clarity and privacy education.
- Add privacy-conscious funnel measurement.

### Next

- Self-serve organizer publishing and edits.
- Recurring event operations and waitlists.
- Corrections/support for attendance records.
- Consent-based reminders and organizer announcements.

### Later

- Crews and community graph.
- Meaningful milestones.
- Verified affiliations.
- Brand/community sponsorship marketplace.

<!-- Speaker notes: The next product problem is density, freshness, and trust—not more surface area. -->

---

# Product decision rule

## Does it help people show up?

Before adding a feature, ask:

> Does this help someone find a local activity, understand how to join, show up, or keep a truthful record of participation?

If not, it is probably not an MVP priority.

---

# NOIDA.FIT

## Find your people. Show up. Move together.

**Current product documentation:**

- `docs/product/noida-fit-product-explanation.md`
- `docs/product/noida-fit-mvp-scope.md`
- `README.md`

**Core user promise:**

> Find a session in Noida, know exactly where and when to go, meet people who are already showing up, and keep your participation on your terms.

<!-- Speaker notes: End by restating the offline outcome. -->
