import assert from "node:assert/strict";
import { afterEach, before, test } from "node:test";
import { NextRequest } from "next/server";
import { loginSchema, profileSettingsSchema, safeCallbackUrl, signupSchema, usernameSchema } from "../components/auth/validation";
import type { ProfileData } from "../lib/appwrite/profiles";
import type { AccountParticipation } from "../lib/participation";

// Run with: node --conditions=react-server --import tsx --test tests/auth-identity.test.ts
// The transport is fully mocked: this suite never connects to a real project.
let profiles: typeof import("../lib/appwrite/profiles");
let identity: typeof import("../lib/appwrite/auth");
let proxy: typeof import("../proxy");
const originalFetch = globalThis.fetch;
const denyNetwork: typeof fetch = async () => { throw new Error("Unexpected network request in identity test"); };
let transport: typeof fetch = denyNetwork;

before(async () => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1",
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: "identity-test-project",
    APPWRITE_KEY: "test-key-not-real",
    APPWRITE_DATABASE_ID: "identity-test-db",
    APPWRITE_COLLECTION_PROFILES: "profiles",
    APPWRITE_COLLECTION_FITNESS_IDS: "fitness_ids",
    APPWRITE_COLLECTION_EVENTS: "events",
    APPWRITE_COLLECTION_RSVPS: "rsvps",
    APPWRITE_COLLECTION_CHECKINS: "checkins",
    APPWRITE_COLLECTION_ACTIVITIES: "activities",
    APPWRITE_COLLECTION_PLACES: "places",
    APPWRITE_COLLECTION_COMMUNITIES: "communities",
    APPWRITE_COLLECTION_MEMBERSHIPS: "memberships",
    APPWRITE_COLLECTION_SAVED_ITEMS: "savedItems",
    APPWRITE_COLLECTION_PARTICIPATIONS: "participations",
    NEXT_PUBLIC_SITE_URL: "https://noida.fit",
  });
  // SDK20 captures node-fetch-native's fetch at import time.
  globalThis.fetch = (...args) => transport(...args);
  profiles = await import("../lib/appwrite/profiles");
  identity = await import("../lib/appwrite/auth");
  proxy = await import("../proxy");
});
afterEach(() => {
  transport = denyNetwork;
});
process.on("exit", () => { globalThis.fetch = originalFetch; });

const emptyParticipation = (): AccountParticipation => ({ rsvps: [], savedItems: [], memberships: [], participations: [], checkins: [] });
const storedProfile = (changes: Partial<ProfileData> = {}): ProfileData => ({
  userId: "private-auth-user", username: "noida-runner", displayName: "Noida Runner", city: "Noida",
  fitnessId: "NF-0123456789ABCDEF", memberSince: "2026-09-01T00:00:00.000Z", visibility: "private",
  showActivity: false, showCommunities: false, notifications: false, ...changes,
});

