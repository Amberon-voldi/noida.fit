import { claimGiftAsGuest, guestClaimSchema } from "@/lib/services/gifts";
import { assertRateLimit, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/http";

export const runtime = "nodejs";

/** Claims a gift link's free spot without an account, on links the organizer opened to guests: returns their guest pass. */
export async function POST(request: Request, { params }: { params: Promise<{ giftId: string }> }) {
  try {
    assertSameOrigin(request);
    assertRateLimit(request, "gift-guest-claim", undefined, 10);
    const { giftId } = await params;
    return jsonOk(await claimGiftAsGuest(giftId, await readJson(request, guestClaimSchema, 1_024)));
  } catch (error) {
    return jsonError(error, "The gift could not be claimed");
  }
}
