"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CalendarPlus, Check, Share2, X } from "lucide-react";
import { ListingImage } from "@/components/discovery/ListingImage";
import { createIcs } from "@/lib/calendar";
import { formatIndianMobile } from "@/lib/phone";

/** What the member just booked, as printed on their ticket. */
export interface BookedTicket {
  eventId: string;
  eventSlug: string;
  title: string;
  date: string;
  /** Display date, e.g. "Wed, 18 Nov". */
  dateLabel: string;
  startTime: string;
  endTime: string;
  venueName: string;
  sector: string;
  communityName?: string;
  category?: string;
  image?: string;
  seatNumber?: number;
  /** "paid" shows the price stamped PAID; "gift" stamps it GIFTED; "reserved" (booked to pay on WhatsApp) stamps it CONFIRMED. */
  kind: "paid" | "gift" | "reserved";
  /** The price, e.g. "₹99". */
  priceLabel?: string;
  /** A reserved spot's WhatsApp number, where its payment link goes. */
  whatsapp?: string;
  /** The ticket holder's name. */
  holder?: string;
  /** "See you tomorrow at 06:00 AM", computed where the time is known. */
  countdown: string;
}

/** The guest pass QR's element ID (components/gifts/GuestPass.tsx), scrolled into view after the celebration. */
export const GUEST_PASS_QR_ID = "guest-pass-qr";

const COLORS = ["#9ddc2e", "#b5f043", "#ffffff", "#facc15", "#38bdf8", "#f472b6"];

