"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUrl, refreshParticipation, useParticipation } from "./useParticipation";
import { indiaDateTime } from "@/lib/calendar";
import { parseEventPrice } from "@/lib/pricing";

export interface EventBookingInput {
  eventId: string;
  date: string;
  startTime: string;
  price: string;
}

/** RSVP (free) or ticket (paid) state and actions for one event, shared by the action panel and the mobile bar. */
export function useEventBooking({ eventId, date, startTime, price }: EventBookingInput) {
  const router = useRouter();
  const state = useParticipation();
  const pricing = parseEventPrice(price);
  const paid = pricing.kind === "paid";
  const booking = state.rsvps.find(rsvp => rsvp.eventId === eventId && rsvp.status === "confirmed");
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

  /** The one button: sign in, RSVP, open the ticket summary, or (on a second tap) cancel. */
  function act(): void {
    if (!state.authenticated && !state.error) { router.push(loginUrl()); return; }
    if (booking) {
      if (!confirmCancel) { setConfirmCancel(true); return; }
      setConfirmCancel(false);
      void request("DELETE");
      return;
    }
    if (paid) { setCheckoutError(null); setCheckoutOpen(true); return; }
    void request("POST");
  }

  const label = confirmCancel ? "Tap again to cancel"
    : booking ? (booking.amount ? "Ticket booked" : "You're going")
    : started ? (paid ? "Ticket sales closed" : "RSVP closed")
    : paid ? "Get ticket"
    : state.loaded && !state.authenticated && !state.error ? "Sign in to RSVP" : "RSVP";

  return {
    pricing, booking, pending, feedback, confirmCancel, label, act, showFeedback,
    disabled: pending || !state.loaded || started,
    checkout: { open: checkoutOpen, error: checkoutError, close: () => setCheckoutOpen(false), confirm: () => void request("POST") },
  };
}
