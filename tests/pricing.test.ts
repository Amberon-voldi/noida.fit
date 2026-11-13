import assert from "node:assert/strict";
import { test } from "node:test";
import { formatInr, paidPrice, parseEventPrice } from "../lib/pricing";

test("only an exact FREE or rupee amount is read as money", () => {
  for (const value of ["FREE", "free", " Free ", "₹0", "0", "Rs. 0.00"]) assert.deepEqual(parseEventPrice(value), { kind: "free", amount: 0, label: "Free" }, value);
  assert.deepEqual(parseEventPrice("₹199"), { kind: "paid", amount: 19900, label: "₹199" });
  assert.deepEqual(parseEventPrice(" ₹1,499.50 "), { kind: "paid", amount: 149950, label: "₹1,499.50" });
  assert.deepEqual(parseEventPrice("₹100000"), { kind: "paid", amount: 10000000, label: "₹1,00,000" });
  assert.equal(parseEventPrice("Rs. 200").amount, 20000);
  assert.equal(parseEventPrice("INR 200").amount, 20000);
});

test("free-form or out-of-range prices are shown as written and never ticketed", () => {
  for (const value of ["200", "₹200 onwards", "Pay at venue", "₹-5", "₹1e5", "₹0.001", "₹100001", "₹199 ₹1"]) {
    assert.deepEqual(parseEventPrice(value), { kind: "info", amount: 0, label: value }, value);
  }
  for (const value of ["", "  ", undefined, null, 199, { price: "₹199" }]) assert.deepEqual(parseEventPrice(value), { kind: "info", amount: 0, label: "Ask the host" });
});

test("stored prices round-trip through the editor helpers", () => {
  assert.equal(paidPrice(199), "₹199");
  assert.equal(parseEventPrice(paidPrice(199)).amount, 19900);
  assert.equal(formatInr(19900), "₹199");
  assert.equal(formatInr(19950), "₹199.50");
});
