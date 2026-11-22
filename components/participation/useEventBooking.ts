"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginUrl, refreshParticipation, useParticipation } from "./useParticipation";
import { indiaDateTime } from "@/lib/calendar";
import { formatInr, parseEventPrice, ticketHoldEndsAt } from "@/lib/pricing";

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
export function useEventBooking({ eventId, date, startTime, price, payOnline = false, payOnWhatsapp = false, signupClosesAt }: EventBookingInput) {
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
    setPending(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/payments/payu/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, amount: hold?.amount ?? (due || pricing.amount), phone }),
      });
      if (response.status === 401) {
        setPending(false);
        router.push(loginUrl());
        return;
      }
      const data = await response.json().catch(() => null) as { action?: string; fields?: Record<string, string>; error?: string; code?: string } | null;
      if (!response.ok || !data?.action || !data.fields) {
        if (data?.code === "PRICE_CHANGED") router.refresh();
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

  function openCheckout(): void {
    setCheckoutError(null);
    setCheckoutOpen(true);
  }

  /** The one button: sign in, RSVP, open the ticket summary (to pay or book), or (on a second tap) cancel. */
  function act(): void {
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
      open: checkoutOpen, error: checkoutError, priceLabel: hold?.amount ? formatInr(hold.amount) : due ? formatInr(due) : pricing.label,
      mode: payOnWhatsapp && !due ? "whatsapp" as const : "online" as const,
      close: () => setCheckoutOpen(false),
      confirm: (contact: TicketContact) => void (payOnWhatsapp && !due ? reserve(contact) : pay(contact.phone)),
    },
  };
}
