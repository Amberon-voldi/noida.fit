import "server-only";

import { ID, Messaging, Users } from "node-appwrite";
import { appwriteErrorCause } from "@/lib/appwrite/errors";
import { getAdminClient } from "@/lib/appwrite/server";
import { getEventAnyStatus } from "@/lib/data";
import { spotConfirmedEmail } from "@/lib/email/spot-confirmed";
import type { RSVP } from "@/types/platform";

/** How long a booking waits for its email before answering the member anyway. */
const SEND_TIMEOUT_MS = 6_000;

/**
 * Emails a member the spot they just booked to pay on WhatsApp (lib/email/spot-confirmed.ts), through
 * Appwrite Messaging: the project's email provider sends it, from tickets@noida.fit, to the account's
 * email address. Needs an enabled email provider and the API key's messages.write scope. Best effort: a
 * booking never fails because its email didn't go; the reason is logged as Appwrite's error type only.
 */
export async function sendSpotConfirmedEmail(userId: string, rsvp: RSVP): Promise<boolean> {
  const contact = rsvp.whatsapp;
  const amount = rsvp.amount;
  if (!contact || !amount) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const send = async () => {
    const event = await getEventAnyStatus(rsvp.eventId);
    if (!event) throw new Error("EventNotFound");
    const email = spotConfirmedEmail({ event, seatNumber: rsvp.seatNumber, name: contact.name, phone: contact.phone, amount });
    await new Messaging(getAdminClient()).createEmail({ messageId: ID.unique(), subject: email.subject, content: email.html, users: [userId], html: true });
  };
  try {
    await Promise.race([send(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("TimedOut")), SEND_TIMEOUT_MS); })]);
    return true;
  } catch (error) {
    console.error("[booking-email] Spot confirmation email not sent; the booking stands", { cause: appwriteErrorCause(error) });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Emails a member the ticket they just paid for online (PayU), once, when the payment confirms it: the
 * return page, the webhook or an admin settling it by hand. Same provider, sender and best effort as above.
 */
export async function sendTicketPaidEmail(userId: string, rsvp: RSVP): Promise<boolean> {
  const amount = rsvp.amount;
  if (!amount || rsvp.paymentStatus !== "paid") return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const send = async () => {
    const event = await getEventAnyStatus(rsvp.eventId);
    if (!event) throw new Error("EventNotFound");
    const user = await new Users(getAdminClient()).get({ userId }).catch(() => null);
    const tierName = event.tiers?.find(tier => tier.id === rsvp.ticketTier)?.name;
    const email = spotConfirmedEmail({ event, seatNumber: rsvp.seatNumber, name: user?.name || "there", phone: "", amount, paid: true, tierName });
    await new Messaging(getAdminClient()).createEmail({ messageId: ID.unique(), subject: email.subject, content: email.html, users: [userId], html: true });
  };
  try {
    await Promise.race([send(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("TimedOut")), SEND_TIMEOUT_MS); })]);
    return true;
  } catch (error) {
    console.error("[booking-email] Ticket email not sent; the ticket stands", { cause: appwriteErrorCause(error) });
    return false;
  } finally {
    clearTimeout(timer);
  }
}
