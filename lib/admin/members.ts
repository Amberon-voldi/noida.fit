import "server-only";

import { z } from "zod";
import { getAdminServices } from "@/lib/appwrite/server";
import { Query, getAppwriteDocument, updateAppwriteDocument } from "@/lib/appwrite/database";
import { appwriteCollections } from "@/lib/appwrite/config";
import { documentIdSchema } from "@/lib/services/participation";
import { HttpError } from "@/lib/http";
import { assertAdmin, type AdminActor } from "./auth";
import { runAdminMutation } from "./audit";

export interface AdminMember {
  id: string;
  name: string;
  enabled: boolean;
  admin: boolean;
  joinedAt: string;
  emailVerified: boolean;
}

export const memberActionSchema = z.object({
  userId: documentIdSchema,
  action: z.enum(["suspend", "restore", "revoke-sessions", "grant-admin", "remove-admin", "hide-profile"]),
  confirmation: documentIdSchema,
  reason: z.string().trim().min(5).max(300),
}).strict();

/** IDs are operational selectors available only to admins; email/password/prefs/sessions are never returned. */
export async function listAdminMembers(actor: AdminActor, search = "", offset = 0) {
  assertAdmin(actor);
  const { users } = getAdminServices();
  const result = await users.list({ queries: [Query.limit(25), Query.offset(offset)], ...(search.trim() ? { search: search.trim().slice(0, 100) } : {}) });
  return {
    total: result.total,
    members: result.users.map(user => ({ id: user.$id, name: user.name || "NOIDA.FIT member", enabled: user.status, admin: user.labels.includes("admin"), joinedAt: user.$createdAt, emailVerified: user.emailVerification } satisfies AdminMember)),
  };
}

export async function manageAdminMember(actor: AdminActor, input: z.infer<typeof memberActionSchema>) {
  assertAdmin(actor);
  const parsed = memberActionSchema.parse(input);
  if (parsed.confirmation !== parsed.userId) throw new HttpError(400, "CONFIRMATION_REQUIRED", "Type the selected account ID to confirm this action");
  if (parsed.userId === actor.id) throw new HttpError(409, "SELF_ACTION_BLOCKED", "Use account settings for your own account. Admin access and sessions cannot be changed here for yourself.");
  const { users } = getAdminServices();
  const target = await users.get({ userId: parsed.userId });
  return runAdminMutation(actor, `member.${parsed.action}`, `member:${parsed.userId}`, parsed.reason, async () => {
    switch (parsed.action) {
      case "suspend":
        await users.updateStatus({ userId: parsed.userId, status: false });
        // Status prevents new access. Session revocation is separately available and auditable.
        break;
      case "restore":
        await users.updateStatus({ userId: parsed.userId, status: true });
        break;
      case "revoke-sessions":
        await users.deleteSessions({ userId: parsed.userId });
        break;
      case "grant-admin":
        await users.updateLabels({ userId: parsed.userId, labels: [...new Set([...target.labels, "admin"])] });
        break;
      case "remove-admin":
        await users.updateLabels({ userId: parsed.userId, labels: target.labels.filter(label => label !== "admin") });
        break;
      case "hide-profile": {
        const profile = await getAppwriteDocument(appwriteCollections.profiles, parsed.userId);
        if (!profile) throw new HttpError(404, "PROFILE_NOT_FOUND", "This account has no profile to hide");
        await updateAppwriteDocument(appwriteCollections.profiles, parsed.userId, { visibility: "private", showActivity: false, showCommunities: false });
        break;
      }
    }
    return { changed: true, action: parsed.action };
  });
}
