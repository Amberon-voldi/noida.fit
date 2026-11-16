import { createGiftLink } from "@/lib/services/gifts";
import { jsonError, jsonOk, readJson, requireVerifiedMutationUser } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

/** A new gift link: anyone who opens it can claim a free spot at this session. */
export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-gift-link", 30);
    const { eventId } = await params;
    const { link } = await readJson(request, z.object({ link: z.unknown() }).strict(), 4_096);
    return jsonOk({ link: await createGiftLink(user, eventId, link) });
  } catch (error) {
    return jsonError(error, "The gift link could not be created");
  }
}
