import { assertRateLimit, jsonError, jsonOk } from "@/lib/http";
import { signIn } from "@/app/api/auth/_accounts";

export const runtime = "nodejs";

/**
 * The .fit app's sign-in. Same checks as the website's, but the session secret comes back in the body for the
 * app's secure storage (lib/app-session.ts) instead of in a cookie. No same-origin check: nothing here is
 * ambient, and a browser on another site cannot read the response.
 */
export async function POST(request: Request) {
  try {
    assertRateLimit(request, "app-auth-login");
    const { secret, expire } = await signIn(request);
    return jsonOk({ secret, expire });
  } catch (error) {
    return jsonError(error, "Sign-in is temporarily unavailable. Please try again.");
  }
}
