import { listAdminMembers, manageAdminMember, memberActionSchema } from "@/lib/admin/members";
import { requireAdminMutationUser, requireAdminUser } from "@/lib/admin/auth";
import { jsonError, jsonOk, readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireAdminUser();
    const params = new URL(request.url).searchParams;
    const offsetValue = Number(params.get("offset") ?? "0");
    const offset = Number.isSafeInteger(offsetValue) && offsetValue >= 0 ? Math.min(offsetValue, 100_000) : 0;
    return jsonOk(await listAdminMembers(user, params.get("q") ?? "", offset));
  } catch (error) {
    return jsonError(error, "Admin members could not be loaded");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminMutationUser(request, "admin-members");
    return jsonOk(await manageAdminMember(user, await readJson(request, memberActionSchema)));
  } catch (error) {
    return jsonError(error, "Admin member action could not be completed");
  }
}
