import { z } from "zod";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";
import { deleteEventCoupon, updateEventCoupon } from "@/lib/services/event-coupons";

export const runtime = "nodejs";

type Params = { params: Promise<{ eventId: string; couponId: string }> };

/** Pauses or resumes a discount code: `{ coupon: { paused } }`. Returns the session's codes. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-coupon", 30);
    const { eventId, couponId } = await params;
    const { coupon } = await readJson(request, z.object({ coupon: z.unknown() }).strict(), 1_024);
    return jsonOk({ coupons: await updateEventCoupon(user, eventId, couponId, coupon) });
  } catch (error) {
    return jsonError(error, "The discount code could not be changed");
  }
}

/** Deletes a discount code. Tickets bought with it keep their price. Returns the session's codes. */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-coupon", 30);
    const { eventId, couponId } = await params;
    return jsonOk({ coupons: await deleteEventCoupon(user, eventId, couponId) });
  } catch (error) {
    return jsonError(error, "The discount code could not be deleted");
  }
}
