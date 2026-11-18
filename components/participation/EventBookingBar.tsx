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
  /** PayU is set up and this is a real listing: tickets are paid online. */
  payOnline?: boolean;
  /** Online payment is off: a spot is booked with a WhatsApp number, and the payment link is sent there. */
  payOnWhatsapp?: boolean;
  /** The mobile number the member last gave, to pre-fill checkout. */
  savedPhone?: string;
  /** The account's name and email, shown when booking to pay on WhatsApp. */
  savedName?: string;
  accountEmail?: string;
}

/** Below desktop width: the price, the essentials and the one action, always within reach.
 * Floats directly above the dock (globals.css). Cancelling stays in the page's action panel. */
export function EventBookingBar(props: EventBookingBarProps) {
  const { pricing, booking, bookedLabel, hold, holdUntil, due, payDue, pending, feedback, label, act, disabled, checkout } = useEventBooking(props);
  const availability = props.spotsLeft === undefined ? "" : props.spotsLeft <= 0 ? " · Full" : props.spotsLeft <= 10 ? ` · ${props.spotsLeft} spot${props.spotsLeft === 1 ? "" : "s"} left` : "";

  return (
    <>
      <aside aria-label="Book this event" className="event-booking-bar lg:hidden">
        {feedback && <p className="event-booking-toast" role="status" aria-live="polite">{feedback}</p>}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {booking ? <>
              <p className="flex items-center gap-1.5 text-sm font-bold text-velocity"><Check className="h-4 w-4 shrink-0" aria-hidden="true" />{bookedLabel}</p>
              <p className="truncate text-xs text-text-secondary">Spot #{booking.seatNumber}{booking.amount ? ` · ${formatInr(booking.amount)} ${due ? (booking.whatsapp ? "due, link on WhatsApp" : "due") : "paid"}` : ""} · {props.when}</p>
            </> : <>
              <p className="truncate font-mono text-lg font-bold leading-tight text-white">{pricing.label}</p>
              <p className="truncate text-xs text-text-secondary">{hold && props.payOnline ? `Spot held until ${holdUntil}` : `${props.when}${availability}`}</p>
            </>}
          </div>
          {payDue
            ? <button type="button" onClick={payDue} disabled={pending} className="button-primary shrink-0 whitespace-nowrap">
                {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Pay {formatInr(due)}
              </button>
            : booking
            ? <Link href="/account" className="button-secondary shrink-0">Show .fit ID</Link>
            : <button type="button" onClick={act} disabled={disabled} className="button-primary min-w-32 whitespace-nowrap">
                {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {label}
              </button>}
        </div>
      </aside>
      <TicketCheckout open={checkout.open} title={props.title} when={props.when} venueName={props.venueName} priceLabel={checkout.priceLabel} mode={checkout.mode} savedPhone={props.savedPhone} savedName={props.savedName} accountEmail={props.accountEmail} pending={pending} error={checkout.error} onConfirm={checkout.confirm} onClose={checkout.close} />
    </>
  );
}