function fakeAppwrite() {
  const rows = new Map<string, Record<string, unknown>>();
  const calls: Array<{ path: string; method: string; body: Record<string, unknown>; session: string | null }> = [];
  let failFitnessId = false;
  let unavailableSession = false;
  let sessionError: { status: number; type: string } | undefined;
  let documentError: { status: number; type: string } | undefined;
  let raceUsername: string | undefined;
  const user = { $id: "private-auth-user", $createdAt: "2026-09-01T00:00:00.000Z", name: "Noida Runner", email: "runner@example.test", prefs: {}, labels: [] };
  transport = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://appwrite.test");
    const path = url.pathname.replace(/^\/v1/, "");
    const method = init?.method?.toUpperCase() || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    const headers = new Headers(init?.headers);
    calls.push({ path, method, body, session: headers.get("x-appwrite-session") });
    const failure = (status: number, type = "test_failure") => Response.json({ message: "Private Appwrite diagnostic must never be forwarded", code: status, type }, { status });
    if (path === "/account" && method === "POST") return Response.json(user, { status: 201 });
    if (path === "/account" && method === "GET") {
      assert.equal(headers.get("x-appwrite-session"), "server-only-session-secret");
      return Response.json(user);
    }
    if (path === "/account/sessions/email" && method === "POST") {
      if (unavailableSession) return failure(503);
      if (sessionError) return failure(sessionError.status, sessionError.type);
      assert.equal(headers.get("x-appwrite-key"), "test-key-not-real");
      return Response.json({ $id: "test-session", secret: "server-only-session-secret", expire: "2027-01-01T00:00:00.000Z" }, { status: 201 });
    }
    if (path === "/account/sessions/current" && method === "DELETE") return new Response(null, { status: 204 });
    const documentPath = /^\/databases\/identity-test-db\/collections\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(path);
    assert.ok(documentPath, `Unexpected test endpoint: ${method} ${path}`);
    if (documentError) return failure(documentError.status, documentError.type);
    const [, collection, id] = documentPath;
    if (method === "GET" && id) {
      const row = rows.get(`${collection}/${id}`);
      return row ? Response.json(row) : failure(404);
    }
    if (method === "GET") {
      let documents = [...rows.entries()].filter(([key]) => key.startsWith(`${collection}/`)).map(([, row]) => row);
      for (const [, value] of url.searchParams) {
        const query = JSON.parse(value) as { method: string; attribute?: string; values: unknown[] };
        if (query.method === "equal" && query.attribute) documents = documents.filter((row) => query.values.includes(row[query.attribute!]));
        if (query.method === "limit") documents = documents.slice(0, Number(query.values[0]));
      }
      return Response.json({ total: documents.length, documents });
    }
    if (method === "POST") {
      if (collection === "fitness_ids" && failFitnessId) return failure(503);
      const data = body.data as Record<string, unknown>;
      const documentId = String(body.documentId);
      if (collection === "profiles" && data.username === raceUsername) {
        rows.set("profiles/racing-owner", { ...storedProfile({ username: raceUsername, userId: "racing-owner" }), $id: "racing-owner" });
        raceUsername = undefined;
      }
      if (rows.has(`${collection}/${documentId}`) || (collection === "profiles" && [...rows.values()].some((row) => row.username === data.username))) return failure(409);
      const row = { ...data, $id: documentId, $permissions: body.permissions };
      rows.set(`${collection}/${documentId}`, row);
      return Response.json(row, { status: 201 });
    }
    if (method === "PATCH" && id) {
      const existing = rows.get(`${collection}/${id}`);
      if (!existing) return failure(404);
      const row = { ...existing, ...body.data as Record<string, unknown> };
      rows.set(`${collection}/${id}`, row);
      return Response.json(row);
    }
    throw new Error(`Unexpected mutation: ${method} ${path}`);
  };
  return { rows, calls, user, setFitnessFailure: (value: boolean) => { failFitnessId = value; }, setSessionFailure: (value: boolean) => { unavailableSession = value; }, raceForUsername: (value: string) => { raceUsername = value; }, setSessionError: (status: number, type: string) => { sessionError = { status, type }; }, setDocumentError: (status: number, type: string) => { documentError = { status, type }; } };
}

test("usernames normalize and enforce bounded handle syntax", () => {
  assert.equal(usernameSchema.parse(" Runner.Noida "), "runner.noida");
  for (const username of ["ab", ".runner", "runner-", "my name", "x".repeat(41), "<script>", "me/you"]) assert.equal(usernameSchema.safeParse(username).success, false, username);
  for (const username of ["abc", "a.b", "a_b", "a-b", "x".repeat(40)]) assert.equal(usernameSchema.safeParse(username).success, true, username);
  assert.equal(profiles.isValidUsername("UPPERCASE"), false);
  assert.equal(signupSchema.safeParse({ name: "Runner", email: "runner@example.test", username: "runner", password: "abcdefgh" }).success, false);
  assert.equal(loginSchema.safeParse({ email: "runner@example.test", password: "abcdefgh" }).success, true);
  assert.equal(profileSettingsSchema.partial().safeParse({ userId: "someone-else" }).success, false);
  assert.equal(profileSettingsSchema.partial().safeParse({ fitnessId: "fake", eventsAttended: 99 }).success, false);
});

