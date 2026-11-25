import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { HttpError } from "@/lib/http";
import { formatInr } from "@/lib/pricing";
import { couponCodeSchema, couponInputSchema, MAX_COUPONS_PER_EVENT, storedCouponSchema, type CouponInput, type EditableCoupon, type StoredCoupon } from "@/lib/coupon-schema";

export type { CouponInput, EditableCoupon, StoredCoupon } from "@/lib/coupon-schema";

/**
 * Discount codes for a paid event's tickets. An event's coupons live in its content payload, which
 * Appwrite serves to anyone, so each code is stored encrypted (AES-256-GCM, keyed from the server-only
 * APPWRITE_CHECKIN_SECRET): the public sees that a coupon exists, never its code. Only the server prices
 * a ticket with a coupon; a held ticket records which coupon priced it (COUPON_TAG in its paymentRef),
 * which is what usage limits count.
 */

/** The cheapest a discounted ticket can be (paise): PayU can't take less, and a free spot is an RSVP. */
export const MIN_DISCOUNTED_PAISE = 100;


function key(): Buffer {
  const secret = process.env.APPWRITE_CHECKIN_SECRET;
  if (!secret || secret.length < 32) throw new HttpError(503, "COUPONS_NOT_CONFIGURED", "Discount codes aren’t switched on yet");
  return createHash("sha256").update(`noida.fit/coupons/v1:${secret}`).digest();
}

function encryptCode(code: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return `enc1:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url")}`;
}

/** The plain code, or null for one that can't be read (a changed secret, or a tampered payload). */
export function decryptCode(stored: string): string | null {
  try {
    const raw = Buffer.from(stored.slice(5), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    return null;
  }
}

/** The organizer's coupons, ready to save: codes encrypted, new ones given an id, no code used twice. */
export function sealCoupons(inputs: CouponInput[]): StoredCoupon[] {
  if (inputs.length > MAX_COUPONS_PER_EVENT) throw new HttpError(400, "INVALID_EVENT", `Add at most ${MAX_COUPONS_PER_EVENT} discount codes`);
  const seen = new Set<string>();
  return inputs.map(input => {
    const coupon = couponInputSchema.parse(input);
    if (seen.has(coupon.code)) throw new HttpError(400, "INVALID_EVENT", `The discount code ${coupon.code} is listed twice`);
    seen.add(coupon.code);
    const { id, code, ...rest } = coupon;
    return { id: id ?? randomBytes(4).toString("hex"), code: encryptCode(code), ...rest };
  });
}

/** An event payload's coupons, skipping any entry that isn't one. */
export function storedCouponsOf(payload: { coupons?: unknown }): StoredCoupon[] {
  if (!Array.isArray(payload.coupons)) return [];
  return payload.coupons.flatMap(item => { const parsed = storedCouponSchema.safeParse(item); return parsed.success ? [parsed.data] : []; });
}

/** Tagged onto a held ticket's paymentRef, and kept after it is paid, so its coupon's uses can be counted. */
export const couponTag = (id: string) => `;c=${id}`;
export function couponIdOf(paymentRef: string | undefined): string | undefined {
  return paymentRef ? /;c=([a-f0-9]{8})$/.exec(paymentRef)?.[1] : undefined;
}

/** Tickets that used each coupon: paid ones, and holds still running. */
export function couponUses(rows: { status: string; paymentRef?: string; userId?: string; createdAt?: string }[], live: (row: { status: string; createdAt?: string }) => boolean, exceptUserId?: string): Map<string, number> {
  const uses = new Map<string, number>();
  for (const row of rows) {
    const id = couponIdOf(row.paymentRef);
    if (!id || row.userId === exceptUserId || !live(row)) continue;
    uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  return uses;
}

export interface CouponQuote {
  couponId: string;
  code: string;
  /** The ticket price after the discount (paise). */
  amount: number;
  /** What it takes off (paise). */
  discount: number;
  /** "20% off" or "₹50 off". */
  label: string;
}

/**
 * Prices a ticket with a code the member typed. Throws a message the member can act on when the code
 * doesn't exist, has run out or expired, or would bring the price under MIN_DISCOUNTED_PAISE.
 */
export function quoteCoupon(coupons: StoredCoupon[], typed: string, price: number, uses: Map<string, number>, now = Date.now()): CouponQuote {
  const parsed = couponCodeSchema.safeParse(typed);
  const invalid = new HttpError(400, "COUPON_INVALID", "That discount code isn’t valid for this event");
  if (!parsed.success) throw invalid;
  const coupon = coupons.find(item => decryptCode(item.code) === parsed.data);
  if (!coupon) throw invalid;
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= now) throw new HttpError(409, "COUPON_EXPIRED", "That discount code has expired");
  if (coupon.maxUses !== undefined && (uses.get(coupon.id) ?? 0) >= coupon.maxUses) throw new HttpError(409, "COUPON_USED_UP", "That discount code has been fully used");
  const discount = coupon.kind === "percent" ? Math.round(price * coupon.value / 100) : coupon.value * 100;
  const amount = price - discount;
  if (amount < MIN_DISCOUNTED_PAISE) throw new HttpError(409, "COUPON_TOO_LARGE", "That discount code can’t be used for this ticket");
  return { couponId: coupon.id, code: parsed.data, amount, discount, label: coupon.kind === "percent" ? `${coupon.value}% off` : `${formatInr(coupon.value * 100)} off` };
}

/** An event's coupons for its organizer's form: codes in plain text, with how many tickets used each. */
export function editableCoupons(payload: { coupons?: unknown }, rows: { status: string; paymentRef?: string; createdAt?: string }[], live: (row: { status: string; createdAt?: string }) => boolean): EditableCoupon[] {
  const uses = couponUses(rows, live);
  return storedCouponsOf(payload).flatMap(({ code, ...coupon }) => {
    const plain = decryptCode(code);
    return plain ? [{ ...coupon, code: plain, uses: uses.get(coupon.id) ?? 0 }] : [];
  });
}
