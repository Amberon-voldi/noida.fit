import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { contentSchemas, contentTemplates } from "../lib/content-schema";
import { isMediaPath, sniffImageType } from "../lib/media";

// Synthetic Appwrite: Storage files and the audit collection, in memory. No real backend is contacted.
const admin = { id: "admin-test", labels: ["admin"] };
const originalFetch = globalThis.fetch;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);
let media: typeof import("../lib/admin/media");
let files: Map<string, { bucket: string; bytes: Uint8Array<ArrayBuffer>; mimeType: string; permissions: string[]; name: string }>;
let audits: { status: string; action: string; target: string }[];
let storageFailure: { code: number; type: string } | null;

before(async () => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://appwrite.test/v1", NEXT_PUBLIC_APPWRITE_PROJECT_ID: "media-test",
    APPWRITE_KEY: "synthetic-key", NEXT_PUBLIC_APPWRITE_DATABASE_ID: "media-test", NEXT_PUBLIC_APPWRITE_ADMIN_AUDIT_COLLECTION_ID: "audit",
    ...Object.fromEntries(["PROFILES", "FITNESS_IDS", "EVENTS", "RSVPS", "CHECKINS", "ACTIVITIES", "PLACES", "COMMUNITIES", "MEMBERSHIPS", "SAVED_ITEMS", "PARTICIPATIONS"].map(key => [`NEXT_PUBLIC_APPWRITE_COLLECTION_${key}`, key.toLowerCase()])),
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://appwrite.test", "tests never contact a real backend");
    const method = init?.method ?? "GET";
    const audit = /collections\/audit\/documents(?:\/([^/]+))?$/.exec(url.pathname);
    if (audit) {
      const body = JSON.parse(String(init?.body)) as { documentId?: string; data: { status: string; action?: string; target?: string } };
      if (method === "POST") audits.push({ status: body.data.status, action: String(body.data.action), target: String(body.data.target) });
      else audits.at(-1)!.status = body.data.status;
      return Response.json({ $id: audit[1] ?? body.documentId ?? "audit-row", ...body.data });
    }
    const storage = /^\/v1\/storage\/buckets\/([^/]+)\/files(?:\/([^/]+))?(\/view)?$/.exec(url.pathname);
    assert.ok(storage, `Unexpected SDK request: ${method} ${url.pathname}`);
    const [, bucket, id, view] = storage;
    if (storageFailure) return Response.json({ code: storageFailure.code, type: storageFailure.type, message: "Synthetic failure" }, { status: storageFailure.code });
    if (method === "POST") {
      const form = init?.body as FormData;
      const file = form.get("file") as File;
      const permissions = [...form.getAll("permissions[]")].map(String);
      files.set(String(form.get("fileId")), { bucket, bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type, permissions, name: file.name });
      return Response.json({ $id: form.get("fileId"), bucketId: bucket }, { status: 201 });
    }
    const file = id ? files.get(id) : undefined;
    if (!file || file.bucket !== bucket) return Response.json({ code: 404, type: "storage_file_not_found", message: "Synthetic absent file" }, { status: 404 });
    if (view) return new Response(file.bytes, { headers: { "content-type": file.mimeType } });
    return Response.json({ $id: id, bucketId: bucket, $permissions: file.permissions, mimeType: file.mimeType, sizeOriginal: file.bytes.length, name: file.name });
  };
  media = await import("../lib/admin/media");
});
after(() => { globalThis.fetch = originalFetch; });
beforeEach(() => { files = new Map(); audits = []; storageFailure = null; process.env.NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA = "main"; });

test("an admin upload is audited, stored publicly readable in the bucket and served from /media", async t => {
  t.mock.method(console, "info", () => {});
  const result = await media.uploadAdminMedia(admin, new File([png], "../../evil name.svg", { type: "image/svg+xml" }), "Upload club banner");
  assert.match(result.path, /^\/media\/[a-zA-Z0-9]+$/);
  assert.equal(result.type, "image/png");
  const stored = files.get(result.id)!;
  assert.equal(stored.bucket, "main");
  assert.deepEqual(stored.permissions, ['read("any")']);
  assert.equal(stored.mimeType, "image/png", "type comes from the bytes, not the browser");
  assert.equal(stored.name, `listing-${result.id}.png`, "the operator's file name is not stored");
  assert.deepEqual(audits, [{ status: "completed", action: "media.upload", target: `media:${result.id}` }]);
  const served = await media.readPublicMedia(result.id);
  assert.equal(served?.type, "image/png");
  assert.deepEqual(new Uint8Array(served!.bytes), png);
});

