import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SITE_CONFIG } from "@/lib/config";

const FOOTER_COLUMNS = [
  {
    heading: "Discover",
    links: [
      { label: "Running", href: "/discover?activity=running" },
      { label: "Cycling", href: "/discover?activity=cycling" },
      { label: "Strength", href: "/discover?activity=strength" },
      { label: "Sports", href: "/discover?activity=sports" },
      { label: "Wellness", href: "/discover?activity=wellness" },
    ],
  },
  {
    heading: "Venues",
    links: [
      { label: "Noida Stadium", href: "/place/noida-stadium-sector-21a" },
      { label: "Expressway Corridor", href: "/place/noida-expressway-loop" },
      { label: "Meghdootam Park", href: "/place/meghdootam-park-sector-50" },
      { label: "Biodiversity Park", href: "/place/biodiversity-park-sector-91" },
      { label: "Greater Noida", href: "/place/city-park-greater-noida" },
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
    <footer className="mt-auto border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Logo size="sm" />
            <p className="text-xs text-text-muted leading-relaxed max-w-[200px]">
              City-first fitness discovery for Noida & Greater Noida.
            </p>
            <a
              href={SITE_CONFIG.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-white transition-colors"
              aria-label="NOIDA.FIT on Instagram"
            >
              @noida.fit
            </a>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold text-white mb-4">{col.heading}</h3>
              <ul className="space-y-2.5" role="list">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs text-text-muted hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border-subtle py-6">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} NOIDA.FIT
          </p>
        </div>
      </div>
    </footer>
  );
}