test("callbacks only allow local non-auth navigation, including decoded attack variants", () => {
  for (const unsafe of [undefined, ["/account"], "https://evil.test", "//evil.test", "/\\evil.test", "/%5cevil.test", "/%252f%252fevil.test", "/%2f%2fevil.test", "/%61pi/profile", "/api/auth/logout", "/login", "/signup?callbackUrl=/account", "/\n/evil.test", "/%00/evil.test", "javascript:alert(1)", "/broken%escape"]) {
    assert.equal(safeCallbackUrl(unsafe), "/account", String(unsafe));
  }
  for (const safe of ["/event/sunrise-run", "/check-in?token=abc.def", "/discover?activity=running&sector=137", "/discover?q=running%20club", "/account#settings"]) assert.equal(safeCallbackUrl(safe), safe);
});

test("verified attendance deduplicates events, ignores intent/unverified/future data, and derives weekly streaks", () => {
  const data = emptyParticipation();
  data.checkins = [
    { id: "c1", userId: "u", eventId: "e1", timestamp: "2026-09-29T01:00:00Z", verificationMethod: "organizer_qr" },
    { id: "c2", userId: "u", eventId: "e2", timestamp: "2026-09-23T01:00:00Z", verificationMethod: "organizer_qr" },
    { id: "future", userId: "u", eventId: "future", timestamp: "2027-01-01T00:00:00Z", verificationMethod: "organizer_qr" },
  ];
  data.participations = [
    { id: "p1", userId: "u", eventId: "e1", activityId: "running", title: "Run", occurredAt: "2026-09-29T01:00:00Z", source: "event_checkin", status: "verified" },
    { id: "p2", userId: "u", eventId: "e3", activityId: "running", title: "Run", occurredAt: "2026-09-15T01:00:00Z", source: "self", status: "self_reported" },
    { id: "repaired", userId: "u", eventId: "e1", activityId: "running", title: "Duplicate event", occurredAt: "2026-09-15T01:00:00Z", source: "event_checkin", status: "verified" },
  ];
  data.memberships = ["active", "active", "cancelled"].map((status, i) => ({ id: `m${i}`, userId: "u", communityId: status, status, createdAt: "2026-09-01T00:00:00Z" }));
  data.rsvps = [{ id: "r", eventId: "e4", userId: "u", status: "confirmed", seatNumber: 1, createdAt: "2026-09-01T00:00:00Z" }];
  assert.deepEqual(profiles.participationStats(data, new Date("2026-09-30T12:00:00Z")), { verifiedActivities: 2, eventsAttended: 2, communitiesJoined: 1, streakWeeks: 2 });
  assert.equal(profiles.participationStats(data, new Date("2026-10-06T12:00:00Z")).streakWeeks, 2);
  assert.equal(profiles.participationStats(data, new Date("2026-10-13T12:00:00Z")).streakWeeks, 0);
});

test("public DTO is an explicit privacy allowlist, never an auth user or settings row", () => {
  const stored = { ...storedProfile({ visibility: "public" }), email: "private@example.test", password: "never-public", $permissions: ["private"] };
  const card = profiles.toFitnessProfile(stored, emptyParticipation(), true, ["private-group"]);
  assert.deepEqual(card.stats, { verifiedActivities: null, eventsAttended: null, streakWeeks: null, communitiesJoined: null });
  assert.deepEqual(card.communityMemberships, []);
  const dto = profiles.toPublicProfileDto(card);
  assert.deepEqual(Object.keys(dto).sort(), ["city", "displayName", "fitnessId", "memberSince", "username"]);
  const serialized = JSON.stringify({ card, dto });
  for (const secret of [stored.userId, stored.email, stored.password, "notifications", "$permissions", "private-group"]) assert.ok(!serialized.includes(secret), secret);
  assert.throws(() => profiles.toFitnessProfile(storedProfile(), emptyParticipation(), true), /private/);
  assert.throws(() => profiles.toPublicProfileDto(profiles.toFitnessProfile(storedProfile(), emptyParticipation())), /private/);
});

