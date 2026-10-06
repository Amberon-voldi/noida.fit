import "server-only";

import { createAppwriteDocument, listAppwriteDocuments, Query, updateAppwriteDocument } from "@/lib/appwrite/database";
import { HttpError } from "@/lib/http";
import { assertAdmin, type AdminActor } from "./auth";

export interface AuditRow {
  actorId: string;
  action: string;
  target: string;
  reason: string;
  status: "started" | "completed" | "failed";
  occurredAt: string;
  finishedAt?: string;
}

export function auditConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_APPWRITE_ADMIN_AUDIT_COLLECTION_ID);
}

function auditCollection(): string {
  const id = process.env.NEXT_PUBLIC_APPWRITE_ADMIN_AUDIT_COLLECTION_ID;
  if (!id) throw new HttpError(503, "AUDIT_NOT_CONFIGURED", "Admin writes are locked. Configure the private audit collection first; see the Admin guide.");
  return id;
}

/** Durable intent is written BEFORE any privileged change. No raw content or secrets are logged. */
export async function runAdminMutation<T>(user: AdminActor, action: string, target: string, reason: string, run: () => Promise<T>): Promise<T> {
  assertAdmin(user);
  if (!reason.trim() || reason.length > 300 || action.length > 80 || target.length > 160) {
    throw new HttpError(400, "AUDIT_REASON_REQUIRED", "Enter a short operational reason (without credentials or private contact details)");
  }
  const collection = auditCollection();
  let record;
  try {
    record = await createAppwriteDocument<AuditRow>(collection, { actorId: user.id, action, target, reason: reason.trim(), status: "started", occurredAt: new Date().toISOString() }, undefined, []);
  } catch {
    throw new HttpError(503, "AUDIT_UNAVAILABLE", "No change was made: the audit store could not record this action");
  }
  let result: T;
  try {
    result = await run();
  } catch (error) {
    await updateAppwriteDocument(collection, record.$id, { status: "failed", finishedAt: new Date().toISOString() }).catch(() => undefined);
    throw error;
  }
  try {
    await updateAppwriteDocument(collection, record.$id, { status: "completed", finishedAt: new Date().toISOString() });
  } catch {
    // The durable started record remains; never tell an operator to blindly repeat a completed write.
    throw new HttpError(503, "AUDIT_COMPLETION_PENDING", "The action may have completed, but its audit completion could not be saved. Reload the record and review the started audit entry before retrying.");
  }
  return result;
}

export async function listAdminAudit(user: AdminActor, offset = 0) {
  assertAdmin(user);
  if (!auditConfigured()) return { configured: false, readable: false, entries: [] };
  const rows = await listAppwriteDocuments<AuditRow>(auditCollection(), [Query.orderDesc("occurredAt"), Query.limit(50), Query.offset(offset)]);
  return { configured: true, readable: true, entries: rows.map(row => ({ id: row.$id, actor: "Administrator" as const, action: row.action, target: row.target, reason: row.reason, status: row.status, occurredAt: row.occurredAt, finishedAt: row.finishedAt })) };
}
