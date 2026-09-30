import Image from "next/image";

const EDITORIAL_IMAGES: Record<string, string> = {
  running: "photo-1552674605-db6ffd4facb5",
  cycling: "photo-1485965120184-e220f721d03e",
  strength: "photo-1517836357463-d25dfeac3438",
  sports: "photo-1622279457486-62dcc4a431d6",
  wellness: "photo-1506126613408-eca07ce68773",
  outdoor: "photo-1473448912268-2022ce9509d8",
};

export function editorialImage(category = "running", width = 1000): string {
  const groups: Record<string, string> = { yoga: "wellness", mobility: "wellness", meditation: "wellness", pilates: "wellness", calisthenics: "strength", football: "sports", basketball: "sports", badminton: "sports", tennis: "sports" };
  return `https://images.unsplash.com/${EDITORIAL_IMAGES[groups[category] ?? category] ?? EDITORIAL_IMAGES.outdoor}?auto=format&fit=crop&w=${width}&q=80`;
}

export function ListingImage({ src, category = "outdoor", alt, sizes, hero = false }: { src?: string; category?: string; alt: string; sizes: string; hero?: boolean }) {
  // Only render the hosts configured for the public directory; do not pass arbitrary URLs to the optimizer.
  const supported = src && (src.startsWith("/images/") || src.startsWith("https://images.unsplash.com/"));
  const source = supported ? src : editorialImage(category, hero ? 1600 : 900);
  const editorial = !supported || source.includes("images.unsplash.com");
  return (
    <>
      <Image src={source} alt={editorial ? "" : alt} fill sizes={sizes} className="object-cover" {...(hero ? { preload: true } : {})} />
      {editorial && <span className="absolute bottom-2 right-2 rounded bg-background/85 px-2 py-1 text-[10px] text-white/85">Illustrative photo · Unsplash</span>}
    </>
  );
}

export function DemoNotice({ className = "", detail = false }: { className?: string; detail?: boolean }) {
  return (
    <div className={`rounded-lg border border-border-strong bg-surface px-4 py-3 text-xs leading-relaxed text-text-secondary ${className}`}>
      <span className="font-semibold text-white">Demo directory. </span>
      {detail ? "This is a sample listing, not a confirmed gathering or partnership. Do not travel or pay based on these details." : "Sample groups and schedules are labelled Demo. They are not confirmed gatherings or partnerships; do not travel or pay based on them."}
    </div>
  );
}
