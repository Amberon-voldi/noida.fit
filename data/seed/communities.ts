import type { Community } from "@/types/community";

export const communities: Community[] = [
  {
    id: "comm_01",
    name: "UPRUN Noida",
    slug: "uprun-noida",
    category: "running",
    tagline: "Paced street and expressway runs for all levels.",
    description:
      "UPRUN is a community-first running crew active across Noida. We meet twice on weekdays for speedwork and every Saturday morning for our signature expressway long run. Pace groups range from conversational 7:00/km to sub-5:00/km. No one gets left behind — every pacer waits at each checkpoint.",
    baseLocation: "Sector 137 & Expressway",
    primaryVenueSlug: "advant-navis-corridor",
    membersCount: 380,
    verified: true,
    featured: true,
    meetingDays: ["Tuesday", "Thursday", "Saturday"],
    captains: [
      {
        name: "Rohan Verma",
        role: "Lead Run Captain",
        bio: "Marathoner, 5:30 pacer, tea enthusiast. Running Noida's expressways since 2019.",
      },
      {
        name: "Priya Nair",
        role: "Women's Run Lead",
        bio: "Half-marathon PB: 1:52. Safety and inclusivity advocate.",
      },
    ],
    schedule: [
      { day: "Tuesday", time: "05:45 AM", sessionType: "Track Intervals", venueName: "Advant Navis Service Rd" },
      { day: "Thursday", time: "05:45 AM", sessionType: "Tempo & Strides", venueName: "Expressway Corridor" },
      { day: "Saturday", time: "06:00 AM", sessionType: "Weekend Long Run", venueName: "Advant Navis Gate 2" },
    ],
    socialLinks: {
      instagram: "https://instagram.com/uprun.noida",
      strava: "https://strava.com/clubs/uprun-noida",
    },
  },
  {
    id: "comm_02",
    name: "Noida Runners Club",
    slug: "noida-runners-club",
    category: "running",
    tagline: "The historic running community based at Noida Stadium.",
    description:
      "Founded over a decade ago, NRC is the central pillar of running in central Noida. We host structured track interval workouts every Tuesday and Thursday at Noida Stadium Gate 4, plus weekend tempo runs. Coaches volunteer their time every session — truly a city treasure.",
    baseLocation: "Sector 21A (Noida Stadium)",
    primaryVenueSlug: "noida-stadium-sector-21a",
    membersCount: 620,
    verified: true,
    featured: true,
    meetingDays: ["Tuesday", "Thursday", "Sunday"],
    captains: [
      {
        name: "Vikram Singh",
        role: "Head Coach & Founder",
        bio: "Veteran endurance runner, 3x Delhi Marathon finisher, and volunteer coach since 2011.",
      },
    ],
    schedule: [
      { day: "Tuesday", time: "05:45 AM", sessionType: "Track Intervals", venueName: "Noida Stadium Gate 4" },
      { day: "Thursday", time: "05:45 AM", sessionType: "Tempo Run", venueName: "Noida Stadium Gate 4" },
      { day: "Sunday", time: "06:00 AM", sessionType: "Long Run + Chai", venueName: "Noida Stadium Lawn" },
    ],
    socialLinks: {
      instagram: "https://instagram.com/noidarunnersclub",
    },
  },
  {
    id: "comm_03",
    name: "Tri-City Cyclists",
    slug: "tri-city-cyclists",
    category: "cycling",
    tagline: "Road cyclists and weekend cruisers mastering the Expressway.",
    description:
      "Connecting cyclists across Noida, Greater Noida, and East Delhi. Weekend pelotons down the Expressway service roads to Pari Chowk, with mid-week dawn hill repeats. All bikes welcome — road, hybrid, and MTB riders roll together.",
    baseLocation: "Sector 18 & Expressway",
    primaryVenueSlug: "noida-expressway-loop",
    membersCount: 290,
    verified: true,
    featured: true,
    meetingDays: ["Wednesday", "Saturday", "Sunday"],
    captains: [
      {
        name: "Ananya Sharma",
        role: "Ride Captain",
        bio: "Brevet rider, 1200km Randonneur, and daily bicycle commuter.",
      },
    ],
    schedule: [
      { day: "Wednesday", time: "05:30 AM", sessionType: "Dawn Pace Ride", venueName: "Sector 18 Flyover" },
      { day: "Saturday", time: "05:30 AM", sessionType: "Expressway Peloton", venueName: "Sector 18 Underpass" },
      { day: "Sunday", time: "06:00 AM", sessionType: "Social Cruise Ride", venueName: "Sector 18 Underpass" },
    ],
    socialLinks: {
      instagram: "https://instagram.com/tricitycyclists.noida",
    },
  },
  {
    id: "comm_04",
    name: "Sector 50 Calisthenics",
    slug: "sector-50-calisthenics",
    category: "strength",
    tagline: "Bodyweight movement, pull-up progressions, and outdoor circuits.",
    description:
      "Open-air bodyweight training in the lush greenery of Meghdootam Park. We focus on natural strength, mobility, pull-up progressions, and functional endurance. All equipment provided. From first pull-up to muscle-up — all levels welcome.",
    baseLocation: "Sector 50 (Meghdootam Park)",
    primaryVenueSlug: "meghdootam-park-sector-50",
    membersCount: 160,
    verified: true,
    featured: false,
    meetingDays: ["Monday", "Wednesday", "Friday", "Sunday"],
    captains: [
      {
        name: "Karan Malhotra",
        role: "Movement Coach",
        bio: "Calisthenics coach and mobility specialist. 6 years of outdoor training.",
      },
    ],
    schedule: [
      { day: "Monday", time: "06:30 AM", sessionType: "Strength & Conditioning", venueName: "Meghdootam Park Open Gym" },
      { day: "Wednesday", time: "06:30 AM", sessionType: "Pull-up Progressions", venueName: "Meghdootam Park Open Gym" },
      { day: "Friday", time: "06:30 AM", sessionType: "Core & Mobility", venueName: "Meghdootam Park Open Gym" },
      { day: "Sunday", time: "07:30 AM", sessionType: "Breathwork & Recovery", venueName: "Meghdootam Park Amphitheatre" },
    ],
    socialLinks: {},
  },
  {
    id: "comm_05",
    name: "Advant Sunrise Striders",
    slug: "advant-sunrise-striders",
    category: "running",
    tagline: "Corporate runners and early risers around Sector 137–142.",
    description:
      "A casual, welcoming social running group for residents of Paras Tierea, Supertech Ecociti, and Gulshan Vivante. We do 5K and 8K dawn loops followed by coffee. Zero pressure, all encouragement.",
    baseLocation: "Sector 137 / 142",
    primaryVenueSlug: "advant-navis-corridor",
    membersCount: 210,
    verified: false,
    featured: false,
    meetingDays: ["Wednesday", "Saturday"],
    captains: [
      {
        name: "Siddharth Goel",
        role: "Community Coordinator",
        bio: "Tech worker, 10K runner, early riser.",
      },
    ],
    schedule: [
      { day: "Wednesday", time: "06:00 AM", sessionType: "Midweek 6K Shakeout", venueName: "Advant Navis Starbucks Plaza" },
      { day: "Saturday", time: "06:15 AM", sessionType: "Social 8K Run + Coffee", venueName: "Advant Navis Gate 2" },
    ],
    socialLinks: {},
  },
  {
    id: "comm_06",
    name: "Greater Noida Shuttlers",
    slug: "greater-noida-shuttlers",
    category: "sports",
    tagline: "Weekend and evening badminton community in Greater Noida.",
    description:
      "Organized weekend doubles games and friendly ladders at City Park indoor complex. Open to intermediate and advanced recreational players. Great vibe, feather shuttles, and wooden courts.",
    baseLocation: "Greater Noida (Pari Chowk / Alpha)",
    primaryVenueSlug: "city-park-greater-noida",
    membersCount: 140,
    verified: true,
    featured: false,
    meetingDays: ["Saturday", "Sunday"],
    captains: [
      {
        name: "Pooja Bansal",
        role: "Organizer",
        bio: "Former state player and community sports organizer.",
      },
    ],
    schedule: [
      { day: "Saturday", time: "07:00 AM", sessionType: "Doubles Open Session", venueName: "City Park Indoor Complex" },
      { day: "Sunday", time: "07:00 AM", sessionType: "Friendly Ladder Matches", venueName: "City Park Indoor Complex" },
    ],
    socialLinks: {},
  },
];
