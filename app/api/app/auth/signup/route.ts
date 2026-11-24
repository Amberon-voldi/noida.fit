import { assertRateLimit, jsonError, jsonOk } from "@/lib/http";
import { signUp } from "@/app/api/auth/_accounts";

export const runtime = "nodejs";

/** The .fit app's sign-up: the website's checks and consent, with the session secret returned in the body. */
export async function POST(request: Request) {
  try {
    assertRateLimit(request, "app-auth-signup");
    const { secret, expire } = await signUp(request);
    return jsonOk({ secret, expire });
  } catch (error) {
    return jsonError(error, "Account creation is temporarily unavailable. Please try again.");
  }
}
