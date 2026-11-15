"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUrl, refreshParticipation, useParticipation } from "./useParticipation";
import { indiaDateTime } from "@/lib/calendar";
import { formatInr, parseEventPrice } from "@/lib/pricing";

export interface EventBookingInput {
  eventId: string;
  date: string;
  startTime: string;
  price: string;
  /** PayU is set up and this is a real listing: tickets are paid online. */
  payOnline?: boolean;
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
export function useEventBooking({ eventId, date, startTime, price, payOnline = false }: EventBookingInput) {
  const router = useRouter();
  const state = useParticipation();
  const pricing = parseEventPrice(price);
  const paid = pricing.kind === "paid";
  const booking = state.rsvps.find(rsvp => rsvp.eventId === eventId && rsvp.status === "confirmed");
  /** A held ticket's unpaid amount, in paise. */
  const due = booking?.amount && booking.paymentStatus !== "paid" ? booking.amount : 0;
  const started = state.loaded && indiaDateTime(date, startTime).getTime() <= state.observedAt;
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  // Cancelling gives the spot away, so it takes a second, deliberate tap.
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

  async function request(method: "POST" | "DELETE"): Promise<void> {
    const ticketed = booking ? Boolean(booking.amount) : paid;
    setPending(true);
    try {
      const response = await fetch("/api/participation/rsvp", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ...(method === "POST" && paid ? { amount: pricing.amount } : {}) }),
      });
      if (response.status === 401) {
        router.push(loginUrl());
        return;
      }
      const data = await response.json().catch(() => null) as { rsvped?: boolean; error?: string; code?: string } | null;
      if (!response.ok) {
        // The page's price is stale; reload it so the next confirmation shows the current one.
        if (data?.code === "PRICE_CHANGED") router.refresh();
        throw new Error(data?.error || (ticketed ? "Could not update your ticket" : "Could not update RSVP"));
      }
      await refreshParticipation();
      setCheckoutOpen(false);
      showFeedback(!data?.rsvped ? (ticketed ? "Ticket cancelled" : "RSVP cancelled") : ticketed ? `Ticket booked. ${pricing.label} is due to the organizer.` : "You're going. See you there!");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update RSVP";
      if (method === "POST" && paid) setCheckoutError(message); else showFeedback(message);
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
        body: JSON.stringify({ eventId, amount: due || pricing.amount, phone }),
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

  function openCheckout(): void {
    setCheckoutError(null);
    setCheckoutOpen(true);
  }

  /** The one button: sign in, RSVP, open the ticket summary, or (on a second tap) cancel. */
  function act(): void {
    if (!state.authenticated && !state.error) { router.push(loginUrl()); return; }
    if (booking) {
      if (!confirmCancel) { setConfirmCancel(true); return; }
      setConfirmCancel(false);
      void request("DELETE");
      return;
    }
    if (paid) { openCheckout(); return; }
    void request("POST");
  }

  const label = confirmCancel ? "Tap again to cancel"
    : booking ? (booking.amount ? "Ticket booked" : "You're going")
    : started ? (paid ? "Ticket sales closed" : "RSVP closed")
    : paid ? "Get ticket"
    : state.loaded && !state.authenticated && !state.error ? "Sign in to RSVP" : "RSVP";

  return {
    pricing, booking, due, pending, feedback, confirmCancel, label, act, showFeedback,
    disabled: pending || !state.loaded || started,
    /** Pay a held ticket online; absent when there is nothing to pay or no online payment. */
    payDue: due && payOnline && !started ? openCheckout : undefined,
    checkout: {
      open: checkoutOpen, error: checkoutError, payOnline, priceLabel: due ? formatInr(due) : pricing.label,
      close: () => setCheckoutOpen(false),
      confirm: (phone: string) => void (payOnline ? pay(phone) : request("POST")),
    },
  };
}
