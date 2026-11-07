import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getClientKey } from "../lib/http";

const request = (forwardedFor?: string) => new Request("https://noida.fit/api/auth/login", forwardedFor ? { headers: { "x-forwarded-for": forwardedFor } } : {});
afterEach(() => { delete process.env.TRUSTED_PROXY_COUNT; delete process.env.NEXT_PUBLIC_TRUST_PROXY_IP; });

test("without trusted proxy settings every client shares one key, as before", () => {
  assert.equal(getClientKey(request("203.0.113.7")), "untrusted-network");
});

test("behind appending proxies the client is the Nth address from the right and cannot be forged", () => {
  process.env.TRUSTED_PROXY_COUNT = "1";
  // CloudFront appends the viewer address; anything to its left came from the client.
  assert.equal(getClientKey(request("198.51.100.1, 203.0.113.7")), "203.0.113.7");
  assert.equal(getClientKey(request("203.0.113.7")), "203.0.113.7");
  process.env.TRUSTED_PROXY_COUNT = "2";
  assert.equal(getClientKey(request("198.51.100.1, 203.0.113.7, 10.0.0.5")), "203.0.113.7");
  assert.equal(getClientKey(request("10.0.0.5")), "untrusted-network", "fewer entries than trusted hops");
  process.env.TRUSTED_PROXY_COUNT = "abc";
  assert.equal(getClientKey(request("203.0.113.7")), "untrusted-network");
});

test("the overwrite-style setting still uses the first address", () => {
  process.env.NEXT_PUBLIC_TRUST_PROXY_IP = "true";
  assert.equal(getClientKey(request("203.0.113.7, 10.0.0.5")), "203.0.113.7");
});
