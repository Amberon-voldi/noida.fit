import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ArrowUpRight, Gift } from "lucide-react";
import { DetailHero } from "@/components/discovery/DetailHero";
import { GiftClaim } from "@/components/gifts/GiftClaim";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { formatDate, SITE_CONFIG } from "@/lib/config";
import { parseEventPrice } from "@/lib/pricing";
import { getGiftView } from "@/lib/services/gifts";

type Props = { params: Promise<{ giftId: string }> };

/** Metadata and page share one read per request. */
const load = cache(async (giftId: string) => {
  const user = await getCurrentAppwriteUser();
  return { view: await getGiftView(giftId, user?.$id), signedIn: Boolean(user) };
});

/** The link is the invitation, so its preview names the guest and the event; it is never indexed. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { giftId } = await params;
  const { view } = await load(giftId);
  if (!view) return { title: "Gift link", robots: { index: false, follow: false } };
  const { event, link } = view;
  const title = `🎁 ${link.label ? `${link.label}, you’re invited` : "You’re invited"}: ${event.title}`;
  const description = `${event.communityName} is gifting you a free spot at ${event.title} · ${formatDate(event.date)}, ${event.startTime} · ${event.venueName}. Claim it on ${SITE_CONFIG.name}.`;
  const image = { url: `/gift/${giftId}/preview`, width: 1200, height: 630, alt: `Gift invite to ${event.title}` };
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    // The link itself is the claim: keep it out of Referer headers sent to other sites.
    referrer: "no-referrer",
    openGraph: { type: "website", siteName: SITE_CONFIG.name, url: `${SITE_CONFIG.url}/gift/${giftId}`, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function GiftPage({ params }: Props) {
  const { giftId } = await params;
  const { view, signedIn } = await load(giftId);
  if (!view) notFound();
  const { event, link, state } = view;
  const pricing = parseEventPrice(event.price);
  return <div className="pb-16">
    <DetailHero image={event.coverImageUrl ?? event.imageUrl} category={event.category} title={event.title} logo={event.communityCrestUrl} logoAlt={`${event.communityName} logo`}>
      <p className="text-sm text-text-secondary">Hosted by <Link href={`/community/${event.communitySlug}`} className="font-semibold text-velocity hover:text-velocity-glow">{event.communityName}</Link></p>
    </DetailHero>
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <section aria-labelledby="gift-heading" className="gift-card relative overflow-hidden rounded-2xl border border-velocity/50 bg-surface p-5 sm:p-8">
        <p className="eyebrow flex items-center gap-2"><Gift className="h-4 w-4" aria-hidden="true" />A gift for you</p>
        <h2 id="gift-heading" className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{link.label ? `${link.label}, you’re invited` : "You’re invited"}</h2>
        <p className="mt-3 leading-relaxed text-text-secondary">
          {event.communityName} is giving you a free spot at <span className="font-semibold text-white">{event.title}</span>
          {pricing.kind === "paid" ? <>: a <s>{pricing.label}</s> ticket, on the house.</> : "."}
          {link.spots > 1 ? ` This link admits ${link.spots} people, one spot each.` : ""}
        </p>
        {link.note && <blockquote className="mt-5 border-l-2 border-velocity pl-4 text-white"><p className="whitespace-pre-line">“{link.note}”</p><footer className="mt-1 text-sm text-text-secondary">— {event.communityName}</footer></blockquote>}
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {[["When", `${formatDate(event.date)} · ${event.startTime}`], ["Where", `${event.venueName}, ${event.sector}`], ["Your ticket", pricing.kind === "paid" ? `Free (was ${pricing.label})` : "Free"]].map(([label, value]) =>
            <div key={label} className="min-w-0 rounded-lg border border-border-subtle bg-surface-elevated p-4"><dt className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">{label}</dt><dd className="mt-2 break-words text-sm font-semibold text-white">{value}</dd></div>)}
        </dl>
        <GiftClaim giftId={link.id} initialState={state} signedIn={signedIn} />
      </section>
      <Link href={`/event/${event.slug}`} className="mt-6 inline-flex min-h-11 items-center gap-1 font-semibold text-velocity hover:text-velocity-glow">Everything about this session <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
  </div>;
}
