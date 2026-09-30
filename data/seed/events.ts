import type { Event } from "@/types/event";
import { communities } from "./communities";
import { places } from "./places";

// Dates are resolved once when running the seed script, never by the runtime DAL.
// Fictional sample sessions; no real organizer, booking or partnership is implied.
const samples: Array<{title: string; group: number; place: number; activity?: string; days: number; start?: string; end?: string; price?: number; capacity?: number; distance?: string}> = [
  {title:"Expressway belt: easy 5K & chai",group:0,place:1,days:1,distance:"5 km"},
  {title:"First lap: stadium run-walk",group:1,place:0,days:2,distance:"3 km"},
  {title:"South Noida social cycling loop",group:2,place:6,days:3,start:"05:45 AM",end:"07:45 AM",distance:"25 km"},
  {title:"Meghdootam bodyweight basics",group:3,place:2,days:4},
  {title:"137 neighborhood walk & stretch",group:4,place:13,days:0,activity:"walking",start:"07:00 PM",end:"08:00 PM"},
  {title:"Alpha doubles: rotate and rally",group:5,place:15,days:5,price:200,capacity:16,start:"07:00 AM",end:"09:00 AM"},
  {title:"Sector 79 seven-a-side",group:6,place:8,days:6,price:100,capacity:14},
  {title:"Morning mat: gentle yoga",group:7,place:9,days:7,activity:"yoga",start:"06:30 AM",end:"07:30 AM"},
  {title:"Greenway shoulders & hips reset",group:8,place:10,days:8,activity:"mobility"},
  {title:"After-work hoops in Sector 34",group:9,place:11,days:9,start:"07:30 PM",end:"09:00 PM",capacity:20},
  {title:"Okhla wetland nature walk",group:10,place:5,days:10,activity:"walking",start:"08:00 AM",end:"09:00 AM"},
  {title:"Core & coffee: mat Pilates",group:11,place:7,days:11,activity:"pilates",price:250,capacity:12},
  {title:"Biodiversity park easy trail loop",group:0,place:3,days:12,distance:"4 km"},
  {title:"Stadium evening strides",group:1,place:0,days:13,start:"06:30 PM",end:"07:30 PM",distance:"4 km"},
  {title:"Sector 150 first group ride",group:2,place:14,days:14,distance:"18 km"},
  {title:"Functional strength: park circuit",group:3,place:2,days:15,activity:"functional-training"},
  {title:"Slow morning at City Park",group:4,place:4,days:16,activity:"walking",start:"08:00 AM",end:"09:00 AM"},
  {title:"Alpha beginner doubles clinic",group:5,place:15,days:17,price:150,capacity:12},
  {title:"Sector 62 football warm-up & game",group:6,place:12,days:18,capacity:14},
  {title:"Restorative yoga in Sector 18",group:7,place:9,days:19,activity:"yoga"},
  {title:"Mobility after a desk day",group:8,place:16,days:20,activity:"mobility",price:200,start:"06:30 PM",end:"07:30 PM"},
  {title:"Evening court: friendly basketball",group:9,place:11,days:-2,start:"07:00 PM",end:"08:30 PM"},
  {title:"Birdwatching and a quiet walk",group:10,place:5,days:-5,activity:"walking",start:"08:00 AM",end:"09:00 AM"},
  {title:"Core control and balance",group:11,place:7,days:-8,activity:"pilates",price:200},
];

function dateInIndia(offset: number): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const midnight = new Date(`${today}T00:00:00Z`);
  midnight.setUTCDate(midnight.getUTCDate() + offset);
  return midnight.toISOString().slice(0, 10);
}
function dateTime(date: string, time: string): string {
  const match = /^(\d+):(\d+) (AM|PM)$/.exec(time)!;
  const hour = Number(match[1]) % 12 + (match[3] === "PM" ? 12 : 0);
  return `${date}T${String(hour).padStart(2, "0")}:${match[2]}:00+05:30`;
}

export const events: Event[] = samples.map((sample, index) => {
  const community = communities[sample.group];
  const place = places[sample.place];
  const date = dateInIndia(sample.days);
  const startTime = sample.start ?? "06:00 AM";
  const endTime = sample.end ?? "07:00 AM";
  const activityId = sample.activity ? `activity_${sample.activity}` : community.activityId;
  return {
    id: `evt_${String(index + 1).padStart(2,"0")}`,
    title: sample.title,
    slug: sample.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/-$/,""),
    category: community.category,
    activityId,
    communitySlug: community.slug,
    communityName: community.name,
    venueSlug: place.slug,
    venueName: place.name,
    sector: place.sector,
    date, startTime, endTime,
    startsAt: dateTime(date, startTime), endsAt: dateTime(date, endTime),
    price: sample.price ? `₹${sample.price}` : "FREE",
    capacity: sample.capacity ?? 30,
    distance: sample.distance,
    level: "All levels welcome · demo session",
    description: `A fictional ${community.category} session in ${place.sector}, illustrating how a local meetup works on NOIDA.FIT. Meet the group, take time to warm up, and move at a comfortable pace. This is demo content, not a scheduled real-world event. Do not travel or make payments based on this listing. Venue access and organizer details need confirmation before a real event can be published.`,
    whatToBring: ["Water bottle", "Comfortable activity-appropriate footwear", "Any personal equipment needed"],
    featured: index < 6, attendeesCount: 0,
    tags: ["demo", "sample session", sample.price ? "paid" : "free"],
    status: "published", demo: true,
  };
});
