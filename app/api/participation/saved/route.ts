import { saveItem, unsaveItem, savedInputSchema } from "@/lib/participation";
import { jsonError, jsonOk, readJson, requireMutationUser, requireVerifiedMutationUser } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedMutationUser(request, "saved");
    const { itemType, itemId } = await readJson(request, savedInputSchema);
    await saveItem(user.id, itemType, itemId);
    return jsonOk({ saved: true, itemId, itemType });
  } catch (error) {
    return jsonError(error, "Item could not be saved");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireMutationUser(request, "unsaved");
    const { itemType, itemId } = await readJson(request, savedInputSchema);
    await unsaveItem(user.id, itemType, itemId);
    return jsonOk({ saved: false, itemId, itemType });
  } catch (error) {
    return jsonError(error, "Saved item could not be removed");
  }
}
