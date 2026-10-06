import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://noida.fit";
  return { rules: [{ userAgent:"*", allow:"/", disallow:["/api/", "/account", "/fitness-id", "/login", "/signup", "/admin", "/organizer", "/check-in"] }], sitemap:`${site}/sitemap.xml` };
}
