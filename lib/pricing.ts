/**
 * Event pricing. `Event.price` stays the stored display string ("FREE", "₹199"); this is the one
 * place that reads it as money. Amounts are integer paise, the unit payment gateways expect.
 */
export interface EventPricing {
  /** "info" is free-form text such as "Pay at venue": shown as written, never ticketed. */
  kind: "free" | "paid" | "info";
  amount: number;
  label: string;
}

export const MAX_TICKET_RUPEES = 100_000;

const FREE = /^(?:free|(?:₹|INR|Rs\.?)?\s*0+(?:\.0+)?)$/i;
const PAID = /^(?:₹|INR|Rs\.?)\s*(\d[\d,]*(?:\.\d{1,2})?)$/i;

export function formatInr(amount: number): string {
  return `₹${(amount / 100).toLocaleString("en-IN", { minimumFractionDigits: amount % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function parseEventPrice(value: unknown): EventPricing {
  const text = typeof value === "string" ? value.trim() : "";
  if (FREE.test(text)) return { kind: "free", amount: 0, label: "Free" };
  const match = PAID.exec(text);
  if (match) {
    const amount = Math.round(Number(match[1].replace(/,/g, "")) * 100);
    if (Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_TICKET_RUPEES * 100) return { kind: "paid", amount, label: formatInr(amount) };
  }
  // Never infer an amount from arbitrary text or digits.
  return { kind: "info", amount: 0, label: text || "Ask the host" };
}

/** The stored price string for a whole-rupee ticket. */
export function paidPrice(rupees: number): string {
  return `₹${rupees}`;
}
