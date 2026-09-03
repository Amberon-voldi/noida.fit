import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 flex-col items-center justify-center py-32 px-4 text-center"
        aria-labelledby="not-found-heading"
      >
        <div className="text-6xl mb-8 select-none" aria-hidden="true">
          🏃
        </div>
        <h1
          id="not-found-heading"
          className="text-4xl font-extrabold text-white tracking-tight mb-4"
          style={{ letterSpacing: "-0.03em" }}
        >
          Lost on the route?
        </h1>
        <p className="text-text-secondary max-w-md leading-relaxed mb-10">
          This page doesn&apos;t exist (yet). Head back to the homepage and find
          your way to the right community.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-velocity px-6 py-3 text-sm font-bold text-slate-950 hover:bg-velocity-glow transition-colors"
          >
            Back to Homepage
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-6 py-3 text-sm font-bold text-white hover:bg-surface-hover transition-colors"
          >
            Discover Noida Fitness
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
