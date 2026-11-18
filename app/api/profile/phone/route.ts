import { z } from "zod";
import { setPaymentPhone } from "@/lib/appwrite/auth";
import { getSessionSecret } from "@/lib/appwrite/server";
import { HttpError, jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";
import { updateWhatsappNumber } from "@/lib/participation";
import { normalizeIndianMobile } from "@/lib/phone";

export const runtime = "nodejs";

const phoneInputSchema = z.object({ phone: z.string().trim().max(20) }).strict();

async function sessionSecret(): Promise<string> {
  const secret = await getSessionSecret();
  if (!secret) throw new HttpError(401, "AUTH_REQUIRED", "Sign in required.");
  return secret;
}

/**
 * The member's mobile number, kept privately on their account: it fills in bookings and payments. Their
 * unpaid spots booked to pay on WhatsApp move to the new number, so the payment link reaches it.
 */
export async function PUT(request: Request) {
  try {
    const user = await requireMutationUser(request, "profile-phone", 10);
    const phone = normalizeIndianMobile((await readJson(request, phoneInputSchema)).phone);
    if (!phone) throw new HttpError(400, "PHONE_INVALID", "Enter a 10-digit Indian mobile number");
    await setPaymentPhone(await sessionSecret(), phone);
    return jsonOk({ phone, ticketsUpdated: await updateWhatsappNumber(user.id, phone) });
  } catch (error) {
    return jsonError(error, "Your number could not be saved");
  }
}

/** Forgets the saved number. Spots already booked keep the number the organizer has for the payment link. */
export async function DELETE(request: Request) {
  try {
    await requireMutationUser(request, "profile-phone", 10);
    await setPaymentPhone(await sessionSecret(), null);
    return jsonOk({ phone: null });
  } catch (error) {
    return jsonError(error, "Your number could not be removed");
  }
}
