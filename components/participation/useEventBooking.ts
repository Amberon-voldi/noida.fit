"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginUrl, refreshParticipation, useParticipation } from "./useParticipation";
import { indiaDateTime } from "@/lib/calendar";
import { formatInr, parseEventPrice, ticketHoldEndsAt } from "@/lib/pricing";
import type { TicketTier } from "@/lib/ticket-tiers";
import { CHECKOUT_OPEN_EVENT } from "./LaserBurst";
import { trackMetric } from "@/components/analytics/PageBeacon";

export interface EventBookingInput {
  eventId: string;
  date: string;
  startTime: string;
  price: string;
  /** PayU is set up and this is a real listing. A paid event's tickets are only sold online. */
  payOnline?: boolean;
  /** Online payment is off: a paid event's spot is booked with a WhatsApp number, and the payment link is sent there. */
  payOnWhatsapp?: boolean;
  /** When booking closes (ISO): the end for a session taking late sign-ups. Default: the start. */
  signupClosesAt?: string;
  /** Ticket types, each with its own price. */
  tiers?: TicketTier[];
}

/** A discount code the server priced for this ticket. */
export interface AppliedCoupon {
  code: string;
  /** The discounted price (paise). */
  amount: number;
  /** "20% off" or "₹50 off". */
  label: string;
  priceLabel: string;
}

/** Contact details from the ticket summary: the name on the ticket and the mobile number. */
export interface TicketContact {
  name: string;
  phone: string;
}

const GATEWAY = /^https:\/\/(?:test|secure)\.payu\.in\/_payment$/;

/** Leaves the page for PayU's checkout with the form the server signed. */
function postToGateway(action: string, fields: Record<string, string>): void {
  if (!GATEWAY.test(action)) throw new Error("Could not start the payment");
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}

