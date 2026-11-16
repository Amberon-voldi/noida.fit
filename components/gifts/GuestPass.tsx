"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarPlus, MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { downloadTicketCalendar, GUEST_PASS_QR_ID, TicketCard, type BookedTicket } from "@/components/participation/TicketConfirmation";
import { guestQrValue } from "@/lib/check-in-qr";
import type { GuestPassState } from "@/lib/services/gifts";

const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

interface Props {
  passId: string;
  ticket: BookedTicket;
  state: GuestPassState;
  checkedInAt?: string;
  /** Google Maps search for the venue; absent on demo listings. */
  directions?: string;
}

/** A guest's ticket when they claimed a gift without an account: the check-in desk scans its QR. */
export function GuestPass({ passId, ticket, state, checkedInAt, directions }: Props) {
  const [calendarFailed, setCalendarFailed] = useState(false);
  const club = ticket.communityName ?? "the organizer";
  const heading = { valid: "You’re on the list", "checked-in": "You’re checked in", ended: "This session has ended", cancelled: "This session was cancelled", void: "This pass is no longer valid" }[state];
  const lede = {
    valid: `Show this QR at the door. ${ticket.countdown}.`,
    "checked-in": `The desk checked you in${checkedInAt ? ` at ${timeFormatter.format(new Date(checkedInAt))}` : ""}. Enjoy the session!`,
    ended: "Thanks for being part of it.",
    cancelled: `${club} cancelled this session, so you won’t need your pass.`,
    void: `Your spot isn’t on the guest list any more. If that’s a surprise, contact ${club}.`,
  }[state];
  const overlay = state === "checked-in" ? `Checked in${checkedInAt ? ` · ${timeFormatter.format(new Date(checkedInAt))}` : ""}` : state === "valid" ? null : heading;
  const qr = <div id={GUEST_PASS_QR_ID} className="ticket-qr" data-dim={overlay ? "" : undefined}>
    <QRCodeSVG value={guestQrValue(passId)} size={232} marginSize={2} bgColor="#ffffff" fgColor="#090a0f" role="img" aria-label={overlay ? "Your guest pass QR code, no longer needed" : "Your guest pass check-in QR code"} />
    {overlay && <p className="ticket-qr-note">{overlay}</p>}
  </div>;

  return <div className="mx-auto w-full max-w-[420px]">
    <p className={`font-mono text-xs uppercase tracking-widest ${state === "valid" || state === "checked-in" ? "text-velocity" : "text-text-secondary"}`}>Guest pass</p>
    <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{heading}</h1>
    <p className="mt-2 leading-relaxed text-text-secondary" role="status">{lede}</p>
    <TicketCard ticket={ticket} qr={qr} />
    <div className="mt-6 grid gap-2">
      {state === "valid" && <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setCalendarFailed(!downloadTicketCalendar(ticket))} className="button-secondary justify-center"><CalendarPlus className="h-4 w-4" aria-hidden="true" />Add to calendar</button>
        {directions
          ? <a href={directions} target="_blank" rel="noopener noreferrer" className="button-secondary justify-center"><MapPin className="h-4 w-4" aria-hidden="true" />Directions</a>
          : <span />}
      </div>}
      {calendarFailed && <p className="text-xs text-rose-200" role="alert">Calendar details unavailable. Add the date and time by hand.</p>}
      <Link href={`/event/${ticket.eventSlug}`} className="inline-flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-velocity hover:text-velocity-glow">About this session <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
    {state === "valid" && <p className="mt-4 rounded-xl border border-border-subtle bg-surface p-4 text-xs leading-relaxed text-text-secondary">This page is your ticket, no account needed. Bookmark it or take a screenshot of the QR. Anyone with the link can use it, so keep it to yourself.</p>}
  </div>;
}
