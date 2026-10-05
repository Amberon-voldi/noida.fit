import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Community } from "@/types/community";
import type { Place } from "@/types/place";

export function LandingCommunities({ communities }: { communities: Community[] }) {
  return <div className="landing-collection landing-community-collection">
    {communities.slice(0, 2).map((community, index) => <article key={community.id} className="landing-collection-item" data-reveal-item data-reveal-style={index === 0 ? "left" : "right"} data-reveal-order={index}>
      <div className="landing-collection-index">0{index + 1}</div>
      <div className="landing-collection-content"><p className="landing-collection-type">{community.category} · {community.demo ? "Demo listing" : "Community"}</p><h3><Link href={`/community/${community.slug}`}>{community.name}<ArrowUpRight size={18} aria-hidden="true" /></Link></h3><p className="landing-collection-description">{community.tagline}</p><p className="landing-collection-meta"><MapPin size={14} aria-hidden="true" />{community.baseLocation}</p></div>
    </article>)}
  </div>;
}

export function LandingPlaces({ places }: { places: Place[] }) {
  return <div className="landing-places-list">
    {places.slice(0, 3).map((place, index) => <Link href={`/place/${place.slug}`} key={place.id} className="landing-place-row" data-reveal-item data-reveal-style={index % 2 ? "right" : "left"} data-reveal-order={index}>
      <span className="landing-place-number" aria-hidden="true">0{index + 1}</span><span className="landing-place-copy"><strong>{place.name}</strong><span>{place.sector} · {place.category}{place.demo && " · Demo listing"}</span></span><ArrowUpRight className="landing-place-arrow" size={22} aria-hidden="true" />
    </Link>)}
  </div>;
}
