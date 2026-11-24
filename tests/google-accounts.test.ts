import assert from "node:assert/strict";
import { afterEach, before, test } from "node:test";

// Run with: node --conditions=react-server --import tsx --test tests/google-accounts.test.ts
// "Continue with Google" for every kind of account. Appwrite links Google to an existing account with the same
// email, so the question here is only who must still agree to the Terms and Privacy Policy. The transport is mocked.
let oauth: typeof import("../lib/appwrite/oauth");
const originalFetch = globalThis.fetch;
const denyNetwork: typeof fetch = async () => { throw new Error("Unexpected network request in Google accounts test"); };
let transport: typeof fetch = denyNetwork;

before(async () => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1",
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: "google-test-project",
    APPWRITE_KEY: "test-key-not-real",
    NEXT_PUBLIC_APPWRITE_DATABASE_ID: "google-test-db",
    NEXT_PUBLIC_APPWRITE_COLLECTION_PROFILES: "profiles",
    NEXT_PUBLIC_APPWRITE_COLLECTION_FITNESS_IDS: "fitness_ids",
    // Required by the server config check; never touched here.
    ...Object.fromEntries(["EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"]
      .map((name) => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${name}`, name.toLowerCase()])),
  });
  globalThis.fetch = (...args) => transport(...args);
  oauth = await import("../lib/appwrite/oauth");
});
afterEach(() => { transport = denyNetwork; });
process.on("exit", () => { globalThis.fetch = originalFetch; });

const consented = { termsAcceptedAt: "2026-11-01T00:00:00.000Z", privacyAcceptedAt: "2026-11-01T00:00:00.000Z" };

/** One Appwrite account as Google hands it back: its prefs, and whether its .fit ID rows exist yet. */
function fakeAccount(prefs: Record<string, unknown>, existingMember: boolean) {
  const user = { $id: "google-user", $createdAt: "2026-10-01T00:00:00.000Z", name: "Noida Runner", email: "runner@example.test", prefs, labels: [] };
  const rows = new Map<string, Record<string, unknown>>();
  if (existingMember) {
    rows.set("profiles/google-user", { $id: "google-user", userId: "google-user", username: "noida-runner", displayName: "Noida Runner", city: "Noida", fitnessId: "NF-0123456789ABCDEF", memberSince: user.$createdAt, visibility: "private" });
    rows.set("fitness_ids/google-user", { $id: "google-user", userId: "google-user", publicId: "NF-0123456789ABCDEF", status: "active" });
  }
  const writes: string[] = [];
  transport = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/v1/, "");
    const method = init?.method?.toUpperCase() || "GET";
    if (path === "/account/sessions/token" && method === "POST") {
      return Response.json({ $id: "session", secret: "google-session-secret", expire: "2027-01-01T00:00:00.000Z" }, { status: 201 });
    }
    if (path === "/account" && method === "GET") return Response.json(user);
    const document = /^\/databases\/google-test-db\/collections\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(path);
    assert.ok(document, `Unexpected test endpoint: ${method} ${path}`);
    const [, collection, id] = document;
    if (method === "GET" && id) {
      const row = rows.get(`${collection}/${id}`);
      return row ? Response.json(row) : Response.json({ message: "not found", code: 404, type: "document_not_found" }, { status: 404 });
    }
    writes.push(`${method} ${collection}`);
    const body = JSON.parse(String(init?.body)) as { documentId: string; data: Record<string, unknown> };
    rows.set(`${collection}/${body.documentId}`, { $id: body.documentId, ...body.data });
    return Response.json({ $id: body.documentId, ...body.data }, { status: 201 });
  };
  return { writes };
}

test("a member who signed up with email and password goes straight in with Google, keeping their .fit ID", async () => {
  const { writes } = fakeAccount(consented, true);
  const session = await oauth.completeGoogle("google-user", "single-use-token");
  assert.equal(session.needsConsent, false);
  assert.equal(session.secret, "google-session-secret");
  assert.deepEqual(writes, [], "an existing .fit ID is never recreated");
});

test("a member from before the recorded agreements goes straight in with Google, as their password sign-in does", async () => {
  const { writes } = fakeAccount({}, true);
  const session = await oauth.completeGoogle("google-user", "single-use-token");
  assert.equal(session.needsConsent, false);
  assert.deepEqual(writes, []);
});

test("someone new to noida.fit agrees first, and nothing is created until they do", async () => {
  const { writes } = fakeAccount({}, false);
  const session = await oauth.completeGoogle("google-user", "single-use-token");
  assert.equal(session.needsConsent, true);
  assert.deepEqual(writes, []);
});
