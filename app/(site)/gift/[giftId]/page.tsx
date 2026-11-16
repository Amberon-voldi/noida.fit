import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays, Gift, MapPin, Ticket } from "lucide-react";
import { DetailHero } from "@/components/discovery/DetailHero";
import { GiftClaim } from "@/components/gifts/GiftClaim";
import { GuestPass } from "@/components/gifts/GuestPass";
import { guestTicket, venueDirections } from "@/components/gifts/guest-ticket";
import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { formatDate, SITE_CONFIG } from "@/lib/config";
import { parseEventPrice } from "@/lib/pricing";
import { getGiftView, type GuestPassState } from "@/lib/services/gifts";

type Props = { params: Promise<{ giftId: string }> };

const passNote: Partial<Record<GuestPassState, string>> = { "checked-in": "Checked in", ended: "Session ended", cancelled: "Session cancelled" };

/** Metadata and page share one read per request. */
const load = cache(async (giftId: string) => {
  const user = await getCurrentAppwriteUser();
  return { view: await getGiftView(giftId, user?.$id), signedIn: Boolean(user), holder: user?.name || undefined };
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
  const { view, signedIn, holder } = await load(giftId);
  if (!view) notFound();
  const { event, link, state, passes } = view;
  // A one-person link a guest has claimed is their ticket now: it opens their pass on any device.
  if (link.spots === 1 && passes[0]) return <div className="px-4 pb-8 pt-5 sm:py-12">
    <GuestPass passId={passes[0].id} ticket={guestTicket(event, passes[0])} state={passes[0].state} checkedInAt={passes[0].checkedInAt} directions={venueDirections(event)} />
  </div>;
  const pricing = parseEventPrice(event.price);
  const details = [
    { Icon: CalendarDays, label: "When", value: `${formatDate(event.date)} · ${event.startTime}` },
    { Icon: MapPin, label: "Where", value: `${event.venueName}, ${event.sector}` },
    { Icon: Ticket, label: "Your ticket", value: pricing.kind === "paid" ? `Free (was ${pricing.label})` : "Free" },
  ];
  // Kept short on a phone, so the claim button is close to the first screen: the banner above already names the session.
  return <div className="pb-16">
    <DetailHero image={event.coverImageUrl ?? event.imageUrl} category={event.category} title={event.title} logo={event.communityCrestUrl} logoAlt={`${event.communityName} logo`} />
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-5 sm:px-6 sm:py-12">
      <section aria-labelledby="gift-heading" className="gift-card relative overflow-hidden rounded-2xl border border-velocity/50 bg-surface p-4 sm:p-8">
        <p className="eyebrow flex items-center gap-2"><Gift className="h-4 w-4" aria-hidden="true" />A gift for you</p>
        <h2 id="gift-heading" className="mt-1.5 text-2xl font-extrabold tracking-tight text-white sm:mt-2 sm:text-3xl">{link.label ? `${link.label}, you’re invited` : "You’re invited"}</h2>
        <p className="mt-2 leading-relaxed text-text-secondary sm:mt-3">
          <Link href={`/community/${event.communitySlug}`} className="font-semibold text-white hover:text-velocity">{event.communityName}</Link> is giving you a free spot.
          {link.spots > 1 ? ` The link admits ${link.spots}, so bring ${link.spots === 2 ? "a friend" : "friends"}.` : ""}
        </p>
        {link.note && <blockquote className="mt-3 border-l-2 border-velocity pl-3 text-white sm:mt-5 sm:pl-4"><p className="whitespace-pre-line">“{link.note}” <span className="whitespace-nowrap text-sm text-text-secondary">— {event.communityName}</span></p></blockquote>}
        <dl className="mt-4 grid gap-2.5 rounded-xl border border-border-subtle bg-surface-elevated p-3.5 text-sm sm:mt-6 sm:grid-cols-3 sm:gap-4 sm:p-4">
          {details.map(({ Icon, label, value }) => <div key={label} className="flex min-w-0 items-start gap-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-velocity" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="sr-only sm:not-sr-only sm:font-mono sm:text-[10px] sm:uppercase sm:tracking-widest sm:text-text-secondary">{label}</dt>
              <dd className="break-words font-semibold text-white sm:mt-1">{value}</dd>
            </div>
          </div>)}
        </dl>
        <GiftClaim giftId={link.id} initialState={state} signedIn={signedIn} allowGuests={link.allowGuests} preset={link.preset} spots={link.spots} ticket={{
          eventId: event.id, eventSlug: event.slug, title: event.title, date: event.date, dateLabel: formatDate(event.date), startTime: event.startTime, endTime: event.endTime,
          venueName: event.venueName, sector: event.sector, communityName: event.communityName, category: event.category, image: event.coverImageUrl ?? event.imageUrl,
          kind: "gift", ...(pricing.kind === "paid" ? { priceLabel: pricing.label } : {}), holder,
        }} />
        {passes.length > 0 && <div className="mt-6 border-t border-border-subtle pt-5">
          <h3 className="font-semibold text-white">Claimed with this link</h3>
          <p className="mt-0.5 text-sm text-text-secondary">Already claimed? Open your pass to show at the door, on any phone.</p>
          <ul className="mt-3 divide-y divide-border-subtle rounded-xl border border-border-subtle">
            {passes.map(pass => <li key={pass.id}>
              <Link href={`/pass/${pass.id}`} className="flex min-h-14 items-center justify-between gap-3 px-3.5 py-2 hover:bg-surface-hover">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-white">{pass.name}</span>
                  <span className="block text-xs text-text-secondary">{[pass.seatNumber && `Spot #${pass.seatNumber}`, passNote[pass.state]].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-velocity">Show pass <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
              </Link>
            </li>)}
          </ul>
        </div>}
      </section>
      <Link href={`/event/${event.slug}`} className="mt-6 inline-flex min-h-11 items-center gap-1 font-semibold text-velocity hover:text-velocity-glow">Everything about this session <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
  </div>;
}
