import { z } from "zod";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";
import { createEventCoupon } from "@/lib/services/event-coupons";

export const runtime = "nodejs";

/** A new discount code for this session's tickets. Returns the session's codes. */
export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-coupon", 30);
    const { eventId } = await params;
    const { coupon } = await readJson(request, z.object({ coupon: z.unknown() }).strict(), 4_096);
    return jsonOk({ coupons: await createEventCoupon(user, eventId, coupon) });
  } catch (error) {
    return jsonError(error, "The discount code could not be created");
  }
}
