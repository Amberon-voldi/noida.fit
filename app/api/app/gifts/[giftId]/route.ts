import { getCurrentAppwriteUser } from "@/lib/appwrite/server";
import { HttpError, jsonError, jsonOk } from "@/lib/http";
import { getGiftView } from "@/lib/services/gifts";

export const runtime = "nodejs";

/** A gift link as the .fit app shows it: the invite, its session, and whether this member can claim it. */
export async function GET(_request: Request, { params }: { params: Promise<{ giftId: string }> }) {
  try {
    const { giftId } = await params;
    const user = await getCurrentAppwriteUser();
    const view = await getGiftView(giftId, user?.$id);
    if (!view) throw new HttpError(404, "GIFT_NOT_FOUND", "That gift link was not found.");
    // Guest passes on the link belong to people without accounts; a signed-in member claims their own spot.
    return jsonOk({ link: { id: view.link.id, label: view.link.label, note: view.link.note, spots: view.link.spots, claimed: view.link.claimed }, event: view.event, state: view.state });
  } catch (error) {
    return jsonError(error, "This gift couldn’t be loaded. Try again.");
  }
}
