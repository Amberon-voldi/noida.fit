import type { MetadataRoute } from "next";
import type { Directory } from "@/lib/data";

const PUBLIC_PATHS = [
  "/",
  "/home",
  "/discover",
  "/events",
  "/activities",
  "/places",
  "/communities",
  "/stories",
  "/about",
  "/for-organizers",
  "/privacy",
  "/terms",
] as const;

function isPublishedListing(item: { status?: string; demo?: boolean }): boolean {
  return item.status === "published" && item.demo !== true;
}

function addListingPaths(paths: Set<string>, prefix: string, items: Array<{ slug: string; status?: string; demo?: boolean }>): void {
  for (const item of items) {
    if (isPublishedListing(item)) paths.add(`${prefix}/${encodeURIComponent(item.slug)}`);
  }
}

/** Build the complete public sitemap from the current published directory. */
export function buildSitemap(directory: Directory, siteUrl: string): MetadataRoute.Sitemap {
  const paths = new Set<string>(PUBLIC_PATHS);
  addListingPaths(paths, "/event", directory.events);
  addListingPaths(paths, "/place", directory.places);
  addListingPaths(paths, "/community", directory.communities);
  addListingPaths(paths, "/activities", directory.activities);

  const base = new URL("/", siteUrl).origin;
  return [...paths].map((path) => ({
    url: new URL(path, `${base}/`).toString(),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
