# Content Seeding Specification & Demo Datasets — NOIDA.FIT

## 1. The Seeding Strategy

A community discovery platform cannot launch with an empty database or generic placeholder text (*"Lorem ipsum dolor sit amet"*). When the V1 site goes live or runs locally in development, it must feel populated, vibrant, and authentic to Noida.

### Principles of Realistic Seed Data
1. **Accurate Noida Geography:** All venues, metro exits, landmarks, and sectors must exist in real life.
2. **Realistic Timings & Cultural Context:** Morning runs start at 05:45 AM or 06:00 AM; evening workouts align with sunset and stadium lighting.
3. **Pace & Inclusivity Realism:** Realistic running paces (e.g., 5:15 to 7:00 min/km), realistic group sizes (15–60 people).
4. **Ethical Transparency:** All demo data is formatted for development and local testing. Never claim false commercial partnerships or sponsor affiliations.

---

## 2. Seed Dataset: Core Communities (6 Active Clubs)

```json
[
  {
    "id": "comm_01",
    "name": "UPRUN (Noida Chapter)",
    "slug": "uprun-noida",
    "category": "running",
    "tagline": "Paced street and expressway runs for all levels.",
    "description": "UPRUN is a community-first running crew active across Noida. We meet twice on weekdays for speedwork and every Saturday morning for our signature expressway long run. Pace groups range from conversational 7:00/km to sub-5:00/km.",
    "baseLocation": "Sector 137 & Expressway",
    "primaryVenueSlug": "advant-navis-corridor",
    "membersCount": 380,
    "verified": true,
    "featured": true,
    "meetingDays": ["Tuesday", "Thursday", "Saturday"],
    "captains": [
      {
        "name": "Rohan Verma",
        "role": "Lead Run Captain",
        "bio": "Marathoner, 5:30 pacer, tea enthusiast."
      }
    ],
    "socialLinks": {
      "whatsapp": "https://chat.whatsapp.com/demo-uprun",
      "instagram": "https://instagram.com/uprun.noida",
      "strava": "https://strava.com/clubs/uprun-noida"
    }
  },
  {
    "id": "comm_02",
    "name": "Noida Runners Club (NRC)",
    "slug": "noida-runners-club",
    "category": "running",
    "tagline": "The historic running community based at Noida Stadium.",
    "description": "Founded over a decade ago, NRC is the central pillar of running in central Noida. We host structured track interval workouts every Tuesday and Thursday at Noida Stadium Gate 4, plus weekend tempo runs.",
    "baseLocation": "Sector 21A (Noida Stadium)",
    "primaryVenueSlug": "noida-stadium-sector-21a",
    "membersCount": 620,
    "verified": true,
    "featured": true,
    "meetingDays": ["Tuesday", "Thursday", "Sunday"],
    "captains": [
      {
        "name": "Vikram Singh",
        "role": "Head Coach & Founder",
        "bio": "Veteran endurance runner and coach."
      }
    ],
    "socialLinks": {
      "whatsapp": "https://chat.whatsapp.com/demo-nrc",
      "instagram": "https://instagram.com/noidarunnersclub"
    }
  },
  {
    "id": "comm_03",
    "name": "Tri-City Cyclists Noida",
    "slug": "tri-city-cyclists",
    "category": "cycling",
    "tagline": "Road cyclists and weekend cruisers mastering the Expressway.",
    "description": "Connecting cyclists across Noida, Greater Noida, and East Delhi. Weekend pelotons down the Expressway service roads to Pari Chowk, with mid-week dawn hill repeats at Mayur Vihar flyover.",
    "baseLocation": "Sector 18 & Expressway",
    "primaryVenueSlug": "noida-expressway-loop",
    "membersCount": 290,
    "verified": true,
    "featured": true,
    "meetingDays": ["Wednesday", "Saturday", "Sunday"],
    "captains": [
      {
        "name": "Ananya Sharma",
        "role": "Ride Captain",
        "bio": "Brevet rider and bicycle commuter."
      }
    ],
    "socialLinks": {
      "instagram": "https://instagram.com/tricitycyclists.noida"
    }
  },
  {
    "id": "comm_04",
    "name": "Sector 50 Calisthenics & Strength",
    "slug": "sector-50-calisthenics",
    "category": "strength",
    "tagline": "Bodyweight movement, pull-up progressions, and outdoor circuits.",
    "description": "Open-air bodyweight training in the lush greenery of Meghdootam Park. We focus on natural strength, mobility, pull-up progressions, and functional endurance. All equipment provided.",
    "baseLocation": "Sector 50 (Meghdootam Park)",
    "primaryVenueSlug": "meghdootam-park-sector-50",
    "membersCount": 160,
    "verified": true,
    "featured": false,
    "meetingDays": ["Monday", "Wednesday", "Friday", "Sunday"],
    "captains": [
      {
        "name": "Karan Malhotra",
        "role": "Movement Coach",
        "bio": "Calisthenics coach and mobility specialist."
      }
    ],
    "socialLinks": {
      "whatsapp": "https://chat.whatsapp.com/demo-calisthenics"
    }
  },
  {
    "id": "comm_05",
    "name": "Advant Sunrise Striders",
    "slug": "advant-sunrise-striders",
    "category": "running",
    "tagline": "Corporate runners and early risers around Sector 137 / 142.",
    "description": "A casual, welcoming social running group for residents of Paras Tierea, Supertech Ecociti, and Gulshan Vivante. We do 5K and 8K dawn loops followed by coffee.",
    "baseLocation": "Sector 137 / 142",
    "primaryVenueSlug": "advant-navis-corridor",
    "membersCount": 210,
    "verified": false,
    "featured": false,
    "meetingDays": ["Wednesday", "Saturday"],
    "captains": [
      {
        "name": "Siddharth Goel",
        "role": "Community Coordinator",
        "bio": "Tech worker, 10K runner, early riser."
      }
    ],
    "socialLinks": {
      "whatsapp": "https://chat.whatsapp.com/demo-advant-striders"
    }
  },
  {
    "id": "comm_06",
    "name": "Greater Noida Shuttlers",
    "slug": "greater-noida-shuttlers",
    "category": "sports",
    "tagline": "Weekend and evening badminton community in Greater Noida.",
    "description": "Organized weekend doubles games and friendly ladders at City Park indoor complex. Open to intermediate and advanced recreational players.",
    "baseLocation": "Greater Noida (Pari Chowk / Alpha)",
    "primaryVenueSlug": "city-park-greater-noida",
    "membersCount": 140,
    "verified": true,
    "featured": false,
    "meetingDays": ["Saturday", "Sunday"],
    "captains": [
      {
        "name": "Pooja Bansal",
        "role": "Organizer",
        "bio": "Former state player and community organizer."
      }
    ],
    "socialLinks": {
      "whatsapp": "https://chat.whatsapp.com/demo-shuttlers"
    }
  }
]
```

