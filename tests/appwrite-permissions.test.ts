import assert from "node:assert/strict";
import { test } from "node:test";
import { documentPermissions, publicCollections } from "../scripts/lib/permissions";
import { collectionKeys } from "../scripts/lib/appwrite";

test("published content is readable by guests and members, but never client-writable", () => {
  for (const kind of publicCollections) {
    assert.deepEqual(documentPermissions(kind, { status: "published" }), ['read("any")']);
    for (const status of ["draft", "unpublished", "archived", undefined]) {
      assert.deepEqual(documentPermissions(kind, { status }), []);
    }
  }
});

test("private records are readable only by their owner, including opted-in profiles", () => {
  for (const kind of collectionKeys.filter(kind => !publicCollections.has(kind))) {
    assert.deepEqual(documentPermissions(kind, { userId: "test-user", status: "published" }), ['read("user:test-user")']);
    for (const userId of [undefined, "", "any", 'user\")', " "]) {
      if (userId === "any") {
        assert.deepEqual(documentPermissions(kind, { userId }), ['read("user:any")']);
      } else {
        assert.throws(() => documentPermissions(kind, { userId }), /missing or invalid userId/);
      }
    }
  }
});
