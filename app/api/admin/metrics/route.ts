import { jsonError, jsonOk } from "@/lib/http";
import { requireAdminMutationUser } from "@/lib/admin/auth";
import { setupMetrics } from "@/lib/metrics";

export const runtime = "nodejs";

/** Creates the page metrics tables (Admin > Analytics, "Turn on page analytics"). Safe to repeat. */
export async function POST(request: Request) {
  try {
    await requireAdminMutationUser(request, "admin-metrics-setup", 5);
    await setupMetrics();
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, "Page analytics could not be switched on. The server's Appwrite key may need the collections.write and attributes.write scopes.");
  }
}
