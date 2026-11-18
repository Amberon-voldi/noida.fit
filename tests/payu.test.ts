import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, test } from "node:test";

// Isolated transports for Appwrite and PayU: no credentials, accounts, payments or live mutations.
let payu: typeof import("../lib/payments/payu");
let payments: typeof import("../lib/services/ticket-payments");
let participation: typeof import("../lib/services/participation");
const originalFetch = globalThis.fetch;
let rows = new Map<string, Record<string, unknown>>();
let writes: { method: string; collection: string; data?: Record<string, unknown> }[] = [];
let transactions = new Map<string, Record<string, unknown>>();
let verifyCalls = 0;
/** The member's Appwrite account prefs, read and written with their session. */
const account = { prefs: {} as Record<string, unknown>, saves: 0, down: false };
const key = "synthKey";
const salt = "synthetic-payu-salt-for-tests";
const member = { id: "ticket-member", name: "Asha K.", email: "asha@example.test" };
const other = { id: "other-member", name: "Ravi", email: "ravi@example.test" };
const sha512 = (value: string) => createHash("sha512").update(value).digest("hex");
/** Fills a hash formula exactly as PayU documents it; empty tokens stay empty. */
const fill = (formula: string, values: Record<string, string>) => formula.split("|").map(token => token ? values[token] ?? "" : "").join("|");
const REQUEST_HASH = "key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT";
const RESPONSE_HASH = "SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key";

