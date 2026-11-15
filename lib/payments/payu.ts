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
}

export interface PayuCheckoutForm { action: string; fields: Record<string, string> }

export function payuCheckoutForm(request: PayuPaymentRequest): PayuCheckoutForm {
  const { key, salt, mode } = requireConfig();
  if (/[|\s]/.test(request.email)) throw new HttpError(400, "EMAIL_UNSUPPORTED", "This account’s email address can’t be used for online payment");
  const fields = {
    key, txnid: request.txnid, amount: rupees(request.amount),
    productinfo: plain(request.productinfo, 100, "Event ticket"), firstname: plain(request.firstname.replace(/[^A-Za-z ]+/g, " "), 60, "Member"),
    email: request.email, phone: request.phone, surl: request.returnUrl, furl: request.returnUrl,
    udf1: request.eventId, udf2: request.userId,
  };
  // sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
  const hash = sha512([key, fields.txnid, fields.amount, fields.productinfo, fields.firstname, fields.email, fields.udf1, fields.udf2, "", "", "", "", "", "", "", "", salt].join("|"));
  return { action: ENDPOINTS[mode].payment, fields: { ...fields, hash } };
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
});

export interface PayuTransaction {
  txnid: string;
  status: "success" | "failure" | "pending";
  /** Paise: the amount the transaction was raised for, before any PayU convenience fee. */
  amount: number;
  mihpayid: string;
  eventId?: string;
  userId?: string;
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
  const { status, unmappedstatus, mihpayid, amt, udf1, udf2 } = parsed.data;
  const state = status.toLowerCase();
  // Only money PayU has captured counts; an authorisation or a bank still deciding is pending.
  const settled = state === "success" && (!unmappedstatus || unmappedstatus.toLowerCase() === "captured");
  return {
    txnid, mihpayid, amount: amt, eventId: udf1 || undefined, userId: udf2 || undefined,
    status: settled ? "success" : state === "failure" || state === "failed" ? "failure" : "pending",
  };
}
