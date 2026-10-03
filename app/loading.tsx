import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-16 sm:px-6 lg:px-8" aria-busy="true">
      <p role="status" className="flex items-center gap-2 text-sm text-text-secondary"><LoaderCircle className="h-4 w-4 animate-spin text-velocity" aria-hidden="true" />Loading your page…</p>
      <div aria-hidden="true">
        <div className="mt-6 max-w-2xl"><div className="h-3 w-36 animate-pulse rounded bg-surface-elevated" /><div className="mt-5 h-12 w-3/4 animate-pulse rounded bg-surface-elevated" /><div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-surface-elevated" /></div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><LoadingCard /><LoadingCard /><LoadingCard /></div>
      </div>
    </main>
  );
}

function LoadingCard() {
  return <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface"><div className="aspect-[16/9] animate-pulse bg-surface-elevated" /><div className="space-y-3 p-5"><div className="h-3 w-24 animate-pulse rounded bg-surface-elevated" /><div className="h-6 w-4/5 animate-pulse rounded bg-surface-elevated" /><div className="h-4 w-2/3 animate-pulse rounded bg-surface-elevated" /></div></div>;
}
