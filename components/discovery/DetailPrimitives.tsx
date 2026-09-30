import Link from "next/link";

export function Breadcrumb({ directory, href, title }: { directory: string; href: string; title: string }) {
  return <nav aria-label="Breadcrumb" className="border-b border-border-subtle bg-surface px-4 py-2 sm:px-6 lg:px-8"><ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 text-xs text-text-secondary"><li><Link href="/" className="inline-flex min-h-11 items-center hover:text-white">Home</Link></li><li aria-hidden="true">/</li><li><Link href={href} className="inline-flex min-h-11 items-center hover:text-white">{directory}</Link></li><li aria-hidden="true">/</li><li aria-current="page" className="min-w-0 break-words">{title}</li></ol></nav>;
}

export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
