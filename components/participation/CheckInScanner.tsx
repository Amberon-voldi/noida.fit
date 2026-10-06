"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

interface DetectorResult { rawValue?: string }
interface Detector { detect(source: CanvasImageSource): Promise<DetectorResult[]> }
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;

type Props = { onToken: (token: string) => void };

export function CheckInScanner({ onToken }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function stopCamera(): void {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function scan(): Promise<void> {
    setMessage(null);
    const detector = (window as typeof window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!detector) {
      setMessage("QR scanning is not available in this browser. Paste the signed link below instead.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access is not available here. Paste the signed link below instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setActive(true);
      const reader = new detector({ formats: ["qr_code"] });
      const read = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const results = await reader.detect(videoRef.current);
          const value = results.find(result => typeof result.rawValue === "string" && result.rawValue.trim())?.rawValue?.trim();
          if (value) {
            stopCamera();
            onToken(value);
            return;
          }
        } catch {
          // A camera frame can be unavailable while the browser changes focus.
        }
        timerRef.current = window.setTimeout(() => void read(), 250);
      };
      void read();
    } catch {
      stopCamera();
      setMessage("Camera access was not granted. Paste the signed link below instead.");
    }
  }

  return <div className="space-y-3 rounded-xl border border-border-subtle bg-background/30 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Scan the organizer QR</p><p className="mt-1 text-xs text-text-secondary">The camera stays on this device and stops after a code is found.</p></div><button type="button" onClick={active ? stopCamera : () => void scan()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong px-3 text-xs font-semibold text-white hover:bg-surface-hover">{active ? <CameraOff size={15} aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}{active ? "Stop camera" : "Use camera"}</button></div>
    <video ref={videoRef} className={active ? "aspect-video w-full rounded-lg bg-black object-cover" : "hidden"} playsInline muted aria-label="QR code camera preview" />
    {message && <p className="text-xs text-text-secondary" role="status" aria-live="polite">{message}</p>}
  </div>;
}
