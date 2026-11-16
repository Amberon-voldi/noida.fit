import { revokeGiftLink } from "@/lib/services/gifts";
import { jsonError, jsonOk, requireVerifiedMutationUser } from "@/lib/http";

export const runtime = "nodejs";

/** Switches a gift link off. Spots already claimed through it stay valid. */
export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string; giftId: string }> }) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-gift-link", 30);
    const { eventId, giftId } = await params;
    return jsonOk({ link: await revokeGiftLink(user, eventId, giftId) });
  } catch (error) {
    return jsonError(error, "The gift link could not be switched off");
  }
}
