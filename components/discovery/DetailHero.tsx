import type { ReactNode } from "react";
import Image from "next/image";
import { ListingImage } from "@/components/discovery/ListingImage";
import { listingPhoto } from "@/components/cards/CardMedia";
import { isMediaPath } from "@/lib/media";

interface DetailHeroProps {
  /** Banner image; without one an illustrative photo for the category is shown. */
  image?: string;
  category?: string;
  title: string;
  /** Square logo that sits half on the banner, e.g. a club crest. Only site-hosted images are shown. */
  logo?: string;
  logoAlt?: string;
  /** Chips, details and actions under the title. */
  children?: ReactNode;
}

/**
 * Full-bleed banner for club, place and event pages. Directly under the navbar it slides
 * beneath it (see .detail-hero in globals.css); the logo and title straddle its bottom edge.
 */
export function DetailHero({ image, category, title, logo, logoAlt, children }: DetailHeroProps) {
  const crest = listingPhoto(logo);
  return <header className="detail-hero-header">
    <div className="detail-hero">
      <div className="detail-hero-media"><ListingImage src={image} category={category} alt={title} hero sizes="100vw" /></div>
      <div className="detail-hero-shade" aria-hidden="true" />
    </div>
    <div className="detail-hero-body mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="detail-hero-identity">
        {crest && <Image src={crest} alt={logoAlt ?? `${title} logo`} width={112} height={112} unoptimized={isMediaPath(crest)} className="detail-hero-logo" />}
        <h1 className="detail-hero-title">{title}</h1>
      </div>
      {children && <div className="detail-hero-details">{children}</div>}
    </div>
  </header>;
}
