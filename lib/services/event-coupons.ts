import "server-only";

import { z } from "zod";
import { appwriteCollections } from "@/lib/appwrite/config";
import { listAppwriteDocuments, Query } from "@/lib/appwrite/database";
import { saveScopedEvent } from "@/lib/admin/content";
import { couponInputSchema, MAX_COUPONS_PER_EVENT, type EditableCoupon } from "@/lib/coupon-schema";
import { decryptCode, editableCoupons, sealCoupons, storedCouponsOf, type StoredCoupon } from "@/lib/coupons";
import { HttpError } from "@/lib/http";
import { parseEventPrice } from "@/lib/pricing";
import { getManagedEventRecord } from "@/lib/services/organizer-events";
import { liveTicket } from "@/lib/services/participation";
import type { AuthUser } from "@/lib/auth";

/**
 * An event's discount codes, managed from its dashboard (Discount codes tab) without editing the event:
 * each change rewrites only the event's `coupons`, against the version just read, so a concurrent edit
 * of the event is never overwritten (it is retried once on a fresh read instead).
 */

type Actor = Pick<AuthUser, "id" | "labels">;

async function ticketRows(eventId: string) {
  return listAppwriteDocuments<{ status: string; paymentRef?: string; createdAt?: string }>(appwriteCollections.rsvps, [Query.equal("eventId", eventId), Query.select(["status", "paymentRef", "createdAt"])]);
}

/** The event's codes in plain text, newest first, with how many tickets used each. */
export async function listEventCoupons(user: Actor, eventId: string): Promise<EditableCoupon[]> {
  const [stored, rows] = await Promise.all([getManagedEventRecord(user, eventId), ticketRows(eventId)]);
  return editableCoupons(stored.record, rows, liveTicket).reverse();
}

async function change(user: Actor, eventId: string, apply: (coupons: StoredCoupon[], record: Record<string, unknown>) => StoredCoupon[]): Promise<EditableCoupon[]> {
  for (let attempt = 0; ; attempt += 1) {
    const stored = await getManagedEventRecord(user, eventId);
    const next = apply(storedCouponsOf(stored.record), stored.record);
    const record: Record<string, unknown> = { ...stored.record, coupons: next };
    if (!next.length) delete record.coupons;
    try {
      await saveScopedEvent(record, { updatedAt: stored.updatedAt });
      break;
    } catch (error) {
      if (attempt === 0 && error instanceof HttpError && error.code === "STALE_CONTENT") continue;
      throw error;
    }
  }
  return listEventCoupons(user, eventId);
}

const createSchema = couponInputSchema;

/** Adds a code. Only a paid session takes codes, and each code is unique within its session. */
export function createEventCoupon(user: Actor, eventId: string, value: unknown): Promise<EditableCoupon[]> {
  return readable(async () => {
    const input = createSchema.parse(value);
    return change(user, eventId, (coupons, record) => {
      if (parseEventPrice(record.price).kind !== "paid") throw new HttpError(409, "COUPON_FREE_EVENT", "Discount codes are for paid sessions");
      if (coupons.length >= MAX_COUPONS_PER_EVENT) throw new HttpError(409, "COUPON_LIMIT", `A session can have at most ${MAX_COUPONS_PER_EVENT} codes`);
      if (coupons.some(coupon => decryptCode(coupon.code) === input.code)) throw new HttpError(409, "COUPON_EXISTS", `${input.code} already exists`);
      const { id: _ignored, ...fields } = input;
      void _ignored;
      return [...coupons, ...sealCoupons([fields])];
    });
  });
}

const updateSchema = z.object({ paused: z.boolean() }).strict();

/** Pauses or resumes a code. A paused code keeps its uses. */
export function updateEventCoupon(user: Actor, eventId: string, couponId: string, value: unknown): Promise<EditableCoupon[]> {
  return readable(async () => {
    const { paused } = updateSchema.parse(value);
    return change(user, eventId, coupons => {
      if (!coupons.some(coupon => coupon.id === couponId)) throw new HttpError(404, "COUPON_NOT_FOUND", "That code was not found");
      return coupons.map(coupon => coupon.id !== couponId ? coupon : paused ? { ...coupon, paused: true } : (({ paused: _was, ...rest }) => { void _was; return rest; })(coupon));
    });
  });
}

/** Deletes a code. Tickets already bought with it keep their price. */
export function deleteEventCoupon(user: Actor, eventId: string, couponId: string): Promise<EditableCoupon[]> {
  return change(user, eventId, coupons => {
    if (!coupons.some(coupon => coupon.id === couponId)) throw new HttpError(404, "COUPON_NOT_FOUND", "That code was not found");
    return coupons.filter(coupon => coupon.id !== couponId);
  });
}

async function readable<T>(run: () => Promise<T>): Promise<T> {
  try { return await run(); } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const field = { code: "Code", value: "Discount", maxUses: "Usage limit", expiresAt: "Expiry", kind: "Discount type" }[String(issue?.path[0])] ?? "Code";
      throw new HttpError(400, "INVALID_COUPON", `${field}: ${issue?.message ?? "invalid value"}`);
    }
    throw error;
  }
}
