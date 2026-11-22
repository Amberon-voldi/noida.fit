"use client";

/**
 * Sound and vibration at the check-in desk, so the operator knows a QR was read before the server answers,
 * and hears the answer without reading the screen. Vibration works on Android; iPhones only get the sound.
 * Browsers start audio only from a tap, so the desk unlocks it on the first tap (unlockScanSound).
 */
let audio: AudioContext | null = null;

export function unlockScanSound(): void {
  try {
    const Context = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    audio ??= new Context();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    // No sound on this device: vibration and the screen still show the result.
  }
}

function tone(context: AudioContext, frequency: number, startsIn: number, seconds: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + startsIn;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.02);
}

/** `read`: a QR was decoded and is being checked. `ok`: checked in (or already in). `problem`: anything else. */
export type ScanCue = "read" | "ok" | "problem";

export function scanCue(cue: ScanCue): void {
  try {
    navigator.vibrate?.(cue === "read" ? 40 : cue === "ok" ? [70, 50, 70] : 300);
  } catch {
    // Vibration is optional.
  }
  if (audio?.state !== "running") return;
  try {
    if (cue === "read") tone(audio, 1400, 0, 0.06);
    else if (cue === "ok") { tone(audio, 880, 0, 0.1); tone(audio, 1320, 0.11, 0.14); }
    else tone(audio, 220, 0, 0.4);
  } catch {
    // Sound is optional.
  }
}
