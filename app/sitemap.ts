import type { MetadataRoute } from "next";
import { getDirectory } from "@/lib/data";
import { buildSitemap } from "@/lib/sitemap";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const directory = await getDirectory();
  return buildSitemap(directory, process.env.NEXT_PUBLIC_SITE_URL || "https://noida.fit");
}
