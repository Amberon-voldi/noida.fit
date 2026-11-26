import "server-only";

import { createHash, createHmac } from "node:crypto";
import { IndexType, Query } from "node-appwrite";
import { getAdminServices, getAppwriteDatabaseConfig } from "@/lib/appwrite/server";
import { getClientKey } from "@/lib/http";

/**
 * First-party, cookie-free page metrics: daily counters of event and club page views and of their main
 * button (Get ticket / RSVP, Pay, Follow), each with a count of distinct people. A person is told apart
 * by a hash of their address and browser with a salt that changes every day, never stored: only that
 * day's hash, in a dedupe row, so nobody can be followed across days or pages. Tracking never slows a
 * page: the browser sends a beacon after load and the server writes after responding (app/api/metrics).
 */

export const METRIC_KINDS = ["event", "community"] as const;
export type MetricKind = (typeof METRIC_KINDS)[number];
export const METRIC_NAMES = ["view", "cta", "pay"] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

export const METRICS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_METRICS_COLLECTION_ID || "page_metrics";
const SEEN_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_METRIC_SEEN_COLLECTION_ID || "page_metric_seen";

const istDate = (time = Date.now()) => new Date(time + 330 * 60_000).toISOString().slice(0, 10);
const docId = (prefix: string, value: string) => `${prefix}${createHash("sha256").update(value).digest("hex").slice(0, 34)}`;
const code = (error: unknown) => typeof error === "object" && error !== null && "code" in error ? Number((error as { code: unknown }).code) : 0;
const type = (error: unknown) => typeof error === "object" && error !== null && "type" in error ? String((error as { type: unknown }).type) : "";

/** Off for a few minutes after the tables turned out to be missing, so a site without them does no work. */
let missingUntil = 0;
export const metricsMissing = () => Date.now() < missingUntil;

function visitorHash(request: Request, date: string): string {
  const secret = process.env.APPWRITE_CHECKIN_SECRET || process.env.APPWRITE_KEY || "noida.fit";
  const salt = createHmac("sha256", secret).update(`metrics:${date}`).digest("hex");
  return createHash("sha256").update(`${salt}|${getClientKey(request)}|${request.headers.get("user-agent") ?? ""}`).digest("hex");
}

async function bump(date: string, kind: MetricKind, target: string, metric: string): Promise<void> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  const documentId = docId("m", `${date}|${kind}|${target}|${metric}`);
  try {
    await databases.createDocument({ databaseId, collectionId: METRICS_COLLECTION, documentId, data: { date, kind, target, metric, count: 1 }, permissions: [] });
  } catch (error) {
    if (code(error) !== 409) throw error;
    await databases.incrementDocumentAttribute({ databaseId, collectionId: METRICS_COLLECTION, documentId, attribute: "count", value: 1 });
  }
}

/** True the first time this person does this today on this page. */
async function firstToday(date: string, kind: MetricKind, target: string, metric: string, visitor: string): Promise<boolean> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  try {
    await databases.createDocument({ databaseId, collectionId: SEEN_COLLECTION, documentId: docId("s", `${date}|${kind}|${target}|${metric}|${visitor}`), data: { date }, permissions: [] });
    return true;
  } catch (error) {
    if (code(error) === 409) return false;
    throw error;
  }
}

/** Counts one view or click, and the person if it's their first of that kind today. Never throws. */
export async function recordMetric(request: Request, kind: MetricKind, target: string, metric: MetricName): Promise<void> {
  if (metricsMissing()) return;
  const date = istDate();
  try {
    await bump(date, kind, target, metric);
    if (await firstToday(date, kind, target, metric, visitorHash(request, date))) await bump(date, kind, target, `${metric}_people`);
  } catch (error) {
    if (code(error) === 404 && type(error).includes("collection")) { missingUntil = Date.now() + 5 * 60_000; return; }
    console.error("[metrics] write failed", { kind, metric, code: code(error), type: type(error) });
  }
}

export interface MetricTotals { view: number; view_people: number; cta: number; cta_people: number; pay: number; pay_people: number }
const empty = (): MetricTotals => ({ view: 0, view_people: 0, cta: 0, cta_people: 0, pay: 0, pay_people: 0 });

/** Totals per page over the last `days` days (IST), or null when the metrics tables aren't set up. */
export async function readMetrics(kind: MetricKind, days = 30): Promise<Map<string, MetricTotals> | null> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  const since = istDate(Date.now() - (days - 1) * 86_400_000);
  const totals = new Map<string, MetricTotals>();
  let cursor: string | undefined;
  try {
    for (;;) {
      const page = await databases.listDocuments<{ target: string; metric: string; count: number } & import("node-appwrite").Models.Document>({
        databaseId, collectionId: METRICS_COLLECTION,
        queries: [Query.equal("kind", kind), Query.greaterThanEqual("date", since), Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
      });
      for (const row of page.documents) {
        const entry = totals.get(row.target) ?? empty();
        if (row.metric in entry) entry[row.metric as keyof MetricTotals] += row.count;
        totals.set(row.target, entry);
      }
      if (page.documents.length < 500) break;
      cursor = page.documents[page.documents.length - 1].$id;
    }
  } catch (error) {
    if (code(error) === 404) return null;
    throw error;
  }
  return totals;
}

/** Drops dedupe rows older than yesterday: they only tell people apart within a day. Best effort. */
export async function pruneSeen(): Promise<void> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  try {
    await databases.deleteDocuments({ databaseId, collectionId: SEEN_COLLECTION, queries: [Query.lessThan("date", istDate(Date.now() - 86_400_000)), Query.limit(1000)] });
  } catch { /* Next time. */ }
}

/** Creates the two metrics tables (server-only rows, no client access). Safe to run again. */
export async function setupMetrics(): Promise<void> {
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  const ignoreExists = async (run: () => Promise<unknown>) => { try { await run(); } catch (error) { if (code(error) !== 409) throw error; } };
  await ignoreExists(() => databases.createCollection({ databaseId, collectionId: METRICS_COLLECTION, name: "Page metrics", permissions: [], documentSecurity: false }));
  await ignoreExists(() => databases.createCollection({ databaseId, collectionId: SEEN_COLLECTION, name: "Page metric dedupe", permissions: [], documentSecurity: false }));
  for (const [key, size] of [["date", 10], ["kind", 16], ["target", 40], ["metric", 16]] as const) {
    await ignoreExists(() => databases.createStringAttribute({ databaseId, collectionId: METRICS_COLLECTION, key, size, required: true }));
  }
  await ignoreExists(() => databases.createIntegerAttribute({ databaseId, collectionId: METRICS_COLLECTION, key: "count", required: true, min: 0 }));
  await ignoreExists(() => databases.createStringAttribute({ databaseId, collectionId: SEEN_COLLECTION, key: "date", size: 10, required: true }));
  // Attributes are built in the background; the indexes wait for them.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const [metrics, seen] = await Promise.all([
      databases.listAttributes({ databaseId, collectionId: METRICS_COLLECTION }),
      databases.listAttributes({ databaseId, collectionId: SEEN_COLLECTION }),
    ]);
    const ready = [...metrics.attributes, ...seen.attributes].every(attribute => (attribute as { status?: string }).status === "available");
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  await ignoreExists(() => databases.createIndex({ databaseId, collectionId: METRICS_COLLECTION, key: "metrics_kind_date", type: IndexType.Key, attributes: ["kind", "date"] }));
  await ignoreExists(() => databases.createIndex({ databaseId, collectionId: SEEN_COLLECTION, key: "seen_date", type: IndexType.Key, attributes: ["date"] }));
  missingUntil = 0;
}
