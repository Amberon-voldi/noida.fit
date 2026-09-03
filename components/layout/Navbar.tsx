import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS } from "@/lib/config";
import { MobileNav } from "@/components/layout/MobileNav";

export function Navbar() {
  return (
    <header className="sticky top-0 z-[500] w-full border-b border-border-subtle bg-background/90 backdrop-blur-md">
      <nav
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        <Logo size="md" />

        <ul className="hidden md:flex items-center gap-0.5" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="px-3 py-2 rounded-md text-sm text-text-secondary hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/for-organizers"
            className="text-sm text-text-muted hover:text-white transition-colors"
          >
            For Organizers
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center rounded-lg bg-[#9ddc2e] px-4 py-2 text-sm font-bold text-black hover:bg-[#b5f043] transition-colors"
          >
            Explore
          </Link>
        </div>

        <MobileNav />
      </nav>
    </header>
  );
}
