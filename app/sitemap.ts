import type { MetadataRoute } from "next";
import { getDirectory } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://noida.fit";
  const directory = await getDirectory();
  const paths = ["", "/discover", "/events", "/activities", "/places", "/communities", "/about", "/for-organizers"];
  // Demo listings and private profiles should never be marketed to search crawlers.
  paths.push(...directory.events.filter(e=>!e.demo).map(e=>`/event/${e.slug}`));
  paths.push(...directory.places.filter(p=>!p.demo).map(p=>`/place/${p.slug}`));
  paths.push(...directory.communities.filter(c=>!c.demo).map(c=>`/community/${c.slug}`));
  paths.push(...directory.activities.map(a=>`/activities/${a.slug}`));
  return paths.map(path => ({url:`${site}${path}`, changeFrequency:"weekly", priority:path ? 0.7 : 1}));
}
