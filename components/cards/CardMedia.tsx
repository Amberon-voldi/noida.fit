import Image from "next/image";
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from "@/lib/config";
import type { ActivityCategory } from "@/types/community";

/**
 * Only an operator-supplied file is a listing's own photo. Unsplash editorial stock is
 * illustrative of an activity, never of this venue, club or session, so it must not stand
 * in for a cover here. Listings without a photo get a typographic tile that claims nothing.
 */
export function listingPhoto(src?: string): string | undefined {
  return src?.startsWith("/images/") ? src : undefined;
}

function categoryKey(category: string): ActivityCategory {
  return (category in CATEGORY_EMOJIS ? category : "outdoor") as ActivityCategory;
}

interface CardMediaProps {
  src?: string;
  category?: string;
  /** Overrides the category caption on the fallback tile (places use their venue kind). */
  label?: string;
  alt: string;
  sizes: string;
  variant?: "cover" | "band";
}

export function CardMedia({ src, category = "outdoor", label, alt, sizes, variant = "cover" }: CardMediaProps) {
  const photo = listingPhoto(src);
  if (photo) return <Image src={photo} alt={alt} fill sizes={sizes} className="object-cover" />;
  const key = categoryKey(category);
  return (
    <span className="card-glyph" data-variant={variant} data-category={key}>
      <span className="card-glyph-mark" aria-hidden="true">{CATEGORY_EMOJIS[key]}</span>
      <span className="card-glyph-label">{label ?? CATEGORY_LABELS[key]}</span>
    </span>
  );
}
