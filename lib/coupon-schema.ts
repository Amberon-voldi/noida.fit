import { z } from "zod";

/** Discount code schemas, shared by the server (lib/coupons.ts), event records (lib/content-schema.ts) and the organizer form. */

export const MAX_COUPONS_PER_EVENT = 20;

export const couponCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{2,19}$/, "Use 3–20 letters, numbers, - or _");
const couponIdSchema = z.string().regex(/^[a-f0-9]{8}$/);

/** A coupon's terms, shared by the stored form and the organizer's form. */
const terms = {
  kind: z.enum(["percent", "flat"]),
  /** Percent off (1–100), or whole rupees off. */
  value: z.number().int().min(1).max(100000),
  /** How many tickets may use it. Unset: no limit. */
  maxUses: z.number().int().min(1).max(100000).optional(),
  /** It stops working at this time (ISO). Unset: until sales close. */
  expiresAt: z.string().datetime({ offset: true }).optional(),
};
const percentWithinRange = (coupon: { kind: string; value: number }) => coupon.kind !== "percent" || coupon.value <= 100;

/** As saved in the event payload: the code is encrypted ("enc1:..."). */
export const storedCouponSchema = z.object({ id: couponIdSchema, code: z.string().startsWith("enc1:").max(200), ...terms }).strict()
  .refine(percentWithinRange, { message: "A percent discount is at most 100", path: ["value"] });
export type StoredCoupon = z.infer<typeof storedCouponSchema>;

/** As the organizer edits it: the code in plain text, and the id of a coupon that already exists. */
export const couponInputSchema = z.object({ id: couponIdSchema.optional(), code: couponCodeSchema, ...terms }).strict()
  .refine(percentWithinRange, { message: "A percent discount is at most 100", path: ["value"] });
export type CouponInput = z.infer<typeof couponInputSchema>;
export type EditableCoupon = CouponInput & { id: string; uses: number };
