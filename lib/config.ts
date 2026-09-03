import type { ActivityCategory } from "@/types/community";

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  running: "Running",
  cycling: "Cycling",
  strength: "Strength",
  sports: "Sports",
  wellness: "Wellness",
  outdoor: "Outdoor",
};

export const CATEGORY_EMOJIS: Record<ActivityCategory, string> = {
  running: "🏃",
  cycling: "🚴",
  strength: "💪",
  sports: "🏸",
  wellness: "🧘",
  outdoor: "🌿",
};

export const NAV_LINKS = [
  { label: "Discover", href: "/discover" },
  { label: "Communities", href: "/communities" },
  { label: "Events", href: "/events" },
  { label: "Places", href: "/places" },
  { label: "Stories", href: "/stories" },
] as const;

export const SITE_CONFIG = {
  name: "NOIDA.FIT",
  tagline: "Find your people. Show up. Move together.",
  description:
    "The city-first fitness discovery and community platform for Noida & Greater Noida.",
  url: "https://noida.fit",
  instagram: "https://instagram.com/noida.fit",
  activeCommunities: 12,
  weeklyGatherings: 28,
  activeMovers: "1,400+",
} as const;

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
