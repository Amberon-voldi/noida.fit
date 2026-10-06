"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

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
}
export interface CheckInScannerProps {
  onToken: (token: string) => void;
  disabled?: boolean;
}

function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission was denied. Allow camera access in your browser settings, then try again.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No camera was found. Connect a camera, then try again.";
  if (name === "NotReadableError" || name === "TrackStartError") return "The camera is busy or unavailable. Close other apps using it, then try again.";
  return "Could not start the camera. Check your browser permissions and try again.";
}

export function CheckInScanner({ onToken, disabled = false }: CheckInScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ScanSession | null>(null);
  const onTokenRef = useRef(onToken);
  const statusId = useId();
  const [phase, setPhase] = useState<"idle" | "starting" | "scanning">("idle");
  const [message, setMessage] = useState("Start the scanner and point the camera at a participant QR.");
  const active = phase !== "idle" && !disabled;
  // Reset local UI state as the parent pauses; the effect only releases hardware.
  if (disabled && phase !== "idle") {
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
  }, []);

  const stopCamera = useCallback(() => {
    releaseCamera();
    setPhase("idle");
    setMessage("Camera stopped. Start the scanner when you are ready.");
  }, [releaseCamera]);

  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => {
    window.addEventListener("pagehide", stopCamera);
    return () => {
      window.removeEventListener("pagehide", stopCamera);
      releaseCamera();
    };
  }, [releaseCamera, stopCamera]);
  useEffect(() => {
    if (disabled) releaseCamera();
  }, [disabled, releaseCamera]);

  async function scan(): Promise<void> {
    if (disabled || sessionRef.current) return;
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
      setMessage("Scanner ready. Hold the participant QR steady inside the preview.");

      const readFrame = async () => {
        if (!isCurrent()) return;
        let value: string | undefined;
        // Skip incomplete/background frames; one frame in flight, at most 4/s.
        if (!document.hidden && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth && video.videoHeight) {
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
        if (value?.trim()) {
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

  return <div className="min-w-0 space-y-3 rounded-xl border border-border-subtle bg-background/30 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">Scan participant QR</p>
        <p className="mt-1 text-xs text-text-secondary">Camera frames stay on this device. The camera stops after a code is found.</p>
      </div>
      <button type="button" disabled={disabled} onClick={active ? stopCamera : () => void scan()} aria-describedby={statusId} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-white hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-velocity-glow focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60">
        {active ? <CameraOff size={15} aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
        {active ? "Stop camera" : "Start scanner"}
      </button>
    </div>
    {/* Keep the video mounted before requesting permission, including on Safari. */}
    <video ref={videoRef} hidden={!active} className="aspect-video w-full min-w-0 rounded-lg bg-black object-contain" autoPlay playsInline muted aria-label="Participant QR camera preview" aria-describedby={statusId} />
    <p id={statusId} className="text-xs text-text-secondary" role="status" aria-live="polite" aria-atomic="true">{disabled ? "Scanner paused while the current participant is being processed." : message}</p>
  </div>;
}