---

## 3. Seed Dataset: Upcoming Events (10 Curated Gatherings)

```json
[
  {
    "id": "evt_01",
    "title": "Saturday Sunrise Expressway Long Run (10K / 16K)",
    "slug": "sunrise-expressway-long-run",
    "category": "running",
    "communitySlug": "uprun-noida",
    "communityName": "UPRUN (Noida Chapter)",
    "venueSlug": "advant-navis-corridor",
    "venueName": "Advant Navis Gate 2 Service Road",
    "sector": "Sector 142",
    "date": "2024-10-14",
    "startTime": "05:45 AM",
    "endTime": "07:30 AM",
    "price": "FREE",
    "distance": "10km / 16km",
    "pace": "5:30, 6:15, and 7:00 min/km pacer groups",
    "level": "All Levels Welcome",
    "description": "Our signature Saturday morning long run. Smooth tarmac out-and-back course along the expressway service road with turnaround points at 5K and 8K. Hydration station provided. Chai and stretching circle afterwards.",
    "featured": true,
    "attendeesCount": 38
  },
  {
    "id": "evt_02",
    "title": "Tuesday Morning Track Intervals: 800m Repeats",
    "slug": "tuesday-track-intervals-800m",
    "category": "running",
    "communitySlug": "noida-runners-club",
    "communityName": "Noida Runners Club",
    "venueSlug": "noida-stadium-sector-21a",
    "venueName": "Noida Stadium Synthetic Track (Gate 4)",
    "sector": "Sector 21A",
    "date": "2024-10-17",
    "startTime": "05:45 AM",
    "endTime": "07:00 AM",
    "price": "FREE",
    "distance": "6km total",
    "pace": "Speed workout tailored by coach",
    "level": "Intermediate",
    "description": "Structured interval training to build aerobic capacity: 15-min dynamic warmup, 5x800m with 2-min recovery jogs, and cooldown stretches.",
    "featured": true,
    "attendeesCount": 26
  },
  {
    "id": "evt_03",
    "title": "Expressway 45K Dawn Peloton Ride",
    "slug": "expressway-45k-dawn-peloton",
    "category": "cycling",
    "communitySlug": "tri-city-cyclists",
    "communityName": "Tri-City Cyclists Noida",
    "venueSlug": "noida-expressway-loop",
    "venueName": "Sector 18 Underpass to Pari Chowk",
    "sector": "Sector 18",
    "date": "2024-10-15",
    "startTime": "05:30 AM",
    "endTime": "07:45 AM",
    "price": "FREE",
    "distance": "45 km",
    "pace": "26–28 km/h rolling average",
    "level": "Road Bikes Only • Helmets Mandatory",
    "description": "Crisp morning group ride down the Expressway service corridor. Tight double paceline, rotating lead pulls. Regroup stop at Pari Chowk before return leg.",
    "featured": true,
    "attendeesCount": 19
  },
  {
    "id": "evt_04",
    "title": "Sunrise Calisthenics & Movement in the Park",
    "slug": "meghdootam-sunrise-calisthenics",
    "category": "strength",
    "communitySlug": "sector-50-calisthenics",
    "communityName": "Sector 50 Calisthenics",
    "venueSlug": "meghdootam-park-sector-50",
    "venueName": "Meghdootam Park Open Gym Lawn",
    "sector": "Sector 50",
    "date": "2024-10-15",
    "startTime": "06:30 AM",
    "endTime": "07:45 AM",
    "price": "FREE",
    "level": "Beginner to Advanced",
    "description": "Joint mobility, pull-up and dip mechanics, core conditioning, and handstand progressions on the grass.",
    "featured": false,
    "attendeesCount": 14
  },
  {
    "id": "evt_05",
    "title": "Wednesday Midweek 6K Social Shakeout",
    "slug": "wednesday-midweek-6k-shakeout",
    "category": "running",
    "communitySlug": "advant-sunrise-striders",
    "communityName": "Advant Sunrise Striders",
    "venueSlug": "advant-navis-corridor",
    "venueName": "Advant Navis Starbucks Plaza",
    "sector": "Sector 142",
    "date": "2024-10-18",
    "startTime": "06:00 AM",
    "endTime": "06:50 AM",
    "price": "FREE",
    "distance": "6 km",
    "pace": "Conversational 6:30 min/km",
    "level": "All Paces (Zero Drop)",
    "description": "Easy recovery miles through the quiet sector roads around Sector 137. Perfect for beginners and neighborhood commuters.",
    "featured": false,
    "attendeesCount": 22
  },
  {
    "id": "evt_06",
    "title": "Weekend Badminton Doubles Open Session",
    "slug": "weekend-badminton-doubles-city-park",
    "category": "sports",
    "communitySlug": "greater-noida-shuttlers",
    "communityName": "Greater Noida Shuttlers",
    "venueSlug": "city-park-greater-noida",
    "venueName": "City Park Indoor Sports Complex",
    "sector": "Greater Noida (Pari Chowk)",
    "date": "2024-10-14",
    "startTime": "07:00 AM",
    "endTime": "09:00 AM",
    "price": "₹150 (Court split)",
    "level": "Intermediate",
    "description": "Friendly rotating doubles games on wooden indoor courts. Non-marking shoes mandatory. Feather shuttles provided.",
    "featured": false,
    "attendeesCount": 12
  },
  {
    "id": "evt_07",
    "title": "Thursday Night Track Mile Challenge",
    "slug": "thursday-night-track-mile",
    "category": "running",
    "communitySlug": "noida-runners-club",
    "communityName": "Noida Runners Club",
    "venueSlug": "noida-stadium-sector-21a",
    "venueName": "Noida Stadium Track Under Floodlights",
    "sector": "Sector 21A",
    "date": "2024-10-19",
    "startTime": "07:15 PM",
    "endTime": "08:30 PM",
    "price": "FREE",
    "distance": "1600m timed heat",
    "level": "All Paces Welcome",
    "description": "Test your mile time under the stadium lights! Electronic timing clock, cheering squads, and music.",
    "featured": true,
    "attendeesCount": 35
  },
  {
    "id": "evt_08",
    "title": "Biodiversity Park 8K Trail Loop",
    "slug": "biodiversity-park-8k-trail-run",
    "category": "running",
    "communitySlug": "uprun-noida",
    "communityName": "UPRUN (Noida Chapter)",
    "venueSlug": "biodiversity-park-sector-91",
    "venueName": "Sector 91 Biodiversity Park Main Gate",
    "sector": "Sector 91",
    "date": "2024-10-21",
    "startTime": "06:00 AM",
    "endTime": "07:15 AM",
    "price": "FREE",
    "distance": "8 km",
    "pace": "6:15 min/km average",
    "level": "Unpaved Gravel & Mud Trail",
    "description": "Escape the concrete. Soft dirt trails winding through the forest belt of Sector 91.",
    "featured": false,
    "attendeesCount": 27
  },
  {
    "id": "evt_09",
    "title": "Sunday Mobility, Breathwork & Deep Stretch",
    "slug": "sunday-mobility-breathwork-lawn",
    "category": "wellness",
    "communitySlug": "sector-50-calisthenics",
    "communityName": "Sector 50 Calisthenics",
    "venueSlug": "meghdootam-park-sector-50",
    "venueName": "Meghdootam Park Amphitheatre Lawn",
    "sector": "Sector 50",
    "date": "2024-10-15",
    "startTime": "07:30 AM",
    "endTime": "08:45 AM",
    "price": "FREE",
    "level": "Open to All",
    "description": "Guided hip opening, thoracic spine mobility, and diaphragmatic breathwork designed specifically for runners and cyclists.",
    "featured": false,
    "attendeesCount": 18
  },
  {
    "id": "evt_10",
    "title": "Expressway 20K Steady Paced Run",
    "slug": "expressway-20k-steady-pace",
    "category": "running",
    "communitySlug": "uprun-noida",
    "communityName": "UPRUN (Noida Chapter)",
    "venueSlug": "advant-navis-corridor",
    "venueName": "Advant Navis Business Park",
    "sector": "Sector 142",
    "date": "2024-10-22",
    "startTime": "05:30 AM",
    "endTime": "07:45 AM",
    "price": "FREE",
    "distance": "20 km",
    "pace": "5:45 min/km steady",
    "level": "Half Marathon / Marathon Trainees",
    "description": "Endurance pacing block for runners targeting upcoming autumn half and full marathons.",
    "featured": false,
    "attendeesCount": 21
  }
]
```

