import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <>
      <header className="border-b border-border-subtle px-4 py-5 sm:px-6"><div className="mx-auto max-w-7xl"><Logo size="md" /></div></header>
      <main id="main-content" tabIndex={-1} className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4 py-20 text-center" aria-labelledby="not-found-heading">
        <p className="eyebrow">404 · Not found</p>
        <h1 id="not-found-heading" className="mt-3 text-4xl font-extrabold tracking-tight">Lost on the route?</h1>
        <p className="mt-4 max-w-md leading-relaxed text-text-secondary">This page may have moved, or the listing is no longer published. Search the directory to find another way to move.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/discover" className="button-primary">Discover Noida Fitness</Link><Link href="/home" className="button-secondary">Back to home</Link></div>
      </main>
      <Footer />
    </>
  );
}
