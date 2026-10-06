import "server-only";

import type { AuthUser } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { HttpError, requireAuthUser, requireMutationUser } from "@/lib/http";

export type AdminActor = Pick<AuthUser, "id" | "labels">;

/** Roles come from Appwrite account labels, never profile fields or request input. */
export function assertAdmin(user: AdminActor): void {
  if (!user.labels?.includes("admin")) throw new HttpError(403, "ADMIN_REQUIRED", "Administrator access is required");
}

export async function requireAdminUser() {
  const user = await requireAuthUser();
  assertAdmin(user);
  return user;
}

export async function requireAdminMutationUser(request: Request, bucket: string) {
  const user = await requireMutationUser(request, bucket);
  assertAdmin(user);
  return user;
}

export async function requireAdminPage(callback = "/admin"): Promise<AuthUser> {
  const { notFound, redirect } = await import("next/navigation");
  const session = await auth();
  if (!session) return redirect(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  if (!session.user.labels?.includes("admin")) return notFound();
  return session.user;
}
