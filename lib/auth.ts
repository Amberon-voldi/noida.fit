import "server-only";

import { getCurrentAppwriteUser } from "@/lib/appwrite/server";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  labels?: string[];
}

export interface AuthSession {
  user: AuthUser;
}

/** Compatibility facade for pages that used the old NextAuth `auth()` call. */
export async function auth(): Promise<AuthSession | null> {
  const user = await getCurrentAppwriteUser();
  if (!user) return null;

  const prefs = user.prefs as Record<string, unknown> | undefined;
  return {
    user: {
      id: user.$id,
      name: user.name,
      email: user.email,
      ...(typeof prefs?.avatarUrl === "string" ? { image: prefs.avatarUrl } : {}),
      labels: user.labels,
    },
  };
}
