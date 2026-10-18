import assert from "node:assert/strict";
import { test } from "node:test";
import { deckPosition, heroPointerFrame } from "../components/landing/hero-interaction";

test("hero pointer geometry settles at centre and stays bounded outside the viewport", () => {
  assert.deepEqual(heroPointerFrame(320, 450, 640, 900), { x: 0, y: 0, rotation: 0 });
  assert.deepEqual(heroPointerFrame(0, 0, 640, 900), { x: -18, y: -14, rotation: -5 });
  assert.deepEqual(heroPointerFrame(640, 900, 640, 900), { x: 18, y: 14, rotation: 5 });
  assert.deepEqual(heroPointerFrame(-5000, 5000, 640, 900), { x: -18, y: 14, rotation: -5 });
  for (let x = -100; x < 1000; x += 11) {
    const pose = heroPointerFrame(x, x / 2, 390, 900);
    assert.ok(Math.abs(pose.x) <= 18 && Math.abs(pose.y) <= 14 && Math.abs(pose.rotation) <= 5);
  }
});

test("hero pointer geometry rejects non-finite input and invalid dimensions", () => {
  for (const inputs of [[NaN, 0, 320, 900], [0, Infinity, 320, 900], [0, 0, 0, 900], [0, 0, 320, -1], [0, 0, Infinity, 900]]) {
    assert.deepEqual(heroPointerFrame(...inputs as [number, number, number, number]), { x: 0, y: 0, rotation: 0 });
  }
});

test("deck positions rotate the active card to the front and wrap safely", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(index => deckPosition(index, 0, 5)), [0, 1, 2, 3, 4]);
  assert.deepEqual([0, 1, 2, 3, 4].map(index => deckPosition(index, 2, 5)), [3, 4, 0, 1, 2]);
  assert.equal(deckPosition(4, 4, 5), 0);
  assert.equal(deckPosition(1, 7, 5), 4);
  for (const inputs of [[NaN, 0, 5], [0, 1.5, 5], [0, 0, 0], [0, 0, -2]]) assert.equal(deckPosition(...inputs as [number, number, number]), 0);
});
