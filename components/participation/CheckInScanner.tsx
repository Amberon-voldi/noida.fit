"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Camera, X } from "lucide-react";

interface DetectorResult { rawValue?: string }
interface Detector { detect(source: CanvasImageSource): Promise<DetectorResult[]> }
interface DetectorConstructor {
  new (options?: { formats?: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
}
interface ScanSession {
  stream: MediaStream | null;
  video: HTMLVideoElement;
  timer: number | null;
  /** Continuous mode: the last delivered code and when, so a held-up QR is not re-sent. */
  lastValue?: string;
  lastAt?: number;
  /** Brief hold after a delivery, until the parent's `disabled` takes over. */
  holdUntil?: number;
}
export interface CheckInScannerProps {
  onToken: (token: string) => void;
  disabled?: boolean;
  /** Attendance-desk mode: the camera keeps running between participants and
   * `disabled` only pauses decoding while the previous code is being recorded. */
  continuous?: boolean;
  /** While the camera runs, take over the whole screen with the preview. */
  fullscreen?: boolean;
  /** Heading shown over the full-screen preview, e.g. the event title. */
  title?: string;
  /** Extra line under the title in full-screen mode, e.g. attendance so far. */
  subtitle?: ReactNode;
  /** Rendered over the bottom of the full-screen preview, e.g. the latest scan result. */
  overlay?: ReactNode;
  /** Tells the parent when the camera starts or stops. */
  onActiveChange?: (active: boolean) => void;
}

const REPEAT_WINDOW_MS = 6_000;

function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission was denied. Allow camera access in your browser settings, then try again.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No camera was found. Connect a camera, then try again.";
  if (name === "NotReadableError" || name === "TrackStartError") return "The camera is busy or unavailable. Close other apps using it, then try again.";
  return "Could not start the camera. Check your browser permissions and try again.";
}

export function CheckInScanner({ onToken, disabled = false, continuous = false, fullscreen = false, title, subtitle, overlay, onActiveChange }: CheckInScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ScanSession | null>(null);
  const onTokenRef = useRef(onToken);
  const statusId = useId();
  const [phase, setPhase] = useState<"idle" | "starting" | "scanning">("idle");
  const [message, setMessage] = useState("Start the scanner and point the camera at a participant QR.");
  const pausedRef = useRef(disabled);
  const stops = disabled && !continuous;
  const active = phase !== "idle" && !stops;
  const immersive = fullscreen && active;
  // Reset local UI state as the parent pauses; the effect only releases hardware.
  if (stops && phase !== "idle") {
    setPhase("idle");
    setMessage("Camera stopped. Start the scanner when you are ready.");
  }

  // Invalidate before releasing resources: pending permission/play/detection
  // promises must never revive a stopped session or call the parent afterward.
  const releaseCamera = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    if (session.timer !== null) window.clearTimeout(session.timer);
    session.stream?.getTracks().forEach(track => {
      track.onended = null;
      track.stop();
    });
    session.video.pause();
    session.video.srcObject = null;
    // Leave native full screen only if this scanner owns it.
    if (typeof document !== "undefined" && document.fullscreenElement && document.fullscreenElement === shellRef.current) void document.exitFullscreen?.().catch(() => {});
  }, []);

  const stopCamera = useCallback(() => {
    releaseCamera();
    setPhase("idle");
    setMessage("Camera stopped. Start the scanner when you are ready.");
  }, [releaseCamera]);

  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => { pausedRef.current = disabled; }, [disabled]);
  useEffect(() => {
    window.addEventListener("pagehide", stopCamera);
    return () => {
      window.removeEventListener("pagehide", stopCamera);
      releaseCamera();
    };
  }, [releaseCamera, stopCamera]);
  useEffect(() => {
    if (stops) releaseCamera();
  }, [stops, releaseCamera]);
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => { onActiveChangeRef.current = onActiveChange; }, [onActiveChange]);
  useEffect(() => { onActiveChangeRef.current?.(active); }, [active]);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => {
    if (!immersive) return;
    // Keep the page behind the preview still; Escape or leaving native
    // full screen (Android back gesture) closes the scanner.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    // Move focus into the full-screen scanner and give it back afterwards.
    const shell = shellRef.current;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    shell?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") stopCamera(); };
    // Browsers may leave full screen on their own, e.g. Android Chrome to show the camera
    // permission prompt. Only a member leaving it while the camera runs closes the scanner.
    const onFullscreen = () => {
      if (!document.fullscreenElement && sessionRef.current && phaseRef.current === "scanning") stopCamera();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      else shell?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    };
  }, [immersive, stopCamera]);

  async function scan(): Promise<void> {
    if (stops || sessionRef.current) return;
    if (!window.isSecureContext) {
      setMessage("Camera access needs HTTPS or localhost. Open a secure NOIDA.FIT page and try again.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access is not available in this browser. Try a browser with camera support.");
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    // Must run inside the tap's user gesture, before any await. Where the
    // Fullscreen API is missing (iPhone Safari) the fixed layout still covers the page.
    if (fullscreen && shellRef.current?.requestFullscreen && !document.fullscreenElement) {
      void shellRef.current.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    }
    const session: ScanSession = { stream: null, video, timer: null };
    sessionRef.current = session;
    const isCurrent = () => sessionRef.current === session;
    const fail = (text: string) => {
      if (!isCurrent()) return;
      releaseCamera();
      setPhase("idle");
      setMessage(text);
    };
    setPhase("starting");
    setMessage("Waiting for camera permission and preview… You can stop at any time.");
    let stage: "camera" | "preview" | "decoder" = "camera";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!isCurrent()) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      session.stream = stream;
      stream.getVideoTracks().forEach(track => {
        track.onended = () => fail("The camera disconnected. Reconnect it and try again.");
      });
      video.srcObject = stream;
      video.muted = true;
      stage = "preview";
      await video.play();
      if (!isCurrent()) return;
      stage = "decoder";

      let reader: Detector | null = null;
      const NativeDetector = (window as typeof window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (NativeDetector) {
        try {
          const formats = await NativeDetector.getSupportedFormats?.();
          if (!formats || formats.includes("qr_code")) reader = new NativeDetector({ formats: ["qr_code"] });
        } catch {
          // Native detection can exist without usable QR support.
        }
      }
      if (!isCurrent()) return;

      let fallback: ((source: HTMLVideoElement) => string | undefined) | null = null;
      const loadFallback = async () => {
        // Keep the decoder out of the initial bundle and all frames on-device.
        const jsQR = (await import("jsqr")).default;
        if (!isCurrent()) return;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Camera frame processing is unavailable");
        fallback = source => {
          const scale = Math.min(1, 640 / Math.max(source.videoWidth, source.videoHeight));
          canvas.width = Math.max(1, Math.round(source.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(source.videoHeight * scale));
          context.drawImage(source, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" })?.data;
        };
      };
      if (!reader) await loadFallback();
      if (!isCurrent()) return;
      setPhase("scanning");
      setMessage(continuous
        ? "Scanner ready. Hold each participant’s QR steady inside the preview. The camera stays on between people."
        : "Scanner ready. Hold the participant QR steady inside the preview.");

      const readFrame = async () => {
        if (!isCurrent()) return;
        let value: string | undefined;
        // Skip incomplete/background frames; one frame in flight, at most 4/s.
        // A desk scanner also skips frames while the previous code is recorded.
        const held = continuous && (pausedRef.current || Date.now() < (session.holdUntil ?? 0));
        if (!held && !document.hidden && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth && video.videoHeight) {
          if (reader) {
            try {
              const results = await reader.detect(video);
              value = results.find(result => result.rawValue?.trim())?.rawValue;
            } catch {
              reader = null;
              if (!isCurrent()) return;
              try { await loadFallback(); } catch {
                fail("QR scanning could not load. Check your connection and try again.");
                return;
              }
            }
          }
          if (!isCurrent()) return;
          if (!reader && fallback) {
            try { value = fallback(video); } catch {
              // Frames may be temporarily unavailable when changing focus.
            }
          }
        }
        if (!isCurrent()) return;
        if (value?.trim() && continuous) {
          // The same card held in view is delivered once, not every 250 ms.
          const code = value.trim();
          const now = Date.now();
          if (code !== session.lastValue || now - (session.lastAt ?? 0) > REPEAT_WINDOW_MS) {
            session.lastValue = code;
            session.lastAt = now;
            session.holdUntil = now + 1_200;
            onTokenRef.current(code);
          }
        } else if (value?.trim()) {
          // Single-shot delivery only. Never put the QR payload in UI or logs.
          releaseCamera();
          setPhase("idle");
          setMessage("QR captured. Camera stopped.");
          onTokenRef.current(value.trim());
          return;
        }
        session.timer = window.setTimeout(() => void readFrame(), 250);
      };
      void readFrame();
    } catch (error) {
      fail(stage === "camera" ? cameraError(error) : stage === "preview"
        ? "The camera preview could not play. Try again or use another browser."
        : "QR scanning could not load. Check your connection and try again.");
    }
  }

  const statusText = stops ? "Scanner paused while the current participant is being processed." : continuous && disabled && active ? "Checking this participant…" : message;
  // One stable tree in both layouts, so the <video> element is never remounted mid-session.
  // z-[1000] sits above the site nav (z-500) and mobile dock (z-490).
  return <div ref={shellRef} data-fullscreen={immersive || undefined} className={immersive
    ? "fixed inset-0 z-[1000] m-0 flex flex-col overflow-hidden bg-black"
    : "min-w-0 space-y-3 rounded-xl border border-border-subtle bg-background/30 p-4"} role={immersive ? "dialog" : undefined} aria-modal={immersive || undefined} aria-label={immersive ? `Check-in scanner${title ? ` for ${title}` : ""}` : undefined}>
    <div className={immersive
      ? "relative z-10 flex items-start justify-between gap-3 bg-linear-to-b from-black/85 via-black/50 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]"
      : "flex flex-wrap items-center justify-between gap-3"}>
      <div className="min-w-0">
        <p className={immersive ? "truncate text-lg font-bold text-white" : "text-sm font-semibold text-white"}>{immersive && title ? title : "Scan participant QR"}</p>
        <p className={immersive ? "mt-0.5 text-sm text-white/80" : "mt-1 text-xs text-text-secondary"}>{immersive && subtitle ? subtitle : <>Camera frames stay on this device. {continuous ? "The camera stays on until you stop it." : "The camera stops after a code is found."}</>}</p>
      </div>
      <button type="button" disabled={stops} onClick={active ? stopCamera : () => void scan()} aria-describedby={statusId} className={immersive
        ? "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-velocity-glow"
        : "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-white hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-velocity-glow focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"}>
        {active ? <X size={15} aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
        {active ? "Stop camera" : "Start scanner"}
      </button>
    </div>
    <div className={immersive ? "absolute inset-0" : active ? "relative" : "hidden"}>
      {/* Keep the video mounted before requesting permission, including on Safari. */}
      <video ref={videoRef} hidden={!active} className={immersive ? "h-full w-full bg-black object-cover" : "aspect-video w-full min-w-0 rounded-lg bg-black object-contain"} autoPlay playsInline muted aria-label="Participant QR camera preview" aria-describedby={statusId} />
      {immersive && <div className="pointer-events-none absolute left-1/2 top-[42%] aspect-square w-[min(68vw,46vh)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-white/70 shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)]" aria-hidden="true" />}
    </div>
    <div className={immersive ? "relative z-10 mt-auto space-y-3 bg-linear-to-t from-black/90 via-black/60 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12" : undefined}>
      {immersive && overlay}
      <p id={statusId} className={immersive ? "text-center text-sm text-white/85" : "text-xs text-text-secondary"} role="status" aria-live="polite" aria-atomic="true">{statusText}</p>
    </div>
  </div>;
}
