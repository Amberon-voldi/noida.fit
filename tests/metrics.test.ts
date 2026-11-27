import assert from "node:assert/strict";
import { after, before, test } from "node:test";

// An isolated Appwrite transport: counters and dedupe rows in memory, no network.
const originalFetch = globalThis.fetch;
let rows = new Map<string, Record<string, unknown>>();
let missing = false;
let metrics: typeof import("../lib/metrics");

before(async () => {
  Object.assign(process.env, { NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "metrics-test", APPWRITE_KEY: "synthetic-key", APPWRITE_CHECKIN_SECRET: "synthetic-checkin-secret-".repeat(3), NEXT_PUBLIC_APPWRITE_DATABASE_ID: "metrics-test", TRUSTED_PROXY_COUNT: "1", ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(name => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${name}`, name.toLowerCase()])) });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://appwrite.test");
    if (missing) return Response.json({ code: 404, type: "collection_not_found", message: "absent" }, { status: 404 });
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const increment = /collections\/([^/]+)\/documents\/([^/]+)\/count\/increment$/.exec(url.pathname);
    if (increment) { const row = rows.get(`${increment[1]}/${increment[2]}`)!; row.count = Number(row.count) + Number(body.value ?? 1); return Response.json(row); }
    const match = /collections\/([^/]+)\/documents$/.exec(url.pathname);
    assert.ok(match, url.pathname);
    if (method === "POST") {
      const key = `${match[1]}/${body.documentId}`;
      if (rows.has(key)) return Response.json({ code: 409, type: "document_already_exists", message: "conflict" }, { status: 409 });
      rows.set(key, { ...body.data, $id: body.documentId });
      return Response.json(rows.get(key), { status: 201 });
    }
    const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
    const equals = queries.filter(query => query.method === "equal");
    const documents = [...rows.entries()].filter(([key, row]) => key.startsWith(`${match[1]}/`) && equals.every(query => query.values.includes(row[query.attribute]))).map(([, row]) => row);
    return Response.json({ total: documents.length, documents });
  };
  metrics = await import("../lib/metrics");
});
after(() => { globalThis.fetch = originalFetch; });

const visit = (ip: string, ua = "Mozilla/5.0") => new Request("https://noida.fit/api/metrics", { method: "POST", headers: { "x-forwarded-for": ip, "user-agent": ua } });

test("page views and taps are counted, and each person once a day per page", async () => {
  rows = new Map(); missing = false;
  await metrics.recordMetric(visit("1.1.1.1"), "event", "ev1", "view");
  await metrics.recordMetric(visit("1.1.1.1"), "event", "ev1", "view");
  await metrics.recordMetric(visit("2.2.2.2"), "event", "ev1", "view");
  await metrics.recordMetric(visit("1.1.1.1"), "event", "ev1", "cta");
  await metrics.recordMetric(visit("1.1.1.1"), "community", "club1", "cta");
  const events = (await metrics.readMetrics("event"))!;
  assert.deepEqual(events.get("ev1"), { view: 3, view_people: 2, cta: 1, cta_people: 1, pay: 0, pay_people: 0 });
  assert.equal((await metrics.readMetrics("community"))!.get("club1")!.cta_people, 1);
  assert.ok(![...rows.values()].some(row => JSON.stringify(row).includes("1.1.1.1")), "no address is stored");
});

test("one page's totals are read on their own", async () => {
  rows = new Map(); missing = false;
  await metrics.recordMetric(visit("4.4.4.4"), "event", "ev2", "view");
  await metrics.recordMetric(visit("4.4.4.4"), "event", "ev2", "pay");
  await metrics.recordMetric(visit("5.5.5.5"), "event", "other", "view");
  assert.deepEqual(await metrics.readPageMetrics("event", "ev2"), { view: 1, view_people: 1, cta: 0, cta_people: 0, pay: 1, pay_people: 1 });
});

test("without the metrics tables nothing fails, and reads say so", async () => {
  rows = new Map(); missing = true;
  await metrics.recordMetric(visit("3.3.3.3"), "event", "ev1", "view");
  assert.equal(await metrics.readMetrics("event"), null);
  missing = false;
});
