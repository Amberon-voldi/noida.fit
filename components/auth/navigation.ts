import { safeCallbackUrl } from "./validation";

/**
 * After login/signup the session cookie has just been set. Load the destination as a new
 * document instead of a client-side transition: a soft `router.replace` could be overtaken
 * by `router.refresh()` of the login page, or reuse a prefetch made while signed out (for
 * /account that is the proxy's redirect back to /login), leaving the member on
 * /login?callbackUrl=... after a successful sign-in. `replace` keeps the form out of history.
 */
export function navigateAfterAuth(redirectTo: unknown): void {
  window.location.replace(safeCallbackUrl(redirectTo));
}
