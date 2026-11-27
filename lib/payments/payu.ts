import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { HttpError } from "@/lib/http";

/**
 * PayU India hosted checkout (docs.payu.in). The browser posts a hashed form to PayU, PayU posts
 * the result back, and the Verify Payment API is the record of what was actually paid. The salt
 * signs every hash and never leaves the server; PAYU_MODE=live switches to production endpoints.
 */
const ENDPOINTS = {
  test: { payment: "https://test.payu.in/_payment", verify: "https://test.payu.in/merchant/postservice.php?form=2" },
  live: { payment: "https://secure.payu.in/_payment", verify: "https://info.payu.in/merchant/postservice.php?form=2" },
} as const;

interface PayuConfig { key: string; salt: string; mode: keyof typeof ENDPOINTS }

function payuConfig(): PayuConfig | null {
  const key = process.env.PAYU_MERCHANT_KEY?.trim();
  const salt = process.env.PAYU_MERCHANT_SALT?.trim();
  if (!key || !salt) return null;
  return { key, salt, mode: process.env.PAYU_MODE === "live" ? "live" : "test" };
}

/** Without merchant credentials, paid tickets stay pay-at-venue. */
export function isPayuConfigured(): boolean {
  return payuConfig() !== null;
}

function requireConfig(): PayuConfig {
  const config = payuConfig();
  if (!config) throw new HttpError(503, "PAYMENTS_NOT_CONFIGURED", "Online payment isn’t switched on yet. You can pay the organizer at the event.");
  return config;
}

export function assertPayuConfigured(): void {
  requireConfig();
}

const sha512 = (value: string) => createHash("sha512").update(value).digest("hex");
const rupees = (paise: number) => (paise / 100).toFixed(2);

/** One ID per payment attempt: PayU refuses a repeated txnid. */
export const txnIdSchema = z.string().regex(/^NF[a-f0-9]{20}$/);
export const newTxnId = () => `NF${randomBytes(10).toString("hex")}`;