test("public lookup treats private and absent users alike and does not load their history", async () => {
  const backend = fakeAppwrite();
  backend.rows.set("profiles/private-auth-user", storedProfile() as unknown as Record<string, unknown>);
  assert.equal(await profiles.getPublicProfileByUsername("noida-runner"), null);
  assert.equal(await profiles.getPublicProfileByUsername("nobody-here"), null);
  assert.ok(backend.calls.every((call) => call.path.includes("/profiles/")));
});

test("signup creates private owner-readable rows and a real SSR account session; retries are idempotent", async () => {
  const backend = fakeAppwrite();
  const result = await identity.createAccountSession("Noida Runner", "runner@example.test", "password123", "noida-runner");
  assert.equal(result.session.secret, "server-only-session-secret");
  const row = backend.rows.get("profiles/private-auth-user")!;
  assert.equal(row.visibility, "private");
  assert.equal(row.showActivity, false);
  assert.equal(row.showCommunities, false);
  assert.match(String(row.fitnessId), /^NF-[A-F0-9]{16}$/);
  assert.ok(!String(row.fitnessId).includes("private-auth-user"));
  assert.deepEqual(row.$permissions, ['read("user:private-auth-user")']);
  assert.deepEqual(backend.rows.get("fitness_ids/private-auth-user")?.$permissions, row.$permissions);
  await identity.createEmailSession("runner@example.test", "password123");
  assert.equal(backend.calls.filter((call) => call.method === "POST" && call.path.includes("/collections/")).length, 2);
  assert.ok(!JSON.stringify(row).includes("password123"));
});

test("username preflight rejects conflicts before creating an auth account", async () => {
  const backend = fakeAppwrite();
  backend.rows.set("profiles/someone-else", { ...storedProfile({ userId: "someone-else" }), $id: "someone-else" });
  await assert.rejects(identity.createAccountSession("Runner", "runner@example.test", "password123", "noida-runner"), profiles.UsernameConflictError);
  assert.ok(!backend.calls.some((call) => call.path === "/account" && call.method === "POST"));
});

test("interrupted signup preserves its account and login repairs the missing Fitness ID", async () => {
  const backend = fakeAppwrite();
  backend.setFitnessFailure(true);
  await assert.rejects(identity.createAccountSession("Runner", "runner@example.test", "password123", "noida-runner"), identity.SignupRecoveryError);
  assert.ok(backend.rows.has("profiles/private-auth-user"));
  assert.ok(!backend.rows.has("fitness_ids/private-auth-user"));
  assert.ok(!backend.calls.some((call) => call.method === "DELETE"));
  backend.setFitnessFailure(false);
  await identity.createEmailSession("runner@example.test", "password123");
  assert.equal(backend.rows.get("profiles/private-auth-user")?.username, "noida-runner");
  assert.ok(backend.rows.has("fitness_ids/private-auth-user"));
});

test("login repairs an auth-only account and revokes the newly opened session if repair fails", async () => {
  const backend = fakeAppwrite();
  backend.setFitnessFailure(true);
  await assert.rejects(identity.createEmailSession("runner@example.test", "password123"));
  assert.ok(backend.calls.some((call) => call.method === "DELETE" && call.path === "/account/sessions/current" && call.session === "server-only-session-secret"));
  backend.setFitnessFailure(false);
  await identity.createEmailSession("runner@example.test", "password123");
  assert.match(String(backend.rows.get("profiles/private-auth-user")?.username), /^noida-runner-[a-f0-9]{8}$/);
});

