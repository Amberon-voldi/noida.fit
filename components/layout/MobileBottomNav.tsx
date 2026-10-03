"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
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
  const activeIndex = LINKS.findIndex(({ prefixes }) => prefixes.some(prefix => pathname === prefix || (prefix !== "/" && pathname.startsWith(`${prefix}/`))));

  return (
    <nav aria-label="Quick navigation" className="mobile-dock lg:hidden">
      <div className="mobile-dock-inner" style={{ "--active-tab": Math.max(activeIndex, 0) } as CSSProperties}>
      <span className="mobile-dock-indicator" aria-hidden="true" style={{ opacity: activeIndex < 0 ? 0 : 1 }} />
      {LINKS.map(({ href, label, icon: Icon }, index) => {
        const active = index === activeIndex;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`mobile-dock-link ${active ? "text-velocity" : "text-text-secondary hover:text-white"}`}>
            <Icon className="mobile-dock-icon h-5 w-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
