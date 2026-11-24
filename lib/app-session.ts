/**
 * The .fit app signs in without cookies: it keeps the Appwrite session secret (from /api/app/auth/*) in the
 * phone's secure storage and sends it as `Authorization: Bearer <secret>` on every request.
 *
 * A bearer request is not open to cross-site request forgery: a browser never attaches the header by itself,
 * and another site cannot add it without a CORS preflight, which this app never grants. So the same-origin
 * check that guards cookie requests is skipped for it, and the bearer secret is used in place of any cookie.
 */
const BEARER = /^Bearer ([A-Za-z0-9._-]{16,2048})$/;

/** The session secret in an Authorization header, or null when there is none (or it is malformed). */
export function bearerSessionSecret(authorization: string | null | undefined): string | null {
  return BEARER.exec(authorization?.trim() ?? "")?.[1] ?? null;
}

export function isBearerRequest(request: Request): boolean {
  return bearerSessionSecret(request.headers.get("authorization")) !== null;
}

/**
 * The .fit app, signed in (bearer) or not (`X-Dotfit-Client: app`, on sign-in, recovery and lookup). Neither
 * header is something a browser sends on its own or lets another site add without a CORS preflight, so the
 * same-origin check, which only stops forged cookie requests, has nothing to guard.
 */
export function isAppRequest(request: Request): boolean {
  return isBearerRequest(request) || request.headers.get("x-dotfit-client") === "app";
}
