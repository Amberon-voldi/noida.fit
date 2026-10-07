const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };
const interval = (progress: number, from: number, to: number) => smooth((progress - from) / (to - from));

/** Progress of a native-scroll sticky scene; no wheel/touch interception or artificial scroll position. */
export function scrollSceneProgress(top: number, height: number, viewport: number, offset = 64): number {
  if (![top, height, viewport, offset].every(Number.isFinite) || viewport <= 0 || height <= 0) return 0;
  return clamp((offset - top) / Math.max(1, height - viewport + offset));
}
/** Entrance progress uses an untransformed wrapper, preventing transform→geometry feedback. */
export function scrollEntryProgress(top: number, viewport: number, start = .92, end = .12): number {
  if (![top, viewport, start, end].every(Number.isFinite) || viewport <= 0 || start <= end) return 0;
  return clamp((viewport * start - top) / (viewport * (start - end)));
}
export function storyWheelFrame(progress: number, mobile = false) {
  const p = smooth(progress);
  if (p === 1) return { rotation: 0, x: 0, y: 0, scale: 1 };
  return { rotation: -330 * (1 - p), x: (1 - p) * (mobile ? 32 : 110), y: (1 - p) * 70, scale: .7 + .3 * p };
}
export function storyCardFrame(progress: number, index: number, mobile = false) {
  const p = smooth(progress);
  if (p === 1) return { progress: 1, x: 0, y: 0, rotation: 0, tilt: 0, scale: 1 };
  const direction = index % 2 === 0 ? -1 : 1;
  return { progress: p, x: direction * (1 - p) * (mobile ? 36 : 130), y: (1 - p) * (110 + index * 8), rotation: direction * (1 - p) * 12, tilt: (1 - p) * 14, scale: .88 + .12 * p };
}
export function curtainFrame(progress: number) {
  const p = clamp(progress);
  const open = interval(p, 0, .58);
  return { open, photoScale: 1.1 - open * .1, titleShift: (1 - open) * 24 };
}
export function identityFrame(progress: number, mobile = false) {
  const p = clamp(progress);
  const reveal = interval(p, 0, .22);
  const spin = interval(p, .25, .83);
  const handoff = interval(p, .74, 1);
  return {
    reveal,
    rotation: -18 * (1 - reveal) + 360 * spin,
    tilt: -10 * (1 - reveal) + 6 * Math.sin(spin * Math.PI),
    roll: -9 * (1 - reveal) + 7 * Math.sin(spin * Math.PI) - 5 * handoff,
    x: -handoff * (mobile ? 12 : 68),
    y: 70 * (1 - reveal) - handoff * (mobile ? 24 : 58),
    scale: .86 + .14 * reveal - .1 * handoff,
    handoff,
  };
}
