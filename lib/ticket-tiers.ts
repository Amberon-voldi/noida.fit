import { z } from "zod";
import { formatInr, MAX_TICKET_RUPEES } from "./pricing";

/**
 * Ticket types for a paid event (General, Full experience...). Each has its own whole-rupee price; the
 * event's `price` is kept at the cheapest one, so listings and older pages still show a real price. All
 * types share the event's capacity. A held or paid ticket records its type as a `;t=<id>` tag on its
 * paymentRef (with a coupon's `;c=<id>` after it), since the RSVP table has no column for it.
 */

export const MAX_TICKET_TIERS = 10;
const tierIdSchema = z.string().regex(/^[a-z0-9]{6}$/);

export const ticketTierSchema = z.object({
  id: tierIdSchema,
  name: z.string().trim().min(2).max(60),
  /** Whole rupees. */
  price: z.number().int().min(1).max(MAX_TICKET_RUPEES),
  description: z.string().trim().max(200).optional(),
}).strict();
export type TicketTier = z.infer<typeof ticketTierSchema>;

/** As the organizer edits them: a new type has no id yet. */
export const ticketTierInputSchema = ticketTierSchema.extend({ id: tierIdSchema.optional() });
export type TicketTierInput = z.infer<typeof ticketTierInputSchema>;

/** An event payload's ticket types, skipping anything that isn't one. */
export function tiersOf(payload: { tiers?: unknown }): TicketTier[] {
  if (!Array.isArray(payload.tiers)) return [];
  return payload.tiers.flatMap(item => { const parsed = ticketTierSchema.safeParse(item); return parsed.success ? [parsed.data] : []; });
}

/** Gives new types an id (random, unique within the event) and checks names are distinct. */
export function assignTierIds(inputs: TicketTierInput[], random: () => string): TicketTier[] {
  if (inputs.length > MAX_TICKET_TIERS) throw new Error(`Add at most ${MAX_TICKET_TIERS} ticket types`);
  const ids = new Set(inputs.flatMap(input => input.id ? [input.id] : []));
  const names = new Set<string>();
  return inputs.map(input => {
    const tier = ticketTierInputSchema.parse(input);
    const key = tier.name.toLowerCase();
    if (names.has(key)) throw new Error(`The ticket type “${tier.name}” is listed twice`);
    names.add(key);
    let id = tier.id;
    while (!id) { const candidate = random(); if (!ids.has(candidate)) { ids.add(candidate); id = candidate; } }
    return { id, name: tier.name, price: tier.price, ...(tier.description ? { description: tier.description } : {}) };
  });
}

/** "₹249", or "From ₹249" when types differ in price. */
export function tierPriceLabel(tiers: TicketTier[], fallback: string): string {
  if (!tiers.length) return fallback;
  const prices = tiers.map(tier => tier.price);
  const min = Math.min(...prices);
  return `${Math.max(...prices) > min ? "From " : ""}${formatInr(min * 100)}`;
}

/** The tags a ticket's paymentRef carries (";t=...;c=..."), from a hold or a PayU payment only. */
export function ticketRefTags(paymentRef: string | undefined): string {
  if (!paymentRef || !(paymentRef.startsWith(";") || paymentRef.startsWith("payu:"))) return "";
  return /(?:;[tc]=[a-z0-9]+)+$/.exec(paymentRef)?.[0] ?? "";
}
export const tierTag = (id: string) => `;t=${id}`;
export function tierIdOf(paymentRef: string | undefined): string | undefined {
  return /;t=([a-z0-9]{6})(?=;|$)/.exec(ticketRefTags(paymentRef))?.[1];
}
