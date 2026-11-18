import "server-only";

import { ID, Messaging } from "node-appwrite";
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
