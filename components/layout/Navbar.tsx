import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS } from "@/lib/config";
import { MobileNav } from "@/components/layout/MobileNav";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

export async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="app-topbar sticky top-0 z-[500] w-full border-b border-border-subtle bg-background/95 backdrop-blur-md">
      <a href="#main-content" className="sr-only rounded-lg bg-velocity px-4 py-3 font-semibold text-slate-950 focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10">Skip to content</a>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
        <Logo size="md" className="app-logo" />
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => <li key={link.href}><Link href={link.href} className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-white">{link.label}</Link></li>)}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/search" aria-label="Search the directory" className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-white"><Search className="h-5 w-5" aria-hidden="true" /></Link>
          {user ? <><Link href="/account" className="button-secondary text-xs">My account</Link><SignOutButton /></> : <><Link href="/fitness-id" className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-text-secondary hover:text-white">Fitness ID</Link><Link href="/login" className="button-primary text-xs">Sign in</Link></>}
        </div>
        <MobileNav signedIn={!!user} />
      </nav>
    </header>
  );
}
