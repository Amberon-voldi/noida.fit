import type { ActivityCategory, Community } from "@/types/community";

/** Fictional demo groups. No affiliation, membership or verification claims. */
const groups: {
  name: string; slug: string; category: ActivityCategory; activity: string; sector: string;
  venue: string; tagline: string; description: string; days: string[]; time: string;
}[] = [
  { name: "Chai Mile Collective", slug: "chai-mile-collective", category: "running", activity: "running", sector: "Sector 137 & Expressway", venue: "advant-navis-corridor", tagline: "Easy miles, a regroup and a cup of chai.", description: "An imagined neighborhood running crew for the Expressway belt. The sample schedule includes a short midweek loop and a longer weekend outing, with run-walk options and regroup points rather than a race to the finish.", days: ["Wednesday", "Saturday"], time: "06:00 AM" },
  { name: "Stadium First Lap", slug: "stadium-first-lap", category: "running", activity: "running", sector: "Sector 21A", venue: "noida-stadium-sector-21a", tagline: "Your first lap counts as much as your fastest.", description: "A fictional track group built around approachable sessions: a joint warm-up, shorter effort blocks and a relaxed cooldown. The demo schedule illustrates how a captain could welcome both returning runners and first-timers at Noida Stadium.", days: ["Tuesday", "Thursday", "Sunday"], time: "05:45 AM" },
  { name: "Two Wheels Before Work", slug: "two-wheels-before-work", category: "cycling", activity: "cycling", sector: "Sectors 93A–150", venue: "noida-expressway-loop", tagline: "Helmets on. No rider left wondering where to turn.", description: "A fictional social cycling crew whose example rides use local sector roads, not the expressway carriageway. The sample format includes a bike check, clear regroup points and a breakfast stop. Road access and traffic must be checked before any real ride.", days: ["Wednesday", "Saturday"], time: "05:45 AM" },
  { name: "Park Bench Strength Club", slug: "park-bench-strength-club", category: "strength", activity: "calisthenics", sector: "Sector 50", venue: "meghdootam-park-sector-50", tagline: "Start with the ground. Build from there.", description: "A made-up outdoor strength circle showing a beginner-friendly approach to squats, balance, push-up variations and controlled movement. No equipment availability or coaching qualification is asserted by this demo listing.", days: ["Monday", "Friday", "Sunday"], time: "06:30 AM" },
  { name: "137 Slow Sunday", slug: "137-slow-sunday", category: "outdoor", activity: "outdoor", sector: "Sector 137", venue: "sector-137-central-park", tagline: "Walk, jog or start again. There is room for all three.", description: "A fictional easy-movement group for neighbors in Sector 137. The example meetups leave time for introductions, a compact park loop and a stretch. They are not announcements of an actual society event.", days: ["Wednesday", "Sunday"], time: "06:15 AM" },
  { name: "Alpha Shuttle Circle", slug: "alpha-shuttle-circle", category: "sports", activity: "badminton", sector: "Greater Noida Alpha 2", venue: "alpha-2-indoor-court", tagline: "Rotate partners, keep the rallies friendly.", description: "An imagined badminton group around the Alpha sectors. The sample sessions show rotating doubles, transparent court-cost sharing and time for warm-up rallies. No court has been booked and the demo venue is fictional.", days: ["Saturday", "Sunday"], time: "07:00 AM" },
  { name: "Sunday Seven-a-side", slug: "sunday-seven-a-side", category: "sports", activity: "football", sector: "Sector 79", venue: "sector-79-community-ground", tagline: "A friendly game before the Sunday errands.", description: "A fictional football group illustrating a simple warm-up, balanced teams and short substitutions. The example ground listing is not a claim that public bookings or organized matches are available.", days: ["Sunday"], time: "07:00 AM" },
  { name: "Morning Mat Circle", slug: "morning-mat-circle", category: "wellness", activity: "yoga", sector: "Sector 18", venue: "sector-18-community-lawn", tagline: "A little space to breathe before the market wakes.", description: "A fictional outdoor yoga circle with a gentle sample practice: standing poses, comfortable breathing and rest. Bring-your-own-mat and accessible variations are part of the demo, not a promise of qualified instruction.", days: ["Tuesday", "Saturday"], time: "06:30 AM" },
  { name: "Greenway Reset", slug: "greenway-reset", category: "wellness", activity: "mobility", sector: "Sector 93A", venue: "greenway-park-sector-93a", tagline: "An easy reset for hips, shoulders and desk days.", description: "A made-up mobility circle for people who sit, run, ride or want a less hurried morning. Its sample sessions use slow joint circles and light movement; this is not rehabilitation or medical advice.", days: ["Saturday"], time: "07:00 AM" },
  { name: "After Work Hoops", slug: "after-work-hoops", category: "sports", activity: "basketball", sector: "Sector 34", venue: "sector-34-basketball-court", tagline: "Short games. Fresh teams. Leave the ego at the gate.", description: "A fictional pick-up basketball group demonstrating mixed-level games and regular team rotations. Court access and lighting in the example schedule are illustrative and must be independently confirmed for real play.", days: ["Wednesday", "Friday"], time: "07:30 PM" },
  { name: "Wetland Wander Circle", slug: "wetland-wander-circle", category: "outdoor", activity: "hiking", sector: "Sector 95", venue: "okhla-bird-sanctuary-trail", tagline: "Walk slowly enough to notice the birds.", description: "An imagined nature-walking group using the Okhla area as a local reference. Sample walks respect marked paths, entry rules and quiet wildlife observation. This is not a sanctuary partnership or confirmed guided tour.", days: ["Sunday"], time: "07:30 AM" },
  { name: "Core & Coffee 104", slug: "core-coffee-104", category: "strength", activity: "pilates", sector: "Sector 104", venue: "the-fit-box-sector-104", tagline: "Low-impact movement with no performance pressure.", description: "A fictional mat-based movement group showing a small-session format for balance and core practice. Its venue is a demo studio; no commercial relationship, instructor credential or paid booking is implied.", days: ["Thursday", "Saturday"], time: "07:00 AM" },
];

export const communities: Community[] = groups.map((group, index) => ({
  id: `comm_${String(index + 1).padStart(2, "0")}`,
  name: group.name,
  slug: group.slug,
  category: group.category,
  activityId: `activity_${group.activity}`,
  tagline: group.tagline,
  description: `${group.description} Fictional demo community — do not travel based on this schedule.`,
  baseLocation: group.sector,
  primaryVenueSlug: group.venue,
  membersCount: 0,
  verified: false,
  featured: index < 4,
  meetingDays: group.days,
  captains: [],
  schedule: group.days.map((day) => ({ day, time: group.time, sessionType: `${group.activity} · sample session`, venueName: `${group.sector} · demo meeting point` })),
  socialLinks: {},
  status: "published",
  demo: true,
  tags: ["demo", "fictional", group.activity, "beginner-friendly"],
}));
