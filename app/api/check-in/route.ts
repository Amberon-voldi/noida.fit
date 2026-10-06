import { HttpError, jsonError, requireMutationUser } from "@/lib/http";

export const runtime = "nodejs";

/** Retire the reversed attendee-scans-event flow. Old codes never create new attendance. */
export async function POST(request: Request) {
  try {
    await requireMutationUser(request, "legacy-check-in");
    throw new HttpError(410, "CHECKIN_FLOW_CHANGED", "Show your participant QR at /check-in. The club or venue operator scans it from their organizer workspace.");
  } catch (error) {
    return jsonError(error, "Use the operator-scanned participant check-in flow");
  }
}
