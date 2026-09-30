import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config";

export function listingMetadata({ title, description, path, image, demo = false }: { title: string; description: string; path: string; image?: string; demo?: boolean }): Metadata {
  const summary = `${demo ? "Demo listing — not a confirmed gathering or partnership. " : ""}${description}`.slice(0, 160);
  const images = image ? [{ url: image, alt: demo ? "Illustrative listing image" : title }] : undefined;
  return {
    title: demo ? `${title} (Demo)` : title,
    description: summary,
    alternates: { canonical: path },
    ...(demo ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: "website", siteName: SITE_CONFIG.name, url: `${SITE_CONFIG.url}${path}`, title: demo ? `${title} (Demo)` : title, description: summary, images },
    twitter: { card: images ? "summary_large_image" : "summary", title: demo ? `${title} (Demo)` : title, description: summary, images },
  };
}
