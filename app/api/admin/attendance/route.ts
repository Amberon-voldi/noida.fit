import { attendanceRepairSchema, getAdminAttendance, repairAdminAttendance } from "@/lib/admin/attendance";
import { requireAdminMutationUser, requireAdminUser } from "@/lib/admin/auth";
import { jsonError, jsonOk, readJson } from "@/lib/http";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireAdminUser();
    const params = new URL(request.url).searchParams;
    const value = Number(params.get("offset") ?? "0");
    const offset = Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 100_000) : 0;
    return jsonOk(await getAdminAttendance(user, params.get("eventId") ?? "", offset));
  } catch (error) { return jsonError(error, "Attendance could not be loaded"); }
}
export async function POST(request: Request) {
  try {
    const user = await requireAdminMutationUser(request, "admin-attendance");
    return jsonOk(await repairAdminAttendance(user, await readJson(request, attendanceRepairSchema)));
  } catch (error) { return jsonError(error, "Attendance repair could not be completed"); }
}
