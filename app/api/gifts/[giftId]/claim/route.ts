import { claimGift } from "@/lib/services/gifts";
import { jsonError, jsonOk, requireVerifiedMutationUser } from "@/lib/http";

export const runtime = "nodejs";

/** Claims a free spot through a gift link: a confirmed ticket, no payment. */
export async function POST(request: Request, { params }: { params: Promise<{ giftId: string }> }) {
  try {
    const user = await requireVerifiedMutationUser(request, "gift-claim", 10);
    const { giftId } = await params;
    return jsonOk(await claimGift(user, giftId));
  } catch (error) {
    return jsonError(error, "The gift could not be claimed");
  }
}
