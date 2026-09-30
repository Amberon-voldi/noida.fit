"use client";

import Link from "next/link";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-[70vh] flex-1 items-center justify-center px-4 py-16 text-center">
      <div role="alert">
        <p className="eyebrow">Temporarily unavailable</p>
        <h1 className="mt-3 text-3xl font-extrabold">That didn’t load cleanly.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">We couldn’t load this page. Your search hasn’t been changed. Try again, or return to the directory.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={retry} className="button-primary">Try again</button><Link href="/discover" className="button-secondary">Open discovery</Link></div>
      </div>
    </main>
  );
}
