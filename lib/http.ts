import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const requests = new Map<string, number[]>();
const MAX_BUCKETS = 10_000;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonOk(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** Never forward Appwrite error messages, SDK responses, cookies or configuration. */
export function jsonError(error: unknown, fallback = "Request could not be completed"): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message, code: error.code }, {
      status: error.status,
      headers: { "Cache-Control": "private, no-store", ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}) },
    });
  }
  if (error instanceof z.ZodError) {
    return jsonError(new HttpError(400, "INVALID_INPUT", "Request input is invalid"));
  }
  return Response.json({ error: fallback, code: "REQUEST_FAILED" }, {
    status: 503, headers: { "Cache-Control": "private, no-store" },
  });
}

/** Compare full origins, never attacker-provided forwarded host headers. */
export function assertSameOrigin(request: Request): void {
  const value = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!value || fetchSite === "cross-site") {
    throw new HttpError(403, "ORIGIN_REQUIRED", "Request origin could not be verified");
  }
  try {
    const origin = new URL(value);
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    const expected = new URL(configured || request.url);
    if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== expected.origin || value !== origin.origin) {
      throw new Error("Origin mismatch");
    }
  } catch {
    throw new HttpError(403, "ORIGIN_MISMATCH", "Request origin could not be verified");
  }
}

/** Forwarded IPs are used only with an explicitly trusted, overwriting ingress. */
export function getClientKey(request: Request): string {
  if (process.env.NEXT_PUBLIC_TRUST_PROXY_IP === "true") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip && ip.length <= 64) return ip;
  }
  return "untrusted-network";
}

/** Process-local sliding window; put a shared limiter at the edge for multiple workers. */
export function assertRateLimit(request: Request, bucket: string, userId?: string): void {
  const key = createHash("sha256").update(`${bucket}:${userId || getClientKey(request)}`).digest("hex");
  const now = Date.now();
  const recent = (requests.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= 5) {
    throw new HttpError(429, "RATE_LIMITED", "Too many requests. Try again shortly.", Math.ceil((recent[0] + RATE_WINDOW_MS - now) / 1000));
  }
  if (requests.size >= MAX_BUCKETS && !requests.has(key)) {
    for (const [candidate, times] of requests) {
      if (times[times.length - 1] <= now - RATE_WINDOW_MS) requests.delete(candidate);
    }
    if (requests.size >= MAX_BUCKETS) throw new HttpError(429, "RATE_LIMITED", "Too many requests. Try again shortly.", 60);
  }
  requests.set(key, [...recent, now]);
}

/** Bound the actual streamed body too; Content-Length alone is client controlled. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>, maxBytes = 8192): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new HttpError(415, "JSON_REQUIRED", "Send JSON to this endpoint");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "BODY_TOO_LARGE", "Request body is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
  return schema.parse(body);
}

export async function requireAuthUser() {
  const session = await auth();
  if (!session?.user.id) throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue");
  return session.user;
}

export async function requireMutationUser(request: Request, bucket: string) {
  // Authentication first guarantees unauthenticated actions return 401, not a backend detail.
  const user = await requireAuthUser();
  assertSameOrigin(request);
  assertRateLimit(request, bucket, user.id);
  return user;
}

export function safeCallbackUrl(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n\x00-\x1f]/.test(value)) return fallback;
  try {
    const base = new URL("https://noida.fit");
    const target = new URL(value, base);
    if (target.origin !== base.origin) return fallback;
    return target.pathname + target.search + target.hash;
  } catch {
    return fallback;
  }
}
