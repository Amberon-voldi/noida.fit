import { z } from "zod";

export const USERNAME_PATTERN = "[a-z0-9][a-z0-9._\\-]{1,38}[a-z0-9]";
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$/);
const displayNameSchema = z.string().trim().min(2).max(128);
const emailSchema = z.string().trim().toLowerCase().email().max(320);
const passwordSchema = z.string().min(8).max(256);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  callbackUrl: z.string().max(2048).optional(),
}).strict();

export const signupSchema = loginSchema.extend({
  name: displayNameSchema,
  username: usernameSchema,
  password: passwordSchema.regex(/[A-Za-z]/).regex(/[0-9]/),
});

export const profileSettingsSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  bio: z.string().trim().max(1000),
  city: z.string().trim().min(1).max(100),
  visibility: z.enum(["public", "private"]),
  showActivity: z.boolean(),
  showCommunities: z.boolean(),
  notifications: z.boolean(),
}).strict();

/** Only local navigation targets; decoding must not expose a second URL or an auth/API route. */
export function safeCallbackUrl(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || value.length > 2048) return fallback;
  const candidate = value.trim();
  const base = "https://noida.fit";
  try {
    if (!candidate.startsWith("/") || candidate.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(candidate)) return fallback;
    const target = new URL(candidate, base);
    if (target.origin !== base) return fallback;
    // Inspect the path separately: encoded spaces/URLs in a search query are
    // safe and must not break a callback to the discovery filters.
    let decoded = target.pathname;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return fallback;
      const parsed = new URL(decoded, base);
      if (parsed.origin !== base || /^\/(?:api|login|signup)(?:\/|$)/i.test(parsed.pathname)) return fallback;
      const next = decodeURIComponent(decoded);
      if (next === decoded) return target.pathname + target.search + target.hash;
      decoded = next;
    }
  } catch {
    // Malformed escapes and URLs are not valid navigation targets.
  }
  return fallback;
}
