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

export function backendErrorCode(error: unknown): number {
  return typeof error === "object" && error !== null && "code" in error ? Number(error.code) : 0;
}
