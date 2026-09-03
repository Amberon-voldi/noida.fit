# Editorial Specification & Journal Guidelines — NOIDA.FIT

## 1. Editorial Vision: The Local Sports Magazine

NOIDA.FIT operates as a hybrid: **50% utility platform, 50% cultural publication**.

The editorial section (`/stories` and `/story/[slug]`) provides the cultural narrative that brings the directory to life. When an athlete reads an authentic profile of a run crew, they are 10x more likely to show up to that crew's Tuesday morning workout.

Editorial content drives:
- **Long-term organic SEO:** High-intent local search queries (*"running groups in Noida"*, *"best cycling routes Noida"*).
- **Social virality:** High-shareability on WhatsApp and Instagram Stories.
- **Organizer pride:** Communities actively share articles featuring their members and captains.

---

## 2. Article Structure & Frontmatter Schema

Articles are authored in standard Markdown with structured YAML frontmatter:

```markdown
---
title: "5 Running Groups in Noida You Can Join This Weekend"
slug: "5-running-groups-noida-weekend"
excerpt: "From sunrise track sprints at Noida Stadium to Sunday long runs along the Expressway, here is where Noida runs."
publishedAt: "2024-10-10"
author:
  name: "Noida.fit Editorial"
  avatar: "/images/authors/editorial.jpg"
category: "Community Guides"
readTime: "5 min read"
coverImage: "/images/stories/noida-running-crews.jpg"
featured: true
relatedCommunities: ["uprun-noida", "noida-runners-club"]
relatedEvents: ["sunrise-expressway-long-run"]
---

# Article body content in clean, semantic Markdown...
```

---

## 3. Article Content Archetypes

### Archetype 1: The Community Spotlight
- **Focus:** One specific local club or crew.
- **Tone:** Celebratory, documentary, grounded.
- **Standard Outline:**
  1. *The Origin Story:* Why the founders started meeting at 5:45 AM.
  2. *The Home Turf:* Why they chose their specific park, track, or street corner.
  3. *The Pace Spectrum:* How they accommodate sub-5:00 min/km racers and first-time run-walkers.
  4. *The Ritual:* What happens after the run (chai stall, breakfast, stretching).
  5. *How to Join:* Explicit instructions on showing up next week, complete with embedded `CommunityCard`.

### Archetype 2: The Route & Trail Guide
- **Focus:** A specific running or cycling course in Noida/Greater Noida.
- **Required Metadata:**
  - Distance (km)
  - Surface type (Tarmac, Clay track, Synthetic, Trail)
  - Safety & Lighting conditions (Streetlights, early morning traffic)
  - Water & Hydration points
  - Parking & Metro accessibility
- **Interactive Component:** Route map elevation profile and starting gate pin.

### Archetype 3: The Weekend Playbook
- **Published:** Every Thursday at 10:00 AM IST.
- **Structure:** Curated schedule breakdown:
  - *Friday Evening:* Track workouts or social shakeouts.
  - *Saturday Morning:* Long runs and tempo sessions.
  - *Sunday Morning:* Group rides, trail runs, and post-workout community breakfasts.
- **Embedded Components:** Live `EventCard` embeds for 1-click RSVPs directly inside the article.

---

## 4. Editorial Review Checklist

Before any article is published on NOIDA.FIT, it must pass this 5-point quality gate:
1. [ ] **Real Local Grounding:** Does the article mention specific Noida sectors, landmarks, or streets?
2. [ ] **No Cliché Corporate Jargon:** Is the article free of terms like "transformation journey" and "unlock your potential"?
3. [ ] **Actionable Takeaway:** Can a reader immediately join an event or community after finishing the article?
4. [ ] **Accurate Details:** Are meeting times, gate numbers, and organizer contacts verified?
5. [ ] **Mobile Reading Polish:** Are paragraphs concise (2–4 sentences max) with descriptive subheadings for easy mobile scanning?
