import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpError } from "../lib/http";
import { assertAdmin } from "../lib/admin/auth";
import { runAdminMutation } from "../lib/admin/audit";

test("administrator access requires the exact Appwrite admin label", () => {
  assert.doesNotThrow(() => assertAdmin({ id: "admin-user", labels: ["admin"] }));
  assert.throws(() => assertAdmin({ id: "member", labels: [] }), (error: unknown) => error instanceof HttpError && error.status === 403 && error.code === "ADMIN_REQUIRED");
  assert.throws(() => assertAdmin({ id: "member", labels: ["Admin"] }), (error: unknown) => error instanceof HttpError && error.status === 403);
});

test("privileged mutations fail closed when the audit collection is not configured", async () => {
  const previous = process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID;
  delete process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID;
  try {
    await assert.rejects(
      runAdminMutation({ id: "admin-user", labels: ["admin"] }, "content.test", "synthetic-record", "test action", async () => "must not run"),
      (error: unknown) => error instanceof HttpError && error.status === 503 && error.code === "AUDIT_NOT_CONFIGURED",
    );
  } finally {
    if (previous === undefined) delete process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID;
    else process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID = previous;
  }
});
