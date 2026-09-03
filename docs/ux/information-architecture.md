# Information Architecture & Routing Specification — NOIDA.FIT

## 1. Route Map (V1 Scope)

The V1 information architecture is deliberately streamlined to maximize discovery velocity and ensure zero empty states. Every route serves a clear, practical purpose.

```text
/
├── discover                     # Unified multi-faceted discovery hub
├── communities                  # Directory of clubs and groups
│   └── [slug]                   # Dynamic community hub (e.g. /community/noida-runners-club)
├── events                       # City-wide fitness calendar & upcoming activities
│   └── [slug]                   # Dynamic event details (e.g. /event/sunrise-expressway-long-run)
├── places                       # Local fitness venues, stadiums & running trails
│   └── [slug]                   # Dynamic place details (e.g. /place/noida-stadium-sector-21a)
├── stories                      # Editorial guides, culture spotlights & interviews
│   └── [slug]                   # Dynamic story article (e.g. /story/5-weekend-running-routes-noida)
├── about                        # The NOIDA.FIT mission, ethos & local movement
├── for-organizers               # Community leader intake & listing information
└── search                       # Dedicated search results page (complements Cmd+K modal)
```

> [!NOTE]
> **Routes Intentionally Deferred to Phase 2+:**  
> Routes such as `/profile`, `/login`, `/signup`, `/dashboard`, `/admin`, and `/settings` are excluded from V1 to keep the initial launch focused purely on public discovery and community visibility.

---

## 2. Comprehensive Route Specification

| Route Path | Page Title / Purpose | Target Audience | Key Components | SEO Keyword Intent | Primary CTA | Secondary Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | **NOIDA.FIT Homepage**<br>The living hub of Noida fitness. | All active & aspiring Noida residents. | `Hero`, `FeaturedEvents`, `CommunityCarousel`, `ActivityPills`, `CityMapPreview`, `StoryGrid`. | *Fitness in Noida, Noida fitness communities, running clubs in Noida*. | **Explore Noida Fitness** | Find Your Community |
| `/discover` | **Discover Hub**<br>Unified filter interface. | Users looking for workouts by sector/date. | `SearchBar`, `FilterSidebar`, `CategoryPills`, `UnifiedGrid`, `EmptyState`. | *Fitness events this weekend Noida, workout groups Sector 137*. | **View Event / Community** | Reset Filters |
| `/communities` | **Community Directory**<br>All active clubs & groups. | Runners, cyclists, lifters seeking a group. | `CommunitySearchBar`, `CategoryFilters`, `CommunityCardGrid`. | *Running clubs Noida, cycling groups Noida, fitness groups Greater Noida*. | **Explore Community** | List Your Community |
| `/community/[slug]` | **Community Hub**<br>Home turf for a local club. | Potential members evaluating the vibe. | `CommunityHeader`, `WeeklyScheduleTable`, `LeaderCards`, `UpcomingEventsList`, `SocialsRow`. | *[Community Name] Noida, join [Community Name]*. | **Join Community** (WhatsApp/Insta) | View Events |
| `/events` | **Event Calendar**<br>Chronological upcoming list. | People planning their weekend mornings. | `DateFilterTabs`, `SectorDropdown`, `EventCardGrid`. | *Fitness events Noida, marathon training Noida, Sunday long run Noida*. | **RSVP for Event** | Share Event |
| `/event/[slug]` | **Event Details**<br>Specific workout gathering. | Attendees needing exact time and gate info. | `EventHero`, `KeyFactsPillbox`, `MapLocationCard`, `HostCard`, `StickyBottomBar`. | *[Event Name] Noida Stadium, fitness meetup [Date]*. | **RSVP / Attend** | Add to Calendar |
| `/places` | **Places Directory**<br>Tracks, parks, venues. | Athletes looking for public running tracks. | `PlaceFilters`, `PlaceCardGrid`. | *Running tracks in Noida, parks for running Noida, gym studios Noida*. | **Explore Place** | View Schedule |
| `/place/[slug]` | **Place Details**<br>Venue profile. | Attendees navigating to a specific park/venue. | `PlaceHero`, `FacilitiesGrid`, `MapEmbed`, `ActiveCommunitiesHere`. | *Noida Stadium Gate 4 running, Meghdootam Park workout*. | **Get Directions** | See Events Here |
| `/stories` | **Journal / Editorial**<br>Noida fitness culture. | Readers seeking inspiration and local guides. | `FeaturedStory`, `StoryCardGrid`. | *Best running routes Noida, Noida marathon stories*. | **Read Story** | Explore Communities |
| `/story/[slug]` | **Article Page**<br>Local story or route guide. | Readers sharing on WhatsApp/Instagram. | `ArticleHeader`, `MarkdownContent`, `RelatedEvents`, `AuthorCard`. | *Long-tail editorial search terms*. | **Join Related Community** | Share Article |
| `/about` | **About NOIDA.FIT**<br>Mission and philosophy. | Residents, organizers, brand partners. | `ManifestoBlock`, `PrincipleCards`, `CityStatGrid`. | *What is NOIDA.FIT, Noida sports movement*. | **Explore Noida Fitness** | Contact Team |
| `/for-organizers` | **For Organizers**<br>Community submission intake. | Run captains, coaches, club founders. | `BenefitsGrid`, `IntakeForm`, `FAQAccordion`. | *List fitness group Noida, promote running club*. | **Submit Community** | Reach Out on Instagram |

---

## 3. URL Conventions & Slug Structure

- **Kebab-Case Only:** All URLs must be lowercase, hyphen-separated (e.g. `/community/noida-runners-club`, `/event/sunrise-expressway-long-run`).
- **Semantic & Descriptive:** Slugs should contain the organization or event name and, where applicable, the landmark or sector (e.g. `/place/noida-stadium-sector-21a`).
- **Trailing Slash Policy:** Next.js default (no trailing slash) enforced consistently.