before(async () => {
  Object.assign(process.env, { PAYU_MERCHANT_KEY: key, PAYU_MERCHANT_SALT: salt, NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "payu-test", APPWRITE_KEY: "synthetic-runtime-key", APPWRITE_CHECKIN_SECRET: "synthetic-checkin-secret-".repeat(3), NEXT_PUBLIC_APPWRITE_DATABASE_ID: "payu-test", ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(name => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${name}`, name.toLowerCase()])) });
  delete process.env.PAYU_MODE;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.origin === "https://test.payu.in") {
      assert.equal(url.pathname + url.search, "/merchant/postservice.php?form=2");
      const form = new URLSearchParams(String(init?.body));
      assert.equal(form.get("command"), "verify_payment");
      assert.equal(form.get("hash"), sha512(`${key}|verify_payment|${form.get("var1")}|${salt}`), "sha512(key|command|var1|salt)");
      verifyCalls += 1;
      const txnid = form.get("var1")!;
      const detail = transactions.get(txnid) ?? { mihpayid: "Not Found", status: "Not Found" };
      return Response.json({ status: transactions.has(txnid) ? 1 : 0, msg: "synthetic", transaction_details: { [txnid]: detail } });
    }
    assert.equal(url.origin, "https://appwrite.test");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.pathname === "/v1/account/prefs") {
      assert.equal(new Headers(init?.headers).get("x-appwrite-session"), "synthetic-session", "written as the member, not with the API key");
      if (account.down) return Response.json({ code: 503, type: "general_service_disabled", message: "down" }, { status: 503 });
      if (method === "GET") return Response.json(account.prefs);
      account.saves += 1;
      account.prefs = body.prefs;
      return Response.json({ $id: member.id, prefs: account.prefs });
    }
    const match =/collections\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(url.pathname); assert.ok(match, url.pathname);
    const [, collection, id] = match;
    const path = `${collection}/${id ?? body.documentId}`;
    if (method === "GET" && id) return rows.has(path) ? Response.json(rows.get(path)) : Response.json({ code: 404, type: "document_not_found", message: "absent" }, { status: 404 });
    if (method === "GET") {
      const queries = [...url.searchParams.values()].map(value => JSON.parse(value));
      const documents = [...rows.entries()].filter(([candidate, row]) => candidate.startsWith(`${collection}/`) && queries.filter(query => query.method === "equal").every(query => query.values.includes(row[query.attribute]))).map(([, row]) => row);
      return Response.json({ total: documents.length, documents });
    }
    writes.push({ method, collection, data: body.data });
    if (method === "DELETE") { rows.delete(path); return new Response(null, { status: 204 }); }
    if (method === "POST" && rows.has(path)) return Response.json({ code: 409, type: "document_already_exists", message: "conflict" }, { status: 409 });
    const row = { ...rows.get(path), ...body.data, $id: id ?? body.documentId };
    rows.set(path, row);
    return Response.json(row, { status: method === "POST" ? 201 : 200 });
  };
  payu = await import("../lib/payments/payu");
  payments = await import("../lib/services/ticket-payments");
  participation = await import("../lib/services/participation");
});
after(() => { globalThis.fetch = originalFetch; });

function reset(capacity = 2) {
  rows = new Map(); writes = []; transactions = new Map(); verifyCalls = 0;
  const schedule = { status: "published", activityId: "running", capacity, startsAt: new Date(Date.now() + 10 * 60_000).toISOString(), endsAt: new Date(Date.now() + 70 * 60_000).toISOString() };
  rows.set("events/paid", { $id: "paid", slug: "alpha-doubles", title: "Alpha doubles | rotate & rally ✨", demo: false, ...schedule, payload: JSON.stringify({ price: "₹199" }) });
  rows.set("events/demo", { $id: "demo", slug: "demo-session", title: "Demo session", demo: true, ...schedule, payload: JSON.stringify({ price: "₹199" }) });
  rows.set("events/free", { $id: "free", slug: "free-run", title: "Free run", demo: false, ...schedule, payload: JSON.stringify({ price: "FREE" }) });
}
const ticketRow = (eventId: string, userId = member.id) => rows.get(`rsvps/${participation.rsvpDocumentId(eventId, userId)}`);
const start = (input: Partial<{ eventId: string; amount: number; phone: string }> = {}, user = member) => payments.startTicketPayment(user, { eventId: "paid", amount: 19900, phone: "98XXXXXXX", ...input }, "https://noida.fit");
const captured = (fields: Record<string, string>, overrides: Record<string, unknown> = {}) => ({ mihpayid: "403993715531", status: "success", unmappedstatus: "captured", amt: "199.00", udf1: fields.udf1, udf2: fields.udf2, ...overrides });

/** What PayU posts back for a request form, signed with the documented response hash. */
function resultFor(fields: Record<string, string>, status = "success", extra: Record<string, string> = {}) {
  const form: Record<string, string> = { ...fields, status, mihpayid: "403993715531", ...extra };
  delete form.hash;
  const base = fill(RESPONSE_HASH, { ...form, SALT: salt });
  return { ...form, hash: sha512(extra.additional_charges ? `${extra.additional_charges}|${base}` : base) };
}

test("the payment form carries PayU's documented request hash and never the salt", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const { action, fields } = await start({ phone: "+91 98765-43210" });
  assert.equal(action, "https://test.payu.in/_payment");
  assert.match(fields.txnid, /^NF[a-f0-9]{20}$/);
  assert.deepEqual({ amount: fields.amount, phone: fields.phone, udf1: fields.udf1, udf2: fields.udf2, surl: fields.surl, furl: fields.furl, email: fields.email }, { amount: "199.00", phone: "9876543210", udf1: "paid", udf2: member.id, surl: "https://noida.fit/api/payments/payu/return", furl: "https://noida.fit/api/payments/payu/return", email: member.email });
  // "|" would shift every later field in PayU's hash string.
  assert.equal(fields.productinfo, "Alpha doubles rotate & rally");
  assert.equal(fields.firstname, "Asha K");
  assert.equal(fields.hash, sha512(fill(REQUEST_HASH, { ...fields, SALT: salt })));
  assert.ok(!JSON.stringify(fields).includes(salt));
  process.env.PAYU_MODE = "live";
  try {
    assert.equal(payu.payuCheckoutForm({ txnid: payu.newTxnId(), amount: 29950, productinfo: "x", firstname: "y", email: "z@example.test", phone: "9876543210", returnUrl: "https://noida.fit/r", eventId: "paid", userId: member.id }).action, "https://secure.payu.in/_payment");
  } finally { delete process.env.PAYU_MODE; }
});

test("a payment holds the seat at its issued price, and refuses before holding anything it can't charge", async t => {
  t.mock.method(console, "info", () => {}); reset();
  await start();
  assert.deepEqual({ status: ticketRow("paid")!.status, amount: ticketRow("paid")!.amount, paymentStatus: ticketRow("paid")!.paymentStatus }, { status: "pending", amount: 19900, paymentStatus: "pending" }, "held, not yet a ticket");
  // A later price change never reprices a held ticket.
  rows.get("events/paid")!.payload = JSON.stringify({ price: "₹249" });
  writes = [];
  assert.equal((await start()).fields.amount, "199.00");
  assert.equal(writes.length, 0);
  await assert.rejects(start({ phone: "12345" }, other), { code: "PHONE_INVALID" });
  await assert.rejects(start({ eventId: "demo" }, other), { code: "DEMO_EVENT" });
  await assert.rejects(start({ eventId: "free" }, other), { code: "PRICE_CHANGED" });
  await assert.rejects(start({ amount: 19900 }, other), { code: "PRICE_CHANGED" });
  delete process.env.PAYU_MERCHANT_SALT;
  try {
    assert.equal(payu.isPayuConfigured(), false);
    await assert.rejects(start({ amount: 24900 }, other), { code: "PAYMENTS_NOT_CONFIGURED", status: 503 });
  } finally { process.env.PAYU_MERCHANT_SALT = salt; }
  assert.equal(ticketRow("paid", other.id), undefined);
  assert.equal(ticketRow("demo", other.id), undefined);
  await participation.confirmTicketPayment("paid", member.id, 19900, "payu:settled");
  await assert.rejects(start(), { code: "TICKET_PAID" });
});

test("PayU results are trusted only with PayU's documented response hash", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const { fields } = await start();
  const result = resultFor(fields);
  assert.equal(payu.verifyPayuResponseHash(result), true);
  const tampering: Record<string, string>[] = [{ amount: "1.00" }, { udf2: "someone-else" }, { udf1: "free" }, { status: "failure" }, { key: "otherKey" }, { hash: result.hash.slice(0, -1) + (result.hash.endsWith("0") ? "1" : "0") }];
  for (const tampered of tampering) {
    assert.equal(payu.verifyPayuResponseHash({ ...result, ...tampered }), false, JSON.stringify(tampered));
  }
  assert.equal(payu.verifyPayuResponseHash(resultFor(fields, "success", { additional_charges: "4.72" })), true);
  assert.equal(payu.verifyPayuResponseHash({ ...resultFor(fields, "success", { additional_charges: "4.72" }), additional_charges: "0.01" }), false);
});

test("only a payment PayU reports as captured marks the ticket paid, exactly once", async t => {
  t.mock.method(console, "info", () => {}); reset();
  const { fields } = await start();
  assert.deepEqual(await payments.settlePayuTransaction(fields.txnid), { outcome: "pending" }, "PayU has no such transaction");
  transactions.set(fields.txnid, captured(fields, { status: "failure", unmappedstatus: "failed" }));
  assert.equal((await payments.settlePayuTransaction(fields.txnid)).outcome, "failed");
  transactions.set(fields.txnid, captured(fields, { status: "pending", unmappedstatus: "pending" }));
  assert.equal((await payments.settlePayuTransaction(fields.txnid)).outcome, "pending");
  transactions.set(fields.txnid, captured(fields, { unmappedstatus: "auth" }));
  assert.equal((await payments.settlePayuTransaction(fields.txnid)).outcome, "pending", "authorised but not captured");
  assert.deepEqual({ status: ticketRow("paid")!.status, paymentStatus: ticketRow("paid")!.paymentStatus }, { status: "pending", paymentStatus: "pending" }, "no confirmation without a captured payment");
  writes = [];
  transactions.set(fields.txnid, captured(fields));
  assert.deepEqual(await payments.settlePayuTransaction(fields.txnid), { outcome: "paid", eventId: "paid" });
  assert.deepEqual(await payments.settlePayuTransaction(fields.txnid), { outcome: "paid", eventId: "paid" }, "the redirect and the webhook both settle");
  assert.equal(writes.length, 1);
  assert.deepEqual({ status: ticketRow("paid")!.status, paymentStatus: ticketRow("paid")!.paymentStatus, paymentRef: ticketRow("paid")!.paymentRef }, { status: "confirmed", paymentStatus: "paid", paymentRef: `payu:${fields.txnid}:403993715531` });
  const rsvp = await participation.getUserRsvp("paid", member.id);
  assert.equal(rsvp?.paymentStatus, "paid");
  assert.equal("paymentRef" in rsvp!, false, "the payment reference stays server-side");
});

test("captured money no ticket can take is flagged for refund, and a cancelled hold is reissued", async t => {
  t.mock.method(console, "info", () => {});
  const errors = t.mock.method(console, "error", () => {});
  reset();
  const first = (await start()).fields;
  transactions.set(first.txnid, captured(first, { amt: "1.00" }));
  assert.equal((await payments.settlePayuTransaction(first.txnid)).outcome, "refund");
  assert.equal(ticketRow("paid")!.paymentStatus, "pending");
  transactions.set(first.txnid, captured(first));
  assert.equal((await payments.settlePayuTransaction(first.txnid)).outcome, "paid");
  const second = { ...first, txnid: payu.newTxnId() };
  transactions.set(second.txnid, captured(second, { mihpayid: "403993715599" }));
  assert.equal((await payments.settlePayuTransaction(second.txnid)).outcome, "refund", "a second payment for a paid ticket");
  assert.equal(ticketRow("paid")!.paymentRef, `payu:${first.txnid}:403993715531`);
  assert.deepEqual(errors.mock.calls.map(call => (call.arguments[1] as { code: string }).code), ["AMOUNT_MISMATCH", "DUPLICATE_PAYMENT"]);
  assert.ok(errors.mock.calls.every(call => !JSON.stringify(call.arguments).includes(member.id)), "refund logs carry no account ID");

  reset(1);
  const held = (await start()).fields;
  await participation.cancelRsvp(member.id, "paid");
  transactions.set(held.txnid, captured(held));
  assert.equal((await payments.settlePayuTransaction(held.txnid)).outcome, "paid", "cancelled while paying, seat still free");
  assert.deepEqual({ amount: ticketRow("paid")!.amount, paymentStatus: ticketRow("paid")!.paymentStatus, seatNumber: ticketRow("paid")!.seatNumber }, { amount: 19900, paymentStatus: "paid", seatNumber: 1 });

  reset(1);
  const lost = (await start()).fields;
  await participation.cancelRsvp(member.id, "paid");
  await participation.holdTicket(other.id, "paid", 19900);
  transactions.set(lost.txnid, captured(lost));
  assert.equal((await payments.settlePayuTransaction(lost.txnid)).outcome, "refund", "the seat went to someone else");
  assert.equal(ticketRow("paid"), undefined);
});

/** PayU unreachable for the duration of `run`; Appwrite stays up. */
async function withPayuDown(run: () => Promise<void>) {
  const working = globalThis.fetch;
  globalThis.fetch = async (input, init) => new URL(String(input)).origin === "https://test.payu.in" ? new Response("unavailable", { status: 502 }) : working(input, init);
  try { await run(); } finally { globalThis.fetch = working; }
}

test("the return route settles a signed result and sends the member back to the event", async t => {
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", () => {});
  const warnings = t.mock.method(console, "warn", () => {});
  reset();
  const route = await import("../app/api/payments/payu/return/route");
  const post = (form: Record<string, string>) => route.POST(new Request("https://noida.fit/api/payments/payu/return", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) }));
  const { fields } = await start();
  transactions.set(fields.txnid, captured(fields));
  const forged = await post({ ...resultFor(fields), hash: "0".repeat(128) });
  assert.equal(forged.status, 303);
  assert.equal(forged.headers.get("location"), "https://noida.fit/account");
  assert.equal(verifyCalls, 0, "an unsigned post never reaches PayU or the ticket");
  assert.equal(warnings.mock.callCount(), 1);
  assert.equal(ticketRow("paid")!.paymentStatus, "pending");
  const response = await post(resultFor(fields));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://noida.fit/event/alpha-doubles?payment=paid");
  assert.deepEqual({ status: ticketRow("paid")!.status, paymentStatus: ticketRow("paid")!.paymentStatus }, { status: "confirmed", paymentStatus: "paid" });
  const next = (await start({}, other)).fields;
  await withPayuDown(async () => {
    assert.equal((await post(resultFor(next))).headers.get("location"), "https://noida.fit/event/alpha-doubles?payment=pending", "the member still lands on the event");
  });
});

test("the webhook settles signed notifications and asks PayU to retry when it can't", async t => {
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "warn", () => {});
  reset();
  const route = await import("../app/api/payments/payu/webhook/route");
  const post = (form: Record<string, string>) => route.POST(new Request("https://noida.fit/api/payments/payu/webhook", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) }));
  const { fields } = await start();
  transactions.set(fields.txnid, captured(fields));
  assert.equal((await post({ ...resultFor(fields), amount: "1.00" })).status, 400);
  assert.equal(verifyCalls, 0);
  const response = await post(resultFor(fields));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, outcome: "paid" });
  await withPayuDown(async () => {
    assert.equal((await post(resultFor(fields))).status, 503);
  });
});

test("the checkout mobile number is kept on the member's own account to pre-fill the next checkout", async t => {
  const warnings = t.mock.method(console, "warn", () => {});
  const auth = await import("../lib/appwrite/auth");
  account.prefs = { termsAcceptedAt: "2026-01-01T00:00:00.000Z", privacyAcceptedAt: "2026-01-01T00:00:00.000Z" };
  await auth.rememberPaymentPhone("synthetic-session", "+91 98765-43210");
  assert.deepEqual(account.prefs, { termsAcceptedAt: "2026-01-01T00:00:00.000Z", privacyAcceptedAt: "2026-01-01T00:00:00.000Z", paymentPhone: "9876543210" }, "consent times are kept");
  assert.equal(auth.savedPaymentPhone(account.prefs), "9876543210");
  await auth.rememberPaymentPhone("synthetic-session", "98XXXXXXX");
  await auth.rememberPaymentPhone("synthetic-session", "12345");
  await auth.rememberPaymentPhone(null, "9123456789");
  assert.equal(account.saves, 1, "an unchanged, invalid or signed-out number is not written");
  await auth.rememberPaymentPhone("synthetic-session", "9123456789");
  assert.equal(auth.savedPaymentPhone(account.prefs), "9123456789", "a new number replaces the old one");
  account.down = true;
  await auth.rememberPaymentPhone("synthetic-session", "9000000001");
  account.down = false;
  assert.equal(warnings.mock.callCount(), 1, "a failed save is logged, never thrown into the payment");
  assert.ok(!JSON.stringify(warnings.mock.calls[0].arguments).includes("9000000001"), "the number is not logged");
  assert.equal(auth.savedPaymentPhone({ paymentPhone: "not a number" }), undefined);
  assert.equal(auth.savedPaymentPhone(undefined), undefined);
});

test("members change or remove their saved number from settings, and their other account preferences stay", async () => {
  const auth = await import("../lib/appwrite/auth");
  const consent = { termsAcceptedAt: "2026-01-01T00:00:00.000Z", privacyAcceptedAt: "2026-01-01T00:00:00.000Z" };
  account.prefs = { ...consent, paymentPhone: "9876543210" };
  account.saves = 0;
  await auth.setPaymentPhone("synthetic-session", "9123456789");
  assert.deepEqual(account.prefs, { ...consent, paymentPhone: "9123456789" });
  await auth.setPaymentPhone("synthetic-session", null);
  assert.deepEqual(account.prefs, consent, "removing forgets only the number");
  await auth.setPaymentPhone("synthetic-session", null);
  assert.equal(account.saves, 2, "removing a number that isn't there writes nothing");
  account.down = true;
  await assert.rejects(auth.setPaymentPhone("synthetic-session", "9123456789"), "a settings save that fails says so");
  account.down = false;
});
