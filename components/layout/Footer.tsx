import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SITE_CONFIG } from "@/lib/config";

const FOOTER_COLUMNS = [
  {
    heading: "Discover",
    links: [
      { label: "Running", href: "/activities/running" },
      { label: "Cycling", href: "/activities/cycling" },
      { label: "Strength", href: "/activities/strength" },
      { label: "Sports", href: "/activities/sports" },
      { label: "All activities", href: "/activities" },
    ],
  },
  {
    heading: "Around Noida",
    links: [
      { label: "Sector 21A", href: "/discover?sector=Sector+21A" },
      { label: "Sector 137", href: "/discover?sector=Sector+137" },
      { label: "Sector 50", href: "/discover?sector=Sector+50" },
      { label: "Sector 91", href: "/discover?sector=Sector+91" },
      { label: "Greater Noida", href: "/discover?sector=Greater+Noida" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "Communities", href: "/communities" },
      { label: "Events", href: "/events" },
      { label: "Places", href: "/places" },
      { label: "Stories", href: "/stories" },
      { label: "For Organizers", href: "/for-organizers" },
      { label: "About", href: "/about" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer mt-auto border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 py-8 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Logo size="sm" />
            <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
              City-first fitness discovery for Noida & Greater Noida.
            </p>
            <a
              href={SITE_CONFIG.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm text-text-secondary transition-colors hover:text-white"
              aria-label="NOIDA.FIT on Instagram"
            >
              @noida.fit
            </a>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading} className="hidden sm:block">
              <h2 className="mb-3 text-sm font-semibold text-white">{col.heading}</h2>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="inline-flex min-h-11 items-center text-sm text-text-secondary transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <nav className="mb-4 flex flex-wrap gap-x-5 sm:hidden" aria-label="About the platform">
          <Link href="/about" className="inline-flex min-h-11 items-center text-sm text-text-secondary">About</Link>
          <Link href="/for-organizers" className="inline-flex min-h-11 items-center text-sm text-text-secondary">For organizers</Link>
          <Link href="/stories" className="inline-flex min-h-11 items-center text-sm text-text-secondary">Stories</Link>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle py-6 text-xs text-text-secondary">
          <p>&copy; {new Date().getFullYear()} NOIDA.FIT · Noida &amp; Greater Noida</p>
          <Link href="/about#contact-heading" className="inline-flex min-h-11 items-center hover:text-white">Suggest a listing or correction →</Link>
        </div>
      </div>
    </footer>
  );
}