test("a concurrent username claim cannot overwrite its winner; the new account can recover", async () => {
  const backend = fakeAppwrite();
  backend.raceForUsername("noida-runner");
  await assert.rejects(identity.createAccountSession("Runner", "runner@example.test", "password123", "noida-runner"), identity.SignupRecoveryError);
  assert.equal(backend.rows.get("profiles/racing-owner")?.username, "noida-runner");
  assert.ok(!backend.rows.has("profiles/private-auth-user"));
  await identity.createEmailSession("runner@example.test", "password123");
  assert.notEqual(backend.rows.get("profiles/private-auth-user")?.username, "noida-runner");
  assert.equal(backend.rows.get("profiles/racing-owner")?.userId, "racing-owner");
});

test("settings persist on the authenticated owner's row and privacy revocation applies on the next read", async () => {
  const backend = fakeAppwrite();
  await identity.createAccountSession("Runner", "runner@example.test", "password123", "noida-runner");
  const user = backend.user as unknown as Parameters<typeof profiles.updateProfileForUser>[0];
  const settings = await profiles.updateProfileForUser(user, { username: "new-runner", displayName: "New Name", visibility: "public", notifications: true });
  assert.equal(settings.username, "new-runner");
  assert.equal(settings.notifications, true);
  const row = backend.rows.get("profiles/private-auth-user")!;
  assert.equal(row.userId, "private-auth-user");
  assert.equal(row.fitnessId, backend.rows.get("fitness_ids/private-auth-user")?.publicId);
  assert.equal((await profiles.getPublicProfileByUsername("new-runner"))?.name, "New Name");
  await profiles.updateProfileForUser(user, { visibility: "private" });
  assert.equal(await profiles.getPublicProfileByUsername("new-runner"), null);
  assert.ok(backend.calls.filter((call) => call.method === "PATCH").every((call) => !JSON.stringify(call.body).includes("userId")));
});

test("production session cookies are Secure and explicit logout revokes the current session", async () => {
  const backend = fakeAppwrite();
  const previousEnvironment = process.env.NODE_ENV;
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.equal(identity.sessionCookieOptions("2027-01-01T00:00:00Z").secure, true);
    assert.equal(identity.clearSessionCookieOptions().secure, true);
  } finally {
    if (previousEnvironment === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previousEnvironment });
  }
  await identity.deleteCurrentSession("server-only-session-secret");
  assert.deepEqual(backend.calls.map((call) => [call.path, call.method, call.session]), [["/account/sessions/current", "DELETE", "server-only-session-secret"]]);
});

