import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlaceBySlug } from "@/lib/data";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = getPlaceBySlug(slug);
  if (!place) return { title: "Place Not Found" };

  return {
    title: place.name,
    description: place.description.slice(0, 160),
    alternates: { canonical: `/place/${slug}` },
  };
}

const PLACE_EMOJIS: Record<string, string> = {
  "Sports Complex": "🏟️",
  "Road & Expressway": "🛣️",
  "Public Park": "🌳",
  "Nature Trail & Park": "🌿",
  "Sports Complex & Park": "🏸",
  "Nature Corridor": "🦅",
  "Boutique Studio": "💪",
};

export default async function PlacePage({ params }: Props) {
  const { slug } = await params;
  const place = getPlaceBySlug(slug);

  if (!place) notFound();

  const emoji = PLACE_EMOJIS[place.category] ?? "📍";

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="bg-surface border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-muted">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span aria-hidden="true">›</span>
            <Link href="/places" className="hover:text-white transition-colors">Places</Link>
            <span aria-hidden="true">›</span>
            <span className="text-text-secondary" aria-current="page">{place.name}</span>
          </nav>
        </div>
      </div>

      {/* Place Hero */}
      <div className="bg-surface border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 h-20 w-20 rounded-2xl bg-surface-elevated border border-border-strong flex items-center justify-center text-4xl">
              {emoji}
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-energy">
                {place.category}
              </span>
              <h1
                className="mt-1 text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
                style={{ letterSpacing: "-0.03em" }}
              >
                {place.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {place.sector}
                </span>
                <span className="text-velocity font-semibold">
                  {place.activeCommunitiesCount} active {place.activeCommunitiesCount === 1 ? "community" : "communities"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            <section aria-labelledby="about-place-heading">
              <h2 id="about-place-heading" className="text-xl font-bold text-white mb-4">About</h2>
              <p className="text-text-secondary leading-relaxed">{place.description}</p>
            </section>

            {/* Address */}
            <section aria-labelledby="address-heading">
              <h2 id="address-heading" className="text-lg font-bold text-white mb-3">Address</h2>
              <p className="text-text-secondary text-sm">{place.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-velocity hover:text-velocity-glow transition-colors"
              >
                Open in Google Maps →
              </a>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Hours + Parking */}
            <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-4">
              {place.publicHours && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Best Hours</p>
                  <p className="text-sm text-text-secondary">{place.publicHours}</p>
                </div>
              )}
              {place.parkingInfo && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Parking</p>
                  <p className="text-sm text-text-secondary">{place.parkingInfo}</p>
                </div>
              )}
            </div>

            {/* Amenities */}
            <div className="rounded-xl border border-border-subtle bg-surface p-6">
              <h2 className="text-sm font-bold text-white mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {place.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-md bg-surface-elevated border border-border-subtle px-2.5 py-1 text-xs text-text-secondary"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
