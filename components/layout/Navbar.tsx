import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS } from "@/lib/config";
import { MobileNav } from "@/components/layout/MobileNav";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

export async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-[500] w-full border-b border-border-subtle bg-background/90 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        <div className="flex items-center gap-6">
          <Logo size="md" />

          <ul className="hidden md:flex items-center gap-1" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-text-secondary hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors"
              >
                <span className="h-5 w-5 rounded-full bg-[#9ddc2e]/20 border border-[#9ddc2e]/40 flex items-center justify-center text-[10px] font-bold text-[#9ddc2e]">
                  {user.name?.charAt(0).toUpperCase() ?? "?"}
                </span>
                <span>My Account</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/@demo-user"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-white transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ddc2e] animate-pulse" />
                <span>Fitness ID</span>
              </Link>
              <Link
                href="/login"
                className="text-xs sm:text-sm font-medium text-text-secondary hover:text-white transition-colors px-2 py-1.5"
              >
                Sign In
              </Link>
            </>
          )}

          <Link
            href="/discover"
            className="inline-flex items-center rounded-xl bg-[#9ddc2e] px-4 py-2 text-xs sm:text-sm font-bold text-black hover:bg-[#b5f043] transition-colors shadow-[0_0_15px_rgba(157,220,46,0.25)] active:scale-95"
          >
            Explore Noida
          </Link>
        </div>

        <MobileNav />
      </nav>
    </header>
  );
}
