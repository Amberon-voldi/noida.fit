import "server-only";

import { z } from "zod";
import type { AuthUser } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { normalizeIndianMobile } from "@/lib/phone";
import { MAX_TICKET_RUPEES, PAID_TICKET_BOOKING } from "@/lib/pricing";
import { assertPayuConfigured, newTxnId, payuCheckoutForm, verifyPayuTransaction, type PayuCheckoutForm } from "@/lib/payments/payu";
import { sendSpotConfirmedEmail } from "@/lib/services/booking-emails";
import { confirmTicketPayment, documentIdSchema, getTicketEvent, getUserRsvp, holdTicket, reserveTicket, type RSVP } from "@/lib/services/participation";

/** `amount` (paise) is the price the member confirmed: the page price for a new ticket, the issued price for a held one. */
export const ticketPaymentInputSchema = z.object({
  eventId: documentIdSchema,
  amount: z.number().int().positive().max(MAX_TICKET_RUPEES * 100),
  phone: z.string().trim().max(20),
  /** A discount code the member applied; the amount is then the discounted price. */
  coupon: z.string().trim().max(40).optional(),
  /** The ticket type, for events that sell several. */
  tier: z.string().regex(/^[a-z0-9]{6}$/).optional(),
}).strict();

export const PAYU_RETURN_PATH = "/api/payments/payu/return";

/**
 * Holds the member's seat for TICKET_HOLD_MINUTES (status "pending", not yet a ticket) and returns the
 * signed form that takes them to PayU. The ticket is confirmed only when PayU confirms the payment
 * (settlePayuTransaction). A hold is charged at the price it was taken at; one left unpaid runs out
 * and its seat can go to someone else.
 */
export async function startTicketPayment(user: Pick<AuthUser, "id" | "name" | "email">, input: z.infer<typeof ticketPaymentInputSchema>, origin: string): Promise<PayuCheckoutForm> {
  assertPayuConfigured();
  const phone = normalizeIndianMobile(input.phone);
  if (!phone) throw new HttpError(400, "PHONE_INVALID", "Enter a 10-digit Indian mobile number");
  const event = await getTicketEvent(input.eventId);
  if (event.demo) throw new HttpError(409, "DEMO_EVENT", "This is a demo listing, so it can’t take a payment");
  const ticket = await holdTicket(user.id, input.eventId, input.amount, input.coupon || undefined, input.tier);
  if (!ticket.amount) throw new HttpError(409, "NO_TICKET_DUE", "You already have a free RSVP for this event");
  if (ticket.paymentStatus === "paid") throw new HttpError(409, "TICKET_PAID", "Your ticket is already paid for");
  return payuCheckoutForm({
    txnid: newTxnId(), amount: ticket.amount, productinfo: event.title, firstname: user.name, email: user.email, phone,
    returnUrl: `${origin}${PAYU_RETURN_PATH}`, eventId: input.eventId, userId: user.id,
  });
}

/** A spot booked to pay later: the price the member confirmed, and the name and WhatsApp number the payment link is for. */
export const ticketReservationInputSchema = z.object({
  eventId: documentIdSchema,
  amount: z.number().int().positive().max(MAX_TICKET_RUPEES * 100),
  name: z.string().max(200),
  phone: z.string().trim().max(20),
}).strict();

/** The name a member gives for their spot, as one line of plain text. */
function contactName(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60).trim();
}

/**
 * While online payment is off (PAID_TICKET_BOOKING is "whatsapp"), confirms the member's spot with its price
 * due (reserveTicket); the organizer sends the payment link to the WhatsApp number they give. A newly booked
 * spot is emailed to the member (best effort); a repeat tap on a spot they already hold sends nothing.
 * Demo listings never take a booking that asks for money.
 */
export async function reserveTicketOnWhatsapp(user: Pick<AuthUser, "id">, input: z.infer<typeof ticketReservationInputSchema>): Promise<RSVP> {
  if (PAID_TICKET_BOOKING !== "whatsapp") throw new HttpError(409, "PAY_ONLINE", "Tickets for this event are paid online. Reload the page to pay.");
  const phone = normalizeIndianMobile(input.phone);
  if (!phone) throw new HttpError(400, "PHONE_INVALID", "Enter a 10-digit Indian WhatsApp number");
  const name = contactName(input.name);
  if (name.length < 2) throw new HttpError(400, "NAME_REQUIRED", "Enter your name");
  const event = await getTicketEvent(input.eventId);
  if (event.demo) throw new HttpError(409, "DEMO_EVENT", "This is a demo listing, so it can’t take a booking");
  const before = await getUserRsvp(input.eventId, user.id);
  const rsvp = await reserveTicket(user.id, input.eventId, input.amount, { name, phone });
  if (before?.status !== "confirmed" && rsvp.status === "confirmed") await sendSpotConfirmedEmail(user.id, rsvp);
  return rsvp;
}

export type PaymentOutcome = "paid" | "failed" | "pending" | "refund";

/**
 * Applies a PayU transaction to its ticket, taking PayU's Verify Payment API (never the posted
 * fields) as the record. Safe to repeat: the return redirect and the webhook both call it.
 */
export async function settlePayuTransaction(txnid: string): Promise<{ outcome: PaymentOutcome; eventId?: string }> {
  const transaction = await verifyPayuTransaction(txnid);
  if (!transaction) return { outcome: "pending" };
  const { eventId, userId, mihpayid } = transaction;
  if (transaction.status !== "success") return { outcome: transaction.status === "failure" ? "failed" : "pending", eventId };
  try {
    if (!eventId || !userId) throw new HttpError(404, "TICKET_NOT_FOUND", "The payment names no ticket");
    await confirmTicketPayment(eventId, userId, transaction.amount, `payu:${txnid}:${mihpayid}`);
    return { outcome: "paid", eventId };
  } catch (error) {
    // 404/409: the money arrived but no ticket can take it. Anything else is transient; let the caller retry.
    const unsettleable = error instanceof z.ZodError || (error instanceof HttpError && (error.status === 404 || error.status === 409));
    if (!unsettleable) throw error;
    // No account details in logs: the PayU transaction's udf2 names the member.
    console.error("[PayU] Captured payment has no ticket to settle; refund it from the PayU dashboard", { txnid, mihpayid, eventId, code: error instanceof HttpError ? error.code : "INVALID_TICKET_REFERENCE" });
    return { outcome: "refund", eventId };
  }
}
