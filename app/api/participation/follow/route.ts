import { followCommunity, unfollowCommunity, followInputSchema } from "@/lib/participation";
import { jsonError, jsonOk, readJson, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request, "follow");
    const { communityId } = await readJson(request, followInputSchema);
    await followCommunity(user.id, communityId);
    return jsonOk({ following: true, communityId });
  } catch (error) {
    return jsonError(error, "Community could not be followed");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireMutationUser(request, "unfollow");
    const { communityId } = await readJson(request, followInputSchema);
    await unfollowCommunity(user.id, communityId);
    return jsonOk({ following: false, communityId });
  } catch (error) {
    return jsonError(error, "Community could not be unfollowed");
  }
}
