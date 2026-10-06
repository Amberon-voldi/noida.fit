import { listAdminAudit } from "@/lib/admin/audit";
import { requireAdminUser } from "@/lib/admin/auth";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireAdminUser();
    const offsetValue = Number(new URL(request.url).searchParams.get("offset") ?? "0");
    const offset = Number.isSafeInteger(offsetValue) && offsetValue >= 0 ? Math.min(offsetValue, 10_000) : 0;
    return jsonOk(await listAdminAudit(user, offset));
  } catch (error) {
    return jsonError(error, "Admin audit could not be loaded");
  }
}
