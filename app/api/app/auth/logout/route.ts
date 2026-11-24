import { deleteCurrentSession } from "@/lib/appwrite/auth";
import { bearerSessionSecret } from "@/lib/app-session";
import { HttpError, jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/** Ends the .fit app's session on the server, so a lost phone's stored secret stops working. */
export async function POST(request: Request) {
  try {
    const secret = bearerSessionSecret(request.headers.get("authorization"));
    if (!secret) throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue");
    await deleteCurrentSession(secret);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, "Sign-out could not be completed. Please retry.");
  }
}
