import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="page-loading mx-auto w-full max-w-7xl flex-1 px-4 py-16 sm:px-6 lg:px-8" aria-busy="true">
      <p role="status" className="flex items-center gap-2 text-sm text-text-secondary"><LoaderCircle className="h-4 w-4 animate-spin text-velocity" aria-hidden="true" />Loading your page…</p>
      <div aria-hidden="true">
        <div className="loading-heading mt-6 max-w-2xl"><div className="skeleton h-3 w-36 rounded" /><div className="skeleton mt-5 h-12 w-3/4 rounded" /><div className="skeleton mt-3 h-5 w-full max-w-xl rounded" /></div>
        <div className="loading-grid mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><LoadingCard /><LoadingCard /><LoadingCard /></div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface"><div className="skeleton aspect-[16/9]" /><div className="space-y-3 p-5"><div className="skeleton h-3 w-24 rounded" /><div className="skeleton h-6 w-4/5 rounded" /><div className="skeleton h-4 w-2/3 rounded" /></div></div>;
}