test("uploads refuse non-admins, non-images, empty and oversized files before storage", async () => {
  await assert.rejects(media.uploadAdminMedia({ id: "member", labels: [] }, new File([png], "a.png"), "Upload club banner"), /Administrator/);
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  await assert.rejects(media.uploadAdminMedia(admin, new File([svg], "logo.png", { type: "image/png" }), "Upload club logo"), /JPEG, PNG/);
  await assert.rejects(media.uploadAdminMedia(admin, new File([], "empty.png"), "Upload club logo"), /Choose an image/);
  await assert.rejects(media.uploadAdminMedia(admin, "not a file", "Upload club logo"), /Choose an image/);
  const large = new Uint8Array(5 * 1024 * 1024 + 1); large.set(jpeg);
  await assert.rejects(media.uploadAdminMedia(admin, new File([large], "big.jpg"), "Upload club banner"), /5 MB/);
  assert.equal(files.size, 0);
  assert.deepEqual(audits, []);
});

test("a missing bucket setting or a Storage refusal is explained and nothing is left half-done", async t => {
  t.mock.method(console, "info", () => {});
  delete process.env.NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA;
  await assert.rejects(media.uploadAdminMedia(admin, new File([png], "a.png"), "Upload club banner"), /NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA/);
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA = "main";
  storageFailure = { code: 404, type: "storage_bucket_not_found" };
  await assert.rejects(media.uploadAdminMedia(admin, new File([png], "a.png"), "Upload club banner"), /bucket "main" was not found/);
  storageFailure = { code: 401, type: "general_unauthorized_scope" };
  await assert.rejects(media.uploadAdminMedia(admin, new File([png], "a.png"), "Upload club banner"), /files\.write/);
  assert.deepEqual(audits.map(row => row.status), ["failed", "failed"]);
  assert.equal(files.size, 0);
});

test("/media serves only public uploaded images, never other files in the bucket", async () => {
  files.set("private-doc", { bucket: "main", bytes: png, mimeType: "image/png", permissions: ['read("user:someone")'], name: "x.png" });
  files.set("public-pdf", { bucket: "main", bytes: new TextEncoder().encode("%PDF-1.7"), mimeType: "application/pdf", permissions: ['read("any")'], name: "x.pdf" });
  files.set("lying-type", { bucket: "main", bytes: new TextEncoder().encode("<html>"), mimeType: "image/png", permissions: ['read("any")'], name: "x.png" });
  files.set("other-bucket", { bucket: "secrets", bytes: png, mimeType: "image/png", permissions: ['read("any")'], name: "x.png" });
  for (const id of ["private-doc", "public-pdf", "lying-type", "other-bucket", "missing", "../main", "a/b"]) assert.equal(await media.readPublicMedia(id), null, id);
});

test("content accepts exact /media paths and image bytes are recognised by signature", () => {
  for (const value of ["/media/abc123", "/media/A.b_c-1"]) assert.ok(isMediaPath(value), value);
  for (const value of ["/media/", "/media/../secret", "/media/a/b", "/media/a?x=1", "/media/a#x", "/mediax/a", "/media/-a", undefined]) assert.equal(isMediaPath(value), false, String(value));
  const community = { ...contentTemplates.communities, id: "c" };
  assert.equal(contentSchemas.communities.parse({ ...community, bannerUrl: "/media/abc123", crestUrl: "/media/def456" }).bannerUrl, "/media/abc123");
  assert.throws(() => contentSchemas.communities.parse({ ...community, bannerUrl: "/media/../../etc" }));
  assert.equal(sniffImageType(png), "image/png");
  assert.equal(sniffImageType(jpeg), "image/jpeg");
  assert.equal(sniffImageType(new TextEncoder().encode("GIF89a......")), "image/gif");
  assert.equal(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
  assert.equal(sniffImageType(new Uint8Array([0, 0, 0, 28, ...new TextEncoder().encode("ftypavif")])), "image/avif");
  assert.equal(sniffImageType(new TextEncoder().encode("<svg>")), null);
});

test("GET /media/<id> returns the image with immutable caching and locked-down headers, else 404", async () => {
  const { GET } = await import("../app/media/[fileId]/route");
  files.set("public1", { bucket: "main", bytes: jpeg, mimeType: "image/jpeg", permissions: ['read("any")'], name: "x.jpg" });
  files.set("private1", { bucket: "main", bytes: jpeg, mimeType: "image/jpeg", permissions: [], name: "x.jpg" });
  const ok = await GET(new Request("https://noida.fit/media/public1"), { params: Promise.resolve({ fileId: "public1" }) });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/jpeg");
  assert.match(ok.headers.get("cache-control") ?? "", /immutable/);
  assert.match(ok.headers.get("content-security-policy") ?? "", /sandbox/);
  assert.deepEqual(new Uint8Array(await ok.arrayBuffer()), jpeg);
  const hidden = await GET(new Request("https://noida.fit/media/private1"), { params: Promise.resolve({ fileId: "private1" }) });
  assert.equal(hidden.status, 404);
  storageFailure = { code: 503, type: "general_server_error" };
  const down = await GET(new Request("https://noida.fit/media/public1"), { params: Promise.resolve({ fileId: "public1" }) });
  assert.equal(down.status, 503);
  assert.equal(down.headers.get("cache-control"), "no-store");
});
