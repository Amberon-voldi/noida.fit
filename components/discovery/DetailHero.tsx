import type { ReactNode } from "react";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
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
  /** Shows a verified badge after the title. */
  verified?: boolean;
  verifiedLabel?: string;
  /** Chips, details and actions under the title. */
  children?: ReactNode;
}

/** The banner itself; BioIntro renders a second copy so its event pass can land on identical pixels. */
export function HeroBanner({ image, category, alt }: { image?: string; category?: string; alt: string }) {
  return <div className="detail-hero">
    <div className="detail-hero-media"><ListingImage src={image} category={category} alt={alt} hero sizes="100vw" /></div>
    <div className="detail-hero-shade" aria-hidden="true" />
  </div>;
}

/**
 * Full-bleed banner for club, place and event pages. Directly under the navbar it slides
 * beneath it (see .detail-hero in globals.css); the logo and title straddle its bottom edge.
 */
export function DetailHero({ image, category, title, logo, logoAlt, verified = false, verifiedLabel = "Verified", children }: DetailHeroProps) {
  const crest = listingPhoto(logo);
  return <header className="detail-hero-header">
    <HeroBanner image={image} category={category} alt={title} />
    <div className="detail-hero-body mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="detail-hero-identity">
        {crest && <Image src={crest} alt={logoAlt ?? `${title} logo`} width={112} height={112} unoptimized={isMediaPath(crest)} className="detail-hero-logo" />}
        <h1 className="detail-hero-title">{title}{verified && <>{"\u00a0"}<span role="img" aria-label={verifiedLabel} title={verifiedLabel} className="detail-hero-verified"><BadgeCheck aria-hidden="true" /></span></>}</h1>
      </div>
      {children && <div className="detail-hero-details">{children}</div>}
    </div>
  </header>;
}
