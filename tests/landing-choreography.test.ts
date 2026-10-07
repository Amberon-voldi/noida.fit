import assert from "node:assert/strict";
import { test } from "node:test";
import { curtainFrame, identityFrame, scrollEntryProgress, scrollSceneProgress, storyCardFrame, storyWheelFrame } from "../components/landing/choreography";

test("sticky scene progress is bounded, reversible and tied to native scroll geometry", () => {
  assert.equal(scrollSceneProgress(64, 2400, 900), 0);
  assert.equal(scrollSceneProgress(64 - 782, 2400, 900), .5);
  assert.equal(scrollSceneProgress(64 - 1564, 2400, 900), 1);
  assert.equal(scrollSceneProgress(900, 2400, 900), 0);
  assert.equal(scrollSceneProgress(-4000, 2400, 900), 1);
  assert.equal(scrollSceneProgress(Number.NaN, 2400, 900), 0);
  assert.equal(scrollSceneProgress(10, 0, 900), 0);
  assert.equal(scrollSceneProgress(56, 1600, 700, 56), 0);
});

test("curtains open smoothly before the end of the scene without scaling beyond bounds", () => {
  assert.deepEqual(curtainFrame(0), { open: 0, photoScale: 1.1, titleShift: 24 });
  assert.equal(curtainFrame(.58).open, 1);
  assert.equal(curtainFrame(1).photoScale, 1);
  let previous = -1;
  for (let i = 0; i <= 100; i++) {
    const frame = curtainFrame(i / 100);
    assert.ok(frame.open >= previous && frame.open <= 1); previous = frame.open;
    assert.ok(frame.photoScale >= 1 && frame.photoScale <= 1.1);
    assert.ok(frame.titleShift >= 0 && frame.titleShift <= 24);
  }
});

test("Fitness ID reveals, makes one full scroll-driven rotation and hands off to the next chapter", () => {
  assert.equal(identityFrame(0).reveal, 0);
  assert.equal(identityFrame(.22).reveal, 1);
  assert.equal(identityFrame(.25).rotation, 0);
  assert.equal(identityFrame(.83).rotation, 360);
  assert.equal(identityFrame(1).handoff, 1);
  assert.equal(identityFrame(1).x, -68);
  assert.equal(identityFrame(1, true).x, -12);
  assert.equal(identityFrame(1, true).y, -24);
  let previous = -18;
  for (let i = 0; i <= 100; i++) {
    const frame = identityFrame(i / 100);
    assert.ok(frame.rotation >= previous && frame.rotation <= 360); previous = frame.rotation;
    assert.ok(frame.scale >= .85 && frame.scale <= 1);
    assert.ok(Math.abs(frame.roll) <= 10 && Math.abs(frame.tilt) <= 10);
  }
  assert.deepEqual(identityFrame(.45), identityFrame(.45), "same scroll position has the same pose, without a time-based loop");
});

test("story wheel rotates and settles exactly; cards enter from opposing directions without a time-based loop", () => {
  assert.equal(scrollEntryProgress(828, 900), 0);
  assert.equal(scrollEntryProgress(108, 900), 1);
  assert.equal(scrollEntryProgress(Number.NaN, 900), 0);
  assert.equal(scrollEntryProgress(100, 0), 0);
  assert.deepEqual(storyWheelFrame(1), { rotation: 0, x: 0, y: 0, scale: 1 });
  assert.equal(storyWheelFrame(0).rotation, -330);
  assert.equal(storyWheelFrame(0, true).x, 32);
  assert.equal(storyCardFrame(0, 0).x, -130);
  assert.equal(storyCardFrame(0, 1).x, 130);
  assert.deepEqual(storyCardFrame(1, 2), { progress: 1, x: 0, y: 0, rotation: 0, tilt: 0, scale: 1 });
  for (let i = 0; i <= 100; i++) {
    const wheel = storyWheelFrame(i / 100);
    const card = storyCardFrame(i / 100, i % 4);
    assert.ok(wheel.rotation >= -330 && wheel.rotation <= 0 && wheel.scale >= .7 && wheel.scale <= 1);
    assert.ok(card.scale >= .88 && card.scale <= 1 && Math.abs(card.x) <= 130 && Math.abs(card.rotation) <= 12);
  }
});
