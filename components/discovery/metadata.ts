import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config";
import { isMediaPath } from "@/lib/media";

/** Uploaded images are shared through their 1200×630 JPEG preview (app/media/[fileId]/share): the
 * originals can be several MB, and WhatsApp drops large previews. Declared size lets Facebook render
 * the first share. */
function previewImage(image: string, alt: string) {
  return isMediaPath(image) ? { url: `${image}/share`, width: 1200, height: 630, type: "image/jpeg", alt } : { url: image, alt };
}

export function listingMetadata({ title, description, path, image, demo = false }: { title: string; description: string; path: string; image?: string; demo?: boolean }): Metadata {
  const summary = `${demo ? "Demo listing — not a confirmed gathering or partnership. " : ""}${description}`.slice(0, 160);
  const images = image ? [previewImage(image, demo ? "Illustrative listing image" : title)] : undefined;
  return {
    title: demo ? `${title} (Demo)` : title,
    description: summary,
    alternates: { canonical: path },
    ...(demo ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: "website", siteName: SITE_CONFIG.name, url: `${SITE_CONFIG.url}${path}`, title: demo ? `${title} (Demo)` : title, description: summary, images },
    twitter: { card: images ? "summary_large_image" : "summary", title: demo ? `${title} (Demo)` : title, description: summary, images },
  };
}
