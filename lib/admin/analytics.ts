import "server-only";

import { appwriteCollections as collections } from "@/lib/appwrite/config";
import { listAppwriteDocuments, Query } from "@/lib/appwrite/database";
import { couponIdOf, decryptCode, storedCouponsOf } from "@/lib/coupons";
import { getOrganizerEvents } from "@/lib/data";
import { HttpError } from "@/lib/http";
import { parseEventPrice, ticketHoldEndsAt } from "@/lib/pricing";
import { isPaidOnline } from "@/lib/services/participation";
import { tierIdOf } from "@/lib/ticket-tiers";
import type { Event } from "@/types/event";

/**
 * Ticket sales from the site's own records (RSVP and check-in tables), for the admin Analytics page.
 * Checkouts are counted from seat holds, which are deleted when a member cancels or their lapsed seat is
 * taken by someone else, so "checkouts" is a floor and the conversion an upper bound.
 */

interface TicketRow { eventId: string; status: string; amount?: number; paymentStatus?: string; paymentRef?: string; createdAt?: string }

export interface SalesBreakdown { key: string; label: string; tickets: number; revenue: number }
export interface DaySales { date: string; tickets: number; revenue: number }

export interface EventSales {
  id: string;
  slug: string;
  title: string;
  date: string;
  status: string;
  paid: boolean;
  capacity?: number;
  going: number;
  paidTickets: number;
  /** Paise. */
  revenue: number;
  gifts: number;
  freeRsvps: number;
  payingNow: number;
  abandoned: number;
  /** Seat holds started (paid online, paying now, or not completed): a floor, see above. */
  checkouts: number;
  paidOnline: number;
  checkedIn: number;
  tiers: SalesBreakdown[];
  coupons: SalesBreakdown[];
  /** The ticket types on sale (whole rupees), for issuing a ticket by hand. */
  ticketTypes: { id: string; name: string; price: number }[];
  /** The single price in whole rupees, for events without ticket types. */
  priceRupees: number;
  daily: DaySales[];
}

export interface SalesAnalytics {
  events: EventSales[];
  totals: { revenue: number; paidTickets: number; going: number; gifts: number; checkedIn: number; payingNow: number };
  generatedAt: string;
}

const istDate = (iso: string | undefined) => {
  const time = Date.parse(String(iso));
  return Number.isFinite(time) ? new Date(time + 330 * 60_000).toISOString().slice(0, 10) : "";
};

function couponCodes(event: Event & { coupons?: unknown }): Map<string, string> {
  try {
    return new Map(storedCouponsOf(event).map(coupon => [coupon.id, decryptCode(coupon.code) ?? coupon.id]));
  } catch (error) {
    if (error instanceof HttpError) return new Map();
    throw error;
  }
}

export async function getSalesAnalytics(adminId: string, days = 14): Promise<SalesAnalytics> {
  const [events, rows, checkins] = await Promise.all([
    getOrganizerEvents(adminId, true),
    listAppwriteDocuments<TicketRow>(collections.rsvps, [Query.select(["eventId", "status", "amount", "paymentStatus", "paymentRef", "createdAt"])]),
    listAppwriteDocuments<{ eventId: string }>(collections.checkins, [Query.select(["eventId"])]),
  ]);
  const now = Date.now();
  const byEvent = new Map<string, TicketRow[]>();
  for (const row of rows) byEvent.set(row.eventId, [...(byEvent.get(row.eventId) ?? []), row]);
  const checkedIn = new Map<string, number>();
  for (const checkin of checkins) checkedIn.set(checkin.eventId, (checkedIn.get(checkin.eventId) ?? 0) + 1);
  const dayKeys = Array.from({ length: days }, (_, index) => istDate(new Date(now - (days - 1 - index) * 86_400_000).toISOString()));

  const list: EventSales[] = events.filter(event => !event.demo).map(event => {
    const tickets = byEvent.get(event.id) ?? [];
    const confirmed = tickets.filter(row => row.status === "confirmed");
    const paidRows = confirmed.filter(row => row.amount && row.paymentStatus === "paid");
    const holds = tickets.filter(row => row.status === "pending" && row.amount);
    const live = holds.filter(row => ticketHoldEndsAt(String(row.createdAt)) > now);
    const tierNames = new Map((event.tiers ?? []).map(tier => [tier.id, tier.name]));
    const codes = couponCodes(event as Event & { coupons?: unknown });
    const tiers = new Map<string, SalesBreakdown>();
    const coupons = new Map<string, SalesBreakdown>();
    const daily = new Map(dayKeys.map(date => [date, { date, tickets: 0, revenue: 0 }]));
    for (const row of paidRows) {
      const tierId = tierIdOf(row.paymentRef);
      const tierKey = tierId ?? "single";
      const tier = tiers.get(tierKey) ?? { key: tierKey, label: (tierId && tierNames.get(tierId)) || (tierId ? "Removed type" : "Ticket"), tickets: 0, revenue: 0 };
      tier.tickets += 1; tier.revenue += row.amount ?? 0; tiers.set(tierKey, tier);
      const couponId = couponIdOf(row.paymentRef);
      if (couponId) {
        const coupon = coupons.get(couponId) ?? { key: couponId, label: codes.get(couponId) ?? "Deleted code", tickets: 0, revenue: 0 };
        coupon.tickets += 1; coupon.revenue += row.amount ?? 0; coupons.set(couponId, coupon);
      }
      const day = daily.get(istDate(row.createdAt));
      if (day) { day.tickets += 1; day.revenue += row.amount ?? 0; }
    }
    const paidOnline = paidRows.filter(row => isPaidOnline(row.paymentRef)).length;
    return {
      id: event.id, slug: event.slug, title: event.title, date: event.date, status: event.status ?? "published",
      paid: parseEventPrice(event.price).kind === "paid", capacity: event.capacity,
      going: confirmed.length,
      paidTickets: paidRows.length,
      revenue: paidRows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
      gifts: confirmed.filter(row => row.paymentStatus === "gift").length,
      freeRsvps: confirmed.filter(row => !row.amount && row.paymentStatus !== "gift").length,
      payingNow: live.length,
      abandoned: holds.length - live.length,
      checkouts: paidOnline + holds.length,
      paidOnline,
      checkedIn: checkedIn.get(event.id) ?? 0,
      tiers: [...tiers.values()].sort((a, b) => b.revenue - a.revenue),
      coupons: [...coupons.values()].sort((a, b) => b.tickets - a.tickets),
      daily: [...daily.values()],
      ticketTypes: (event.tiers ?? []).map(tier => ({ id: tier.id, name: tier.name, price: tier.price })),
      priceRupees: Math.round((parseEventPrice(event.price).amount || 0) / 100),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  const sum = (key: "revenue" | "paidTickets" | "going" | "gifts" | "checkedIn" | "payingNow") => list.reduce((total, event) => total + event[key], 0);
  return {
    events: list,
    totals: { revenue: sum("revenue"), paidTickets: sum("paidTickets"), going: sum("going"), gifts: sum("gifts"), checkedIn: sum("checkedIn"), payingNow: sum("payingNow") },
    generatedAt: new Date(now).toISOString(),
  };
}
