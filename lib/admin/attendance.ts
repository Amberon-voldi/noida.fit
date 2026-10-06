import "server-only";

import { z } from "zod";
import { appwriteCollections as collections } from "@/lib/appwrite/config";
import { getAppwriteDocument, listAppwriteDocuments, Query } from "@/lib/appwrite/database";
import { documentIdSchema, repairRecordedCheckIn } from "@/lib/services/participation";
import { HttpError } from "@/lib/http";
import { assertAdmin, type AdminActor } from "./auth";
import { runAdminMutation } from "./audit";

export interface AdminAttendanceEntry {
  userId: string;
  displayName: string;
  confirmed: boolean;
  checkedInAt?: string;
  verified: boolean;
}

export const attendanceRepairSchema = z.object({ eventId: documentIdSchema, userId: documentIdSchema, reason: z.string().trim().min(5).max(300) }).strict();

export async function getAdminAttendance(actor: AdminActor, eventId: string, offset = 0) {
  assertAdmin(actor);
  documentIdSchema.parse(eventId);
  const event = await getAppwriteDocument<{ title: string; status: string }>(collections.events, eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event was not found");
  const [rsvps, checkins, participations] = await Promise.all([
    listAppwriteDocuments<{ userId: string; status: string }>(collections.rsvps, [Query.equal("eventId", eventId), Query.select(["userId", "status"])]),
    listAppwriteDocuments<{ userId: string; timestamp: string }>(collections.checkins, [Query.equal("eventId", eventId), Query.select(["userId", "timestamp"])]),
    listAppwriteDocuments<{ userId: string; status: string; occurredAt: string }>(collections.participations, [Query.equal("eventId", eventId), Query.select(["userId", "status", "occurredAt"])]),
  ]);
  const confirmed = new Set(rsvps.filter(row => row.status === "confirmed").map(row => row.userId));
  const checked = new Map(checkins.map(row => [row.userId, row.timestamp]));
  const verified = new Set(participations.filter(row => row.status === "verified" && row.occurredAt === checked.get(row.userId)).map(row => row.userId));
  const ids = [...new Set([...confirmed, ...checked.keys()])];
  const entries: AdminAttendanceEntry[] = await Promise.all(ids.slice(offset, offset + 50).map(async userId => {
    const profile = await getAppwriteDocument<{ displayName?: string }>(collections.profiles, userId);
    return { userId, displayName: profile?.displayName?.slice(0, 128) || "NOIDA.FIT member", confirmed: confirmed.has(userId), checkedInAt: checked.get(userId), verified: verified.has(userId) };
  }));
  return { event: { id: eventId, title: event.title, status: event.status }, total: ids.length, confirmed: confirmed.size, checkins: checked.size, needsRepair: [...checked.keys()].filter(id => !verified.has(id)).length, entries };
}

export async function repairAdminAttendance(actor: AdminActor, input: z.infer<typeof attendanceRepairSchema>) {
  assertAdmin(actor);
  const parsed = attendanceRepairSchema.parse(input);
  return runAdminMutation(actor, "attendance.repair", `event:${parsed.eventId}`, parsed.reason, async () => {
    await repairRecordedCheckIn(actor, parsed.eventId, parsed.userId);
    return { repaired: true };
  });
}