test("auth API sets HttpOnly cookies but never includes the session secret in JSON", async () => {
  fakeAppwrite();
  const { POST } = await import("../app/api/auth/login/route");
  const response = await POST(new NextRequest("https://noida.fit/api/auth/login", {
    method: "POST", headers: { Origin: "https://noida.fit", "content-type": "application/json" },
    body: JSON.stringify({ email: "runner@example.test", password: "password123", callbackUrl: "//evil.test" }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, redirectTo: "/account" });
  assert.match(response.headers.get("set-cookie") || "", /HttpOnly/i);
  assert.match(response.headers.get("set-cookie") || "", /SameSite=lax/i);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.equal(identity.sessionCookieOptions("2027-01-01T00:00:00Z").httpOnly, true);
  assert.equal(identity.clearSessionCookieOptions().maxAge, 0);
});

test("auth mutation rejects cross-origin and oversized bodies without an Appwrite call", async () => {
  const backend = fakeAppwrite();
  const { POST } = await import("../app/api/auth/login/route");
  const crossOrigin = await POST(new NextRequest("https://noida.fit/api/auth/login", {
    method: "POST", headers: { Origin: "https://evil.test", "content-type": "application/json" }, body: "{}",
  }));
  assert.equal(crossOrigin.status, 403);
  const oversized = await POST(new NextRequest("https://noida.fit/api/auth/login", {
    method: "POST", headers: { Origin: "https://noida.fit", "content-type": "application/json" }, body: JSON.stringify({ huge: "a".repeat(9000) }),
  }));
  assert.equal(oversized.status, 413);
  assert.equal(backend.calls.length, 0);
});

test("login distinguishes invalid credentials from Appwrite permission failures", async (t) => {
  t.mock.method(console, "error", () => undefined);
  const { POST } = await import("../app/api/auth/login/route");
  for (const [stage, type, expectedStatus, expectedCode] of [
    ["session", "user_invalid_credentials", 401, "INVALID_CREDENTIALS"],
    ["session", "general_unauthorized_scope", 503, "LOGIN_UNAVAILABLE"],
    ["document", "user_unauthorized", 503, "LOGIN_UNAVAILABLE"],
  ] as const) {
    const backend = fakeAppwrite();
    if (stage === "session") backend.setSessionError(401, type);
    else backend.setDocumentError(401, type);
    const response = await POST(new NextRequest("https://noida.fit/api/auth/login", {
      method: "POST", headers: { Origin: "https://noida.fit", "content-type": "application/json" },
      body: JSON.stringify({ email: "runner@example.test", password: "password123" }),
    }));
    assert.equal(response.status, expectedStatus, `${stage}: ${type}`);
    const body = await response.json();
    assert.equal(body.code, expectedCode);
    assert.doesNotMatch(JSON.stringify(body), /Private Appwrite|test-key|server-only-session/);
    assert.equal(response.headers.get("set-cookie"), null);
    if (stage === "document") assert.ok(backend.calls.some(call => call.path === "/account/sessions/current" && call.method === "DELETE"));
  }
});

test("Appwrite diagnostics expose only safe metadata, never backend payloads", async (t) => {
  const { AppwriteException } = await import("node-appwrite");
  const { isInvalidCredentials, reportAppwriteFailure } = await import("../lib/appwrite/errors");
  const logged: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logged.push(args); });
  const denied = new AppwriteException("private-message", 401, "user_unauthorized", "private-response");
  reportAppwriteFailure("database.list", denied);
  reportAppwriteFailure("auth.login", new AppwriteException("private-message", 401, "private-type", "private-response"));
  reportAppwriteFailure("auth.login", new Error("private-config"));
  assert.deepEqual(logged.map(args => args[1]), [
    { operation: "database.list", status: 401, type: "user_unauthorized" },
    { operation: "auth.login", status: 401, type: "unknown" },
    { operation: "auth.login", status: 0, type: "unknown" },
  ]);
  assert.doesNotMatch(JSON.stringify(logged), /private-/);
  assert.equal(isInvalidCredentials(denied), false);
  assert.equal(isInvalidCredentials(new AppwriteException("missing", 404, "collection_not_found")), false);
  assert.equal(isInvalidCredentials(new AppwriteException("invalid", 401, "user_invalid_credentials")), true);
});

test("proxy rewrites canonical handles and preserves protected-route callbacks without backend calls", () => {
  const rewritten = proxy.proxy(new NextRequest("https://noida.fit/@noida-runner"));
  assert.equal(rewritten.headers.get("x-middleware-rewrite"), "https://noida.fit/fitness-id/noida-runner");
  assert.equal(proxy.proxy(new NextRequest("https://noida.fit/fitness-id/noida-runner")).headers.get("location"), "https://noida.fit/@noida-runner");
  assert.equal(proxy.proxy(new NextRequest("https://noida.fit/@Noida-Runner")).headers.get("location"), "https://noida.fit/@noida-runner");
  const redirected = proxy.proxy(new NextRequest("https://noida.fit/account?tab=saved"));
  assert.equal(new URL(redirected.headers.get("location")!).searchParams.get("callbackUrl"), "/account?tab=saved");
  assert.equal(proxy.proxy(new NextRequest("https://noida.fit/%E0%A4%A")).status, 400);
});
