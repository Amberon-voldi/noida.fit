import "server-only";

import { assertRateLimit, assertSameOrigin, jsonError } from "@/lib/http";

export { safeCallbackUrl } from "@/components/auth/validation";

export function isSameOrigin(request: Request): boolean {
  try {
    assertSameOrigin(request);
    return true;
  } catch {
    return false;
  }
}

export function guardMutation(request: Request, bucket: string, userId?: string) {
  try {
    assertSameOrigin(request);
    assertRateLimit(request, bucket, userId);
    return null;
  } catch (error) {
    return jsonError(error);
  }
}

/** Where Appwrite's emailed verification link lands. */
export function verifyEmailUrl(request: Request): string {
  return `${new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin}/verify-email`;
}

export function backendErrorCode(error: unknown): number {
  return typeof error === "object" && error !== null && "code" in error ? Number(error.code) : 0;
}