/** RSVP (free) or ticket (paid) state and actions for one event, shared by the action panel and the mobile bar. */
export function useEventBooking({ eventId, date, startTime, price, payOnline = false, payOnWhatsapp = false, signupClosesAt, tiers = [] }: EventBookingInput) {
  const router = useRouter();
  const state = useParticipation();
  const pricing = parseEventPrice(price);
  const paid = pricing.kind === "paid";
  const booking = state.rsvps.find(rsvp => rsvp.eventId === eventId && rsvp.status === "confirmed");
  /** A seat held while its payment completes: not a ticket until the payment is confirmed. */
  const hold = state.rsvps.find(rsvp => rsvp.eventId === eventId && rsvp.status === "pending" && ticketHoldEndsAt(rsvp.createdAt) > state.observedAt);
  const holdUntil = hold ? new Date(ticketHoldEndsAt(hold.createdAt)).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : undefined;
  /** Unpaid amount (paise) on a ticket issued before online payment, when the organizer collected at the event. */
  const due = booking?.amount && booking.paymentStatus !== "paid" ? booking.amount : 0;
  // Booking closes at the start, or at the end for a session that takes late sign-ups.
  const closesAt = Date.parse(signupClosesAt ?? "");
  const started = state.loaded && (Number.isFinite(closesAt) ? closesAt : indiaDateTime(date, startTime).getTime()) <= state.observedAt;
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  // Cancelling gives the spot away, so it takes a second, deliberate tap.
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [chosenTier, setChosenTier] = useState<string | undefined>(undefined);
  /** The ticket type being bought: the one picked, else the held one, else the first. */
  const tier = tiers.find(item => item.id === chosenTier) ?? tiers.find(item => item.id === hold?.ticketTier) ?? tiers[0];
  const fullPrice = tier ? tier.price * 100 : pricing.amount;
  /** A running hold is paid at its own price, unless another type was picked. */
  const holdApplies = Boolean(hold?.amount) && (!tier || hold?.ticketTier === tier.id);
  const [, startNavigation] = useTransition();
  const sellsTickets = payOnline || payOnWhatsapp;

  useEffect(() => {
    if (!confirmCancel) return;
    const timeout = window.setTimeout(() => setConfirmCancel(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [confirmCancel]);

  useEffect(() => {
    // Back from PayU without paying: the browser may restore this page as it was mid-redirect.
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setPending(false);
      void refreshParticipation();
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  function showFeedback(message: string): void {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2800);
  }

  /** A free event's RSVP, or cancelling. A paid event's ticket goes through pay(). */
  async function request(method: "POST" | "DELETE"): Promise<void> {
    const ticketed = Boolean(booking?.amount);
    setPending(true);
    try {
      const response = await fetch("/api/participation/rsvp", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (response.status === 401) {
        router.push(loginUrl());
        return;
      }
      const data = await response.json().catch(() => null) as { rsvped?: boolean; error?: string; code?: string } | null;
      if (!response.ok) {
        // The event became paid since the page loaded; reload it to offer tickets instead.
        if (data?.code === "PAYMENT_REQUIRED") router.refresh();
        throw new Error(data?.error || (ticketed ? "Could not update your ticket" : "Could not update RSVP"));
      }
      await refreshParticipation();
      showFeedback(!data?.rsvped ? (ticketed ? "Ticket cancelled" : "RSVP cancelled") : "You're going. See you there!");
      router.refresh();
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "Could not update RSVP");
    } finally {
      setPending(false);
    }
  }

  /** Holds the seat, then hands the browser to PayU. Stays pending while the page unloads. */
  async function pay(phone: string): Promise<void> {
    trackMetric("event", eventId, "pay");
    setPending(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/payments/payu/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, phone, ...(tier && !due ? { tier: tier.id } : {}), ...(coupon ? { amount: coupon.amount, coupon: coupon.code } : { amount: holdApplies ? hold!.amount : due || fullPrice }) }),
      });
      if (response.status === 401) {
        setPending(false);
        router.push(loginUrl());
        return;
      }
      const data = await response.json().catch(() => null) as { action?: string; fields?: Record<string, string>; error?: string; code?: string } | null;
      if (!response.ok || !data?.action || !data.fields) {
        if (data?.code === "PRICE_CHANGED") router.refresh();
        // The code stopped working (expired or used up) since it was applied: pay without it, or try another.
        if (data?.code?.startsWith("COUPON_") || data?.code === "PRICE_CHANGED") setCoupon(null);
        throw new Error(data?.error || "Could not start the payment");
      }
      postToGateway(data.action, data.fields);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start the payment");
      setPending(false);
      // The seat may already be held even though the payment didn't start.
      void refreshParticipation();
    }
  }

  /** Books the spot to pay later: the payment link goes to the WhatsApp number given. The page then celebrates the confirmed spot. */
  async function reserve({ name, phone }: TicketContact): Promise<void> {
    trackMetric("event", eventId, "pay");
    setPending(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/participation/reserve", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, amount: pricing.amount, name, phone }),
      });
      if (response.status === 401) {
        setPending(false);
        router.push(loginUrl());
        return;
      }
      const data = await response.json().catch(() => null) as { rsvped?: boolean; error?: string; code?: string } | null;
      if (!response.ok || !data?.rsvped) {
        if (data?.code === "PRICE_CHANGED" || data?.code === "PAY_ONLINE") router.refresh();
        throw new Error(data?.error || "Could not book your spot");
      }
      await refreshParticipation();
      // The event page shows the confirmed spot with confetti; the summary closes as it arrives.
      startNavigation(() => {
        setCheckoutOpen(false);
        setPending(false);
        router.replace(`${window.location.pathname}?booked=1`, { scroll: false });
      });
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not book your spot");
      setPending(false);
      void refreshParticipation();
    }
  }

  /** Checks a discount code with the server and, if it works, shows the discounted price. Returns an error message, or null. */
  async function applyCoupon(code: string): Promise<string | null> {
    try {
      const response = await fetch("/api/payments/coupon", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, code, ...(tier ? { tier: tier.id } : {}) }),
      });
      if (response.status === 401) { router.push(loginUrl()); return null; }
      const data = await response.json().catch(() => null) as (Partial<AppliedCoupon> & { error?: string }) | null;
      if (!response.ok || !data?.code || typeof data.amount !== "number") return data?.error || "That discount code couldn’t be applied";
      setCoupon({ code: data.code, amount: data.amount, label: data.label ?? "Discount", priceLabel: data.priceLabel ?? formatInr(data.amount) });
      return null;
    } catch {
      return "That discount code couldn’t be checked. Try again.";
    }
  }

  function openCheckout(): void {
    setCheckoutError(null);
    setCheckoutOpen(true);
    // An event page's flourish (LaserBurst) plays as the summary opens.
    window.dispatchEvent(new Event(CHECKOUT_OPEN_EVENT));
  }

  /** The one button: sign in, RSVP, open the ticket summary (to pay or book), or (on a second tap) cancel. */
  function act(): void {
    // Get ticket / RSVP taps, signed in or not (signing in is a step of the same intent).
    if (!booking && !started && !confirmCancel) trackMetric("event", eventId, "cta");
    if (!state.authenticated && !state.error) { router.push(loginUrl()); return; }
    if (booking) {
      if (!confirmCancel) { setConfirmCancel(true); return; }
      setConfirmCancel(false);
      void request("DELETE");
      return;
    }
    if (paid) { if (sellsTickets) openCheckout(); return; }
    void request("POST");
  }

  /** A spot booked to pay on WhatsApp is confirmed, though its ticket isn't paid for yet. */
  const bookedLabel = !booking ? "" : !booking.amount ? "You're going" : due && booking.whatsapp ? "Spot confirmed" : "Ticket booked";
  const label = confirmCancel ? "Tap again to cancel"
    : booking ? bookedLabel
    : started ? (paid ? "Ticket sales closed" : "RSVP closed")
    : paid && !sellsTickets ? "Tickets not on sale"
    : hold && payOnline ? "Complete payment"
    : paid ? "Get ticket"
    : state.loaded && !state.authenticated && !state.error ? "Sign in to RSVP" : "RSVP";

  return {
    pricing, booking, bookedLabel, hold, holdUntil, due, pending, feedback, confirmCancel, label, act, showFeedback,
    disabled: pending || !state.loaded || started || (paid && !booking && !sellsTickets),
    /** Pay a held ticket online; absent when there is nothing to pay or no online payment. */
    payDue: due && payOnline && !started ? openCheckout : undefined,
    checkout: {
      open: checkoutOpen, error: checkoutError,
      priceLabel: coupon ? coupon.priceLabel : holdApplies ? formatInr(hold!.amount!) : due ? formatInr(due) : formatInr(fullPrice),
      /** Before any discount: the price a new ticket of this type costs. */
      fullPriceLabel: formatInr(fullPrice),
      /** Picking a type, when the event sells several. Another type drops an applied code: it's priced afresh. */
      tiers: tiers.length > 1 && !due ? { list: tiers, selected: tier?.id, choose: (id: string) => { setChosenTier(id); setCoupon(null); } } : undefined,
      /** Discount codes are for new online tickets, not a ticket already issued with a price due. */
      coupons: payOnline && !due ? { applied: coupon, apply: applyCoupon, remove: () => setCoupon(null) } : undefined,
      mode: payOnWhatsapp && !due ? "whatsapp" as const : "online" as const,
      close: () => setCheckoutOpen(false),
      confirm: (contact: TicketContact) => void (payOnWhatsapp && !due ? reserve(contact) : pay(contact.phone)),
    },
  };
}
