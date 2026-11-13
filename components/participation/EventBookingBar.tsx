"use client";

import Link from "next/link";
import { Check, LoaderCircle } from "lucide-react";
import { formatInr } from "@/lib/pricing";
import { TicketCheckout } from "./TicketCheckout";
import { useEventBooking } from "./useEventBooking";

export interface EventBookingBarProps {
  eventId: string;
  title: string;
  date: string;
  startTime: string;
  venueName: string;
  price: string;
  /** Display date and time, e.g. "Sat, 15 Nov · 06:00 AM". */
  when: string;
  spotsLeft?: number;
}

/** Below desktop width: the price, the essentials and the one action, always within reach.
 * Floats directly above the dock (globals.css). Cancelling stays in the page's action panel. */
export function EventBookingBar(props: EventBookingBarProps) {
  const { pricing, booking, pending, feedback, label, act, disabled, checkout } = useEventBooking(props);
  const availability = props.spotsLeft === undefined ? "" : props.spotsLeft <= 0 ? " · Full" : props.spotsLeft <= 10 ? ` · ${props.spotsLeft} spot${props.spotsLeft === 1 ? "" : "s"} left` : "";

  return (
    <>
      <aside aria-label="Book this event" className="event-booking-bar lg:hidden">
        {feedback && <p className="event-booking-toast" role="status" aria-live="polite">{feedback}</p>}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {booking ? <>
              <p className="flex items-center gap-1.5 text-sm font-bold text-velocity"><Check className="h-4 w-4 shrink-0" aria-hidden="true" />{booking.amount ? "Ticket booked" : "You're going"}</p>
              <p className="truncate text-xs text-text-secondary">Spot #{booking.seatNumber}{booking.amount ? ` · ${formatInr(booking.amount)} ${booking.paymentStatus === "paid" ? "paid" : "due"}` : ""} · {props.when}</p>
            </> : <>
              <p className="truncate font-mono text-lg font-bold leading-tight text-white">{pricing.label}</p>
              <p className="truncate text-xs text-text-secondary">{props.when}{availability}</p>
            </>}
          </div>
          {booking
            ? <Link href="/account" className="button-secondary shrink-0">Show .fit ID</Link>
            : <button type="button" onClick={act} disabled={disabled} className="button-primary min-w-32 whitespace-nowrap">
                {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {label}
              </button>}
        </div>
      </aside>
      <TicketCheckout open={checkout.open} title={props.title} when={props.when} venueName={props.venueName} priceLabel={pricing.label} pending={pending} error={checkout.error} onConfirm={checkout.confirm} onClose={checkout.close} />
    </>
  );
}
