import type { Metadata } from "next";
import { HomeHub } from "@/components/home/HomeHub";
import { getDirectory } from "@/lib/data";
import { homeHighlights, type HomeHighlights } from "@/lib/home";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Home · Find your next move",
  description: "Find your next fitness session in Noida and Greater Noida. Explore upcoming events, local clubs and places to move, then make a plan with NOIDA.FIT.",
  alternates: { canonical: "/home" },
  openGraph: { title: "Your next move starts here — NOIDA.FIT", description: "Explore sessions, clubs and places across Noida and Greater Noida.", url: "/home", type: "website" },
  twitter: { card: "summary_large_image", title: "Your next move starts here — NOIDA.FIT", description: "Explore sessions, clubs and places across Noida and Greater Noida.", images: ["/opengraph-image"] },
};

export default async function HomePage() {
  const [session, directory] = await Promise.all([auth(), getDirectory().catch(() => null)]);
  const now = new Date();
  const highlights: HomeHighlights | null = directory ? homeHighlights(directory, now) : null;
  const memberName = session?.user.name.trim().split(/\s+/)[0]?.slice(0, 50);
  const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://noida.fit").origin;
  const collection = { "@context": "https://schema.org", "@type": "CollectionPage", name: "NOIDA.FIT home", url: `${site}/home`, description: metadata.description,
    ...(highlights ? { mainEntity: { "@type": "ItemList", itemListElement: highlights.events.filter(event => !event.demo).map((event, index) => ({ "@type": "ListItem", position: index + 1, name: event.title, url: `${site}/event/${event.slug}` })) } } : {}),
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection).replace(/</g, "\\u003c") }} /><HomeHub highlights={highlights} memberName={memberName} /></>;
}
