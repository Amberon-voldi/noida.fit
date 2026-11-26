import { after } from "next/server";
import { z } from "zod";
import { assertRateLimit, assertSameOrigin } from "@/lib/http";
import { METRIC_KINDS, METRIC_NAMES, metricsMissing, recordMetric } from "@/lib/metrics";

export const runtime = "nodejs";

const beaconSchema = z.object({ k: z.enum(METRIC_KINDS), t: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/), m: z.enum(METRIC_NAMES) }).strict();
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|monitor/i;

/**
 * A page view or button click from the browser's beacon (components/analytics/PageBeacon.tsx). Answers
 * at once, before anything is written, and never fails the page: bad or excess beacons are just dropped.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertRateLimit(request, "metrics", undefined, 300);
    if (BOT.test(request.headers.get("user-agent") ?? "") || metricsMissing()) return new Response(null, { status: 204 });
    const body = beaconSchema.parse(JSON.parse(await request.text()));
    const write = () => recordMetric(request, body.k, body.t, body.m);
    try { after(write); } catch { void write(); }
  } catch { /* Dropped. */ }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
