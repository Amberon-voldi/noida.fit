import { LoaderCircle } from "lucide-react";

export type AuthSubmitStatus = "idle" | "submitting" | "redirecting";

export function AuthSubmitButton({ status, label, submittingLabel }: { status: AuthSubmitStatus; label: string; submittingLabel: string }) {
  const busy = status !== "idle";
  return (
    <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-velocity px-4 py-3 text-sm font-bold text-background disabled:cursor-wait disabled:opacity-80">
      {busy && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
      <span>{status === "redirecting" ? "Opening your page…" : busy ? submittingLabel : label}</span>
    </button>
  );
}