---

## 4. Seed Dataset: Places & Venues (8 Iconic Turf Locations)

```json
[
  {
    "id": "place_01",
    "name": "Noida Stadium (Sector 21A)",
    "slug": "noida-stadium-sector-21a",
    "category": "Sports Complex",
    "sector": "Sector 21A",
    "address": "Sector 21A, Near Wave City Center Metro, Noida, UP 201301",
    "coordinates": { "lat": 28.591, "lng": 77.3402 },
    "amenities": ["400m Synthetic Track", "Floodlights", "Washrooms", "Parking Gate 4", "Drinking Water"],
    "description": "The premier athletic hub of Noida. Hosts daily morning running clubs, competitive track sprints, badminton, and outdoor fitness.",
    "activeCommunitiesCount": 4
  },
  {
    "id": "place_02",
    "name": "Advant Navis Expressway Corridor",
    "slug": "advant-navis-corridor",
    "category": "Road & Expressway",
    "sector": "Sector 142",
    "address": "Expressway Service Road, Sector 142, Noida, UP 201305",
    "coordinates": { "lat": 28.5028, "lng": 77.4116 },
    "amenities": ["Paved Service Road", "Streetlights", "Morning Cafes", "Ample Service Road Parking"],
    "description": "The gathering spot for South Noida runners and cyclists. Smooth, broad tarmac service roads running parallel to the Expressway.",
    "activeCommunitiesCount": 3
  },
  {
    "id": "place_03",
    "name": "Meghdootam Park (Sector 50)",
    "slug": "meghdootam-park-sector-50",
    "category": "Public Park",
    "sector": "Sector 50",
    "address": "Sector 50, Noida, UP 201301",
    "coordinates": { "lat": 28.5701, "lng": 77.368 },
    "amenities": ["Walking Track", "Calisthenics Bars", "Dense Greenery", "Amphitheatre Lawn"],
    "description": "A tranquil green oasis in central Noida. Features shaded perimeter running trails, calisthenics bars, and open yoga lawns.",
    "activeCommunitiesCount": 2
  },
  {
    "id": "place_04",
    "name": "Biodiversity Park (Sector 91)",
    "slug": "biodiversity-park-sector-91",
    "category": "Nature Trail & Park",
    "sector": "Sector 91",
    "address": "Sector 91, Near Expressway, Noida, UP 201304",
    "coordinates": { "lat": 28.514, "lng": 77.391 },
    "amenities": ["Dirt Running Trails", "Lake View", "Fresh Air", "Parking Available"],
    "description": "Over 75 acres of native trees, water bodies, and soft unpaved trails ideal for low-impact recovery runs and nature walks.",
    "activeCommunitiesCount": 2
  },
  {
    "id": "place_05",
    "name": "City Park (Greater Noida)",
    "slug": "city-park-greater-noida",
    "category": "Sports Complex & Park",
    "sector": "Greater Noida",
    "address": "Near Alpha 1 Commercial Belt, Greater Noida, UP 201310",
    "coordinates": { "lat": 28.472, "lng": 77.5101 },
    "amenities": ["Indoor Badminton Arena", "Perimeter Jogging Track", "Open Grounds", "Parking"],
    "description": "The recreational center of Greater Noida, featuring indoor wooden badminton courts, skating rink, and running paths.",
    "activeCommunitiesCount": 2
  },
  {
    "id": "place_06",
    "name": "Okhla Bird Sanctuary Trail",
    "slug": "okhla-bird-sanctuary-trail",
    "category": "Nature Corridor",
    "sector": "Sector 95",
    "address": "Noida-Delhi Border, Sector 95, Noida, UP 201301",
    "coordinates": { "lat": 28.5615, "lng": 77.317 },
    "amenities": ["Riverfront Trail", "Yamuna Views", "Bird Watching", "Entry Gate Parking"],
    "description": "A scenic scenic running and cycling route bordering the Yamuna River and wetland reserve.",
    "activeCommunitiesCount": 1
  },
  {
    "id": "place_07",
    "name": "Dribble Academy Courts (Sector 128)",
    "slug": "dribble-academy-courts",
    "category": "Basketball & Turf",
    "sector": "Sector 128",
    "address": "Jaypee Greens Wish Town, Sector 128, Noida, UP 201304",
    "coordinates": { "lat": 28.528, "lng": 77.378 },
    "amenities": ["Outdoor Basketball Courts", "Floodlights", "Community Coaching"],
    "description": "High-energy grassroots basketball courts hosting youth programs and open community pickup runs.",
    "activeCommunitiesCount": 1
  },
  {
    "id": "place_08",
    "name": "The Fit Box (Sector 104)",
    "slug": "the-fit-box-sector-104",
    "category": "Boutique Studio",
    "sector": "Sector 104",
    "address": "Hazipur Market, Sector 104, Noida, UP 201304",
    "coordinates": { "lat": 28.539, "lng": 77.362 },
    "amenities": ["Functional Rigs", "Rowers", "Kettlebells", "Air Conditioning"],
    "description": "Independent boutique functional fitness studio offering community strength circuits and mobility classes.",
    "activeCommunitiesCount": 1
  }
]
```
