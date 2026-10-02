"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, House, UserRound, Users } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: House, prefixes: ["/"] },
  { href: "/discover", label: "Discover", icon: Compass, prefixes: ["/discover", "/search", "/activities", "/places", "/place"] },
  { href: "/events", label: "Events", icon: CalendarDays, prefixes: ["/events", "/event"] },
  { href: "/communities", label: "Groups", icon: Users, prefixes: ["/communities", "/community"] },
  { href: "/account", label: "Account", icon: UserRound, prefixes: ["/account", "/fitness-id", "/login", "/signup"] },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-[490] grid grid-cols-5 border-t border-border-subtle bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md lg:hidden">
      {LINKS.map(({ href, label, icon: Icon, prefixes }) => {
        const active = prefixes.some((prefix) => pathname === prefix || (prefix !== "/" && pathname.startsWith(`${prefix}/`)));
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold ${active ? "bg-surface text-velocity" : "text-text-secondary hover:bg-surface-hover hover:text-white"}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
