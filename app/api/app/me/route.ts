import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { savedPaymentPhone } from "@/lib/appwrite/auth";
import { ensureProfileForUser, profileSettings, toFitnessProfile } from "@/lib/appwrite/profiles";
import { getEvents, getUpcomingEvents } from "@/lib/data";
import { HttpError, jsonError, jsonOk } from "@/lib/http";
import { createParticipantCheckInToken, getAccountParticipation } from "@/lib/participation";
import { participantQrValue } from "@/lib/check-in-qr";
import { accountRecords } from "@/components/profile/account-data";

export const runtime = "nodejs";

/**
 * Everything the .fit app knows about the member, in one round trip: their .fit ID card and a fresh check-in
 * QR, their tickets (each with its session), what they saved and follow, their movement passport, their
 * profile settings, and the WhatsApp number their payment links go to. The website's /account, in one call.
 */
export async function GET() {
  try {
    const user = await getCurrentAppwriteUser();
    if (!user) throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue");
    const [stored, participation, events, upcoming, pass] = await Promise.all([
      ensureProfileForUser(user),
      getAccountParticipation(user.$id),
      getEvents(),
      getUpcomingEvents(),
      createParticipantCheckInToken(user.$id).catch(() => null),
    ]);
    const byId = new Map(events.map(event => [event.id, event]));
    const checkedIn = new Set(participation.checkins.map(checkin => checkin.eventId));
    // Booked (paid, due, gifted or free) or part-way through paying; never cancelled or waitlisted spots.
    const tickets = participation.rsvps.flatMap(rsvp => {
      const event = byId.get(rsvp.eventId);
      if (!event || (rsvp.status !== "confirmed" && rsvp.status !== "pending")) return [];
      return [{
        eventId: rsvp.eventId,
        status: rsvp.status,
        seatNumber: rsvp.seatNumber,
        createdAt: rsvp.createdAt,
        ...(rsvp.amount ? { amount: rsvp.amount, paymentStatus: rsvp.paymentStatus } : {}),
        ...(rsvp.whatsapp ? { whatsapp: rsvp.whatsapp } : {}),
        checkedIn: checkedIn.has(rsvp.eventId),
        event,
      }];
    }).sort((a, b) => (a.event.startsAt ?? a.event.date).localeCompare(b.event.startsAt ?? b.event.date));
    const { history } = accountRecords(participation, events, upcoming);
    return jsonOk({
      user: { name: user.name, email: user.email, emailVerified: user.emailVerification, hasPassword: Boolean(user.passwordUpdate) },
      profile: toFitnessProfile(stored, participation),
      settings: profileSettings(stored),
      phone: savedPaymentPhone(user.prefs) ?? null,
      pass: pass ? { ...pass, qr: participantQrValue(pass.token) } : null,
      tickets,
      saved: participation.savedItems.map(item => ({ itemType: item.itemType, itemId: item.itemId })),
      following: participation.memberships.filter(item => item.status === "active").map(item => item.communityId),
      history: history.map(entry => ({ key: entry.key, title: entry.title, occurredAt: entry.occurredAt, status: entry.status, eventId: entry.event?.id })),
    });
  } catch (error) {
    return jsonError(error, "Your .fit ID could not be loaded. Pull to refresh.");
  }
}