/** PayU's hashes join fields with "|", so free text is reduced to plain characters first. */
function plain(value: string, max: number, fallback: string): string {
  return value.replace(/[^A-Za-z0-9 .,&'()-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max).trim() || fallback;
}

export interface PayuPaymentRequest {
  txnid: string;
  /** Paise. */
  amount: number;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  /** Where PayU posts the result, for both success and failure. */
  returnUrl: string;
  /** Carried through PayU and covered by its hashes: which ticket this payment is for. */
  eventId: string;
  userId: string;
  /** The ticket type and discount code the amount was priced for (ids), so settling issues exactly what was paid. */
  tierId?: string;
  couponId?: string;
}

/** udf5 on payments that carry their ticket type (udf3) and coupon (udf4); older payments have neither. */
export const PAYU_TAGGED = "v2";

export interface PayuCheckoutForm { action: string; fields: Record<string, string> }

export function payuCheckoutForm(request: PayuPaymentRequest): PayuCheckoutForm {
  const { key, salt, mode } = requireConfig();
  assertPayableEmail(request.email);
  const fields = {
    key, txnid: request.txnid, amount: rupees(request.amount),
    productinfo: plain(request.productinfo, 100, "Event ticket"), firstname: plain(request.firstname.replace(/[^A-Za-z ]+/g, " "), 60, "Member"),
    email: request.email, phone: request.phone, surl: request.returnUrl, furl: request.returnUrl,
    udf1: request.eventId, udf2: request.userId,
    udf3: request.tierId && /^[a-z0-9]{6}$/.test(request.tierId) ? request.tierId : "",
    udf4: request.couponId && /^[a-f0-9]{8}$/.test(request.couponId) ? request.couponId : "",
    udf5: PAYU_TAGGED,
  };
  // sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
  const hash = sha512([key, fields.txnid, fields.amount, fields.productinfo, fields.firstname, fields.email, fields.udf1, fields.udf2, fields.udf3, fields.udf4, fields.udf5, "", "", "", "", "", salt].join("|"));
  return { action: ENDPOINTS[mode].payment, fields: { ...fields, hash } };
}

/** PayU refuses these characters in an email; checked before a seat is held for a payment that can't start. */
export function assertPayableEmail(email: string): void {
  if (/[|\s]/.test(email)) throw new HttpError(400, "EMAIL_UNSUPPORTED", "This account’s email address can’t be used for online payment");
}

/** Authenticates a result PayU posted (redirect or webhook) before anything acts on it. */
export function verifyPayuResponseHash(form: Record<string, string>): boolean {
  const { key, salt } = requireConfig();
  if (form.key !== key) return false;
  const value = (name: string) => form[name] ?? "";
  // sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key),
  // prefixed with "additional_charges|" when PayU added a convenience fee.
  const base = [salt, value("status"), "", "", "", "", "", value("udf5"), value("udf4"), value("udf3"), value("udf2"), value("udf1"), value("email"), value("firstname"), value("productinfo"), value("amount"), value("txnid"), key].join("|");
  const charges = form.additional_charges || form.additionalCharges;
  const expected = Buffer.from(sha512(charges ? `${charges}|${base}` : base));
  const actual = Buffer.from(value("hash").toLowerCase());
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const money = z.union([z.string(), z.number()]).transform(value => Math.round(Number(value) * 100)).pipe(z.number().int().positive());
const transactionSchema = z.object({
  status: z.string(),
  unmappedstatus: z.string().optional(),
  mihpayid: z.union([z.string(), z.number()]).transform(String),
  amt: money,
  udf1: z.string().optional(),
  udf2: z.string().optional(),
  udf3: z.string().optional(),
  udf4: z.string().optional(),
  udf5: z.string().optional(),
});

export interface PayuTransaction {
  txnid: string;
  status: "success" | "failure" | "pending";
  /** Paise: the amount the transaction was raised for, before any PayU convenience fee. */
  amount: number;
  mihpayid: string;
  eventId?: string;
  userId?: string;
  /** For payments made since tickets carry their type and coupon (PAYU_TAGGED): the paymentRef tags they were priced for, "" for none. */
  tags?: string;
}

/**
 * Our transaction id (txnid) for a PayU ID (mihpayid), from PayU's check_payment command, server to server.
 * For settling a payment by hand when only the PayU ID is known (the dashboard shows it first).
 */
export async function payuTxnIdFor(mihpayid: string): Promise<string | null> {
  const { key, salt, mode } = requireConfig();
  const command = "check_payment";
  const response = await fetch(ENDPOINTS[mode].verify, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ key, command, var1: mihpayid, hash: sha512([key, command, mihpayid, salt].join("|")) }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const data = response?.ok ? await response.json().catch(() => null) as unknown : null;
  if (!data) throw new HttpError(503, "PAYMENT_VERIFY_FAILED", "We couldn’t reach PayU to look up this payment");
  // PayU's reply nests the transaction differently by account and version: take our txnid wherever it sits.
  const found: string[] = [];
  const scan = (value: unknown, depth: number): void => {
    if (depth > 6 || found.length) return;
    if (typeof value === "string") { if (txnIdSchema.safeParse(value).success) found.push(value); return; }
    if (Array.isArray(value)) { value.forEach(item => scan(item, depth + 1)); return; }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.txnid === "string") scan(record.txnid, depth + 1);
      Object.values(record).forEach(item => scan(item, depth + 1));
    }
  };
  scan(data, 0);
  if (found.length) return found[0];
  // Not every account answers check_payment: find it in the last week's transaction report instead.
  return payuTxnIdFromReport(mihpayid);
}

/** Our txnid for a PayU ID, from PayU's transaction report (get_Transaction_Details) over the last 7 days. */
async function payuTxnIdFromReport(mihpayid: string): Promise<string | null> {
  const { key, salt, mode } = requireConfig();
  const command = "get_Transaction_Details";
  const day = (offset: number) => new Date(Date.now() + 330 * 60_000 + offset * 86_400_000).toISOString().slice(0, 10);
  const from = day(-6), to = day(1);
  const response = await fetch(ENDPOINTS[mode].verify, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ key, command, var1: from, var2: to, hash: sha512([key, command, from, salt].join("|")) }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const data = response?.ok ? await response.json().catch(() => null) as unknown : null;
  if (!data) throw new HttpError(503, "PAYMENT_VERIFY_FAILED", "We couldn’t reach PayU to look up this payment");
  // The row whose values include this PayU ID carries our txnid.
  let txnid: string | null = null;
  const visit = (value: unknown, depth: number): void => {
    if (txnid || depth > 6 || !value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const values = Object.values(record);
    if (values.some(item => String(item) === mihpayid)) {
      const candidate = values.find(item => typeof item === "string" && txnIdSchema.safeParse(item).success) as string | undefined;
      if (candidate) { txnid = candidate; return; }
    }
    values.forEach(item => visit(item, depth + 1));
  };
  visit(data, 0);
  if (!txnid) console.info("[PayU] transaction report found no txnid", { status: (data as { status?: unknown }).status, msg: (data as { msg?: unknown }).msg });
  return txnid;
}

/** PayU's own record of a transaction, fetched server to server. Null when PayU has no such txnid. */
export async function verifyPayuTransaction(txnid: string): Promise<PayuTransaction | null> {
  const { key, salt, mode } = requireConfig();
  const command = "verify_payment";
  const response = await fetch(ENDPOINTS[mode].verify, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ key, command, var1: txnid, hash: sha512([key, command, txnid, salt].join("|")) }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const data = response?.ok ? await response.json().catch(() => null) as { transaction_details?: Record<string, unknown> } | null : null;
  if (!data) throw new HttpError(503, "PAYMENT_VERIFY_FAILED", "We couldn’t reach PayU to confirm this payment");
  const detail = data.transaction_details?.[txnid] as { status?: unknown } | undefined;
  if (!detail || detail.status === "Not Found") return null;
  const parsed = transactionSchema.safeParse(detail);
  if (!parsed.success) throw new HttpError(503, "PAYMENT_VERIFY_FAILED", "PayU returned a transaction we couldn’t read");
  const { status, unmappedstatus, mihpayid, amt, udf1, udf2, udf3, udf4, udf5 } = parsed.data;
  const tags = udf5 === PAYU_TAGGED ? `${udf3 && /^[a-z0-9]{6}$/.test(udf3) ? `;t=${udf3}` : ""}${udf4 && /^[a-f0-9]{8}$/.test(udf4) ? `;c=${udf4}` : ""}` : undefined;
  const state = status.toLowerCase();
  // Only money PayU has captured counts; an authorisation or a bank still deciding is pending.
  const settled = state === "success" && (!unmappedstatus || unmappedstatus.toLowerCase() === "captured");
  return {
    txnid, mihpayid, amount: amt, eventId: udf1 || undefined, userId: udf2 || undefined, ...(tags !== undefined ? { tags } : {}),
    status: settled ? "success" : state === "failure" || state === "failed" ? "failure" : "pending",
  };
}
