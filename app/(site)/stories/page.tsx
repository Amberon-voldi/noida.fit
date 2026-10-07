import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "Stories from the Noida fitness community — runner profiles, club spotlights, and local fitness culture.",
  alternates: { canonical: "/stories" },
};

export default function StoriesPage() {
  return (
    <div className="min-h-full">
      <header className="public-page-header border-b border-border-subtle px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight">Stories</h1>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <span className="text-5xl mb-6" aria-hidden="true">📖</span>
          <h2 className="text-2xl font-bold text-white mb-3">Stories launching soon</h2>
          <p className="text-text-secondary max-w-md leading-relaxed">
            No stories have been published yet. This space is for local profiles, route
            notes, and first-hand community stories — not invented spotlights. There is
            no newsletter signup available right now.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/communities" className="button-primary">Browse communities</Link>
            <Link href="/about#contact-heading" className="button-secondary">Suggest a story</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
