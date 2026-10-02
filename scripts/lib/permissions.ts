import { Permission, Role } from "node-appwrite";
import type { ScriptCollections } from "./appwrite";

export const publicCollections = new Set<keyof ScriptCollections>(["activities", "events", "communities", "places"]);

export function documentPermissions(kind: keyof ScriptCollections, row: Record<string, unknown>): string[] {
  if (publicCollections.has(kind)) {
    return row.status === "published" ? [Permission.read(Role.any())] : [];
  }
  if (typeof row.userId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(row.userId)) {
    throw new Error(`Cannot assign owner-only permissions: ${kind} has a missing or invalid userId`);
  }
  return [Permission.read(Role.user(row.userId))];
}