/** Two confetti cannons from the bottom corners, then a slower fall from the top as the stamp lands. Returns a stop function. */
function fireConfetti(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);
  const piece = (index: number, rain: boolean) => {
    const left = index % 2 === 0;
    return {
      x: rain ? Math.random() * width : left ? -8 : width + 8, y: rain ? -20 - Math.random() * height * 0.4 : height * 0.72,
      vx: rain ? (Math.random() - 0.5) * 2 : (left ? 1 : -1) * (3 + Math.random() * (width / 70)), vy: rain ? 1 + Math.random() * 2 : -(10 + Math.random() * 10),
      gravity: rain ? 0.05 : 0.34, delay: rain ? 1100 : 0,
      size: 6 + Math.random() * 7, rotation: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.35,
      wobble: Math.random() * Math.PI * 2, color: COLORS[index % COLORS.length], shape: index % 3,
    };
  };
  const pieces = [...Array.from({ length: 150 }, (_, index) => piece(index, false)), ...Array.from({ length: 90 }, (_, index) => piece(index, true))];
  const duration = 4600;
  const begin = performance.now();
  let frame = 0;
  const tick = (time: number) => {
    const elapsed = time - begin;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = Math.max(0, Math.min(1, (duration - elapsed) / 900));
    for (const piece of pieces) {
      if (elapsed < piece.delay) continue;
      piece.vy += piece.gravity;
      piece.vx *= 0.985;
      piece.wobble += 0.12;
      piece.x += piece.vx + Math.sin(piece.wobble) * 0.8;
      piece.y += piece.vy;
      piece.rotation += piece.spin;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      if (piece.shape === 0) context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      else if (piece.shape === 1) { context.beginPath(); context.arc(0, 0, piece.size / 3, 0, Math.PI * 2); context.fill(); }
      else context.fillRect(-1.5, -piece.size / 2, 3, piece.size * Math.abs(Math.cos(piece.wobble)));
      context.restore();
    }
    if (elapsed < duration) frame = requestAnimationFrame(tick);
    else context.clearRect(0, 0, width, height);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

/** Saves the session to the member's calendar as an .ics download. False when the browser couldn't. */
export function downloadTicketCalendar(ticket: BookedTicket): boolean {
  try {
    const blob = new Blob([createIcs(ticket)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${ticket.eventSlug}.ics`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/** The printed ticket: the session up top, a tear-off stub with the holder below. `qr` replaces the stub's barcode with a real check-in QR. */
export function TicketCard({ ticket, qr }: { ticket: BookedTicket; qr?: ReactNode }) {
  const stamp = ticket.kind === "gift" ? "Gifted" : ticket.kind === "reserved" ? "Confirmed" : `${ticket.priceLabel ?? ""} paid`.trim();
  return <>
    <article className={qr ? "ticket ticket-pass" : "ticket"} aria-label={`Your ticket for ${ticket.title}`}>
      <div className="ticket-main">
        <div className="ticket-media">
          <ListingImage src={ticket.image} category={ticket.category} alt="" sizes="420px" />
          <div className="ticket-media-shade" />
          <div className="ticket-media-text">
            {ticket.communityName && <p className="ticket-club">{ticket.communityName}</p>}
            <h3 className="ticket-title">{ticket.title}</h3>
          </div>
        </div>
        <dl className="ticket-details">
          <div><dt>Date</dt><dd>{ticket.dateLabel}</dd></div>
          <div><dt>Time</dt><dd>{ticket.startTime}</dd></div>
          <div><dt>Where</dt><dd>{ticket.venueName}, {ticket.sector}</dd></div>
          <div className="ticket-stamp-cell" aria-hidden="true"><span className="ticket-stamp">{stamp}</span></div>
        </dl>
      </div>
      <div className={qr ? "ticket-stub ticket-stub-pass" : "ticket-stub"}>
        <div className="min-w-0">
          <p className="ticket-admit">Admit one{ticket.seatNumber ? ` · Spot #${ticket.seatNumber}` : ""}</p>
          {ticket.holder && <p className="ticket-holder">{ticket.holder}</p>}
        </div>
        {qr ?? <span className="ticket-barcode" aria-hidden="true" />}
      </div>
    </article>
    <p className="sr-only">{stamp}{ticket.seatNumber ? `, spot ${ticket.seatNumber}` : ""}.</p>
  </>;
}

/**
 * The moment a booking lands: confetti, a big "You're in!", and the member's ticket dropping in and
 * getting stamped. Opens as soon as it mounts (or when `open` turns true). Motion is skipped for people
 * who ask for reduced motion; the ticket itself is the same. `clearParam` names the query parameter that
 * brought the member here, dropped so a refresh doesn't replay it. A `guest` (no account) is already on
 * their guest pass page, so Done takes them to its QR instead of a .fit ID.
 */
export function TicketConfirmation({ ticket, open = true, onClose, clearParam, guest = false }: { ticket: BookedTicket; open?: boolean; onClose?: () => void; clearParam?: string; guest?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleId = useId();
  const [shared, setShared] = useState<string | null>(null);

  useEffect(() => {
    if (!clearParam) return;
    // A refresh or a shared link shouldn't throw the party again.
    const url = new URL(window.location.href);
    url.searchParams.delete(clearParam);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [clearParam]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = !calm && canvasRef.current ? fireConfetti(canvasRef.current) : () => {};
    // A little thump in the hand as the stamp lands, where phones support it.
    const buzz = calm ? 0 : window.setTimeout(() => navigator.vibrate?.([14, 50, 28]), 1150);
    // Done, Escape or the backdrop close the dialog while it stays mounted: give the page its scroll back then.
    const release = () => {
      stop();
      window.clearTimeout(buzz);
      document.body.style.overflow = overflow;
    };
    dialog.addEventListener("close", release);
    return () => {
      dialog.removeEventListener("close", release);
      release();
      if (dialog.open) dialog.close();
    };
  }, [open]);

  function close(): void {
    dialogRef.current?.close();
  }

  /** A guest is already on their pass page: close and bring its QR into view. */
  function showPass(): void {
    close();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(GUEST_PASS_QR_ID)?.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
  }

  function addToCalendar(): void {
    if (!downloadTicketCalendar(ticket)) setShared("Calendar details unavailable");
  }

  async function share(): Promise<void> {
    const url = `${window.location.origin}/event/${ticket.eventSlug}`;
    const text = `I’m going to ${ticket.title} on ${ticket.dateLabel}! Come along:`;
    try {
      if (navigator.share) await navigator.share({ title: ticket.title, text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setShared("Link copied"); }
    } catch {
      // Native share cancellation is intentionally silent.
    }
  }

  return <dialog ref={dialogRef} aria-labelledby={titleId} className="ticket-dialog" onClose={() => onClose?.()} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <canvas ref={canvasRef} className="ticket-confetti" aria-hidden="true" />
    {/* Focus starts on the body, not the close button: Tab still reaches every control. */}
    <div className="ticket-dialog-body" tabIndex={-1} autoFocus>
      <button type="button" aria-label="Close" onClick={close} className="ticket-close"><X className="h-5 w-5" aria-hidden="true" /></button>
      <div className="ticket-check" aria-hidden="true"><Check strokeWidth={3} /></div>
      {ticket.kind === "reserved" ? <>
        <h2 id={titleId} className="ticket-headline">Spot <span>confirmed!</span></h2>
        <p className="ticket-lede">Congratulations! We’ll share your {ticket.priceLabel ? `${ticket.priceLabel} ` : ""}payment link on WhatsApp{ticket.whatsapp ? <> at <strong className="whitespace-nowrap text-white">{formatIndianMobile(ticket.whatsapp)}</strong></> : null}. {ticket.countdown}.</p>
      </> : <>
        <h2 id={titleId} className="ticket-headline">You’re <span>in!</span></h2>
        <p className="ticket-lede">{ticket.kind === "gift" ? "Your gifted spot is confirmed." : "Payment received. Your ticket is confirmed."} {ticket.countdown}.</p>
      </>}

      <TicketCard ticket={ticket} />

      <div className="ticket-actions">
        {guest
          ? <button type="button" onClick={showPass} className="button-primary w-full">See my guest pass</button>
          : <Link href="/account" className="button-primary w-full">Show my .fit ID</Link>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={addToCalendar} className="button-secondary"><CalendarPlus className="h-4 w-4" aria-hidden="true" />Add to calendar</button>
          <button type="button" onClick={share} className="button-secondary"><Share2 className="h-4 w-4" aria-hidden="true" />Tell friends</button>
        </div>
        <p className="text-center text-xs text-text-secondary" role="status">{shared ?? (guest ? "Your gift link opens this pass on any phone. Show its QR at the door." : "On the day, open your .fit ID and flip it to the check-in QR.")}</p>
        <button type="button" onClick={close} className="mx-auto block min-h-11 px-4 text-sm font-semibold text-text-secondary hover:text-white">Done</button>
      </div>
    </div>
  </dialog>;
}
