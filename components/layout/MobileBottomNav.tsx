"use client";

import Link, { useLinkStatus } from "next/link";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, House, LoaderCircle, UserRound, Users, type LucideIcon } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: House, prefixes: ["/"] },
  { href: "/discover", label: "Discover", icon: Compass, prefixes: ["/discover", "/search", "/activities", "/places", "/place"] },
  { href: "/events", label: "Events", icon: CalendarDays, prefixes: ["/events", "/event"] },
  { href: "/communities", label: "Groups", icon: Users, prefixes: ["/communities", "/community"] },
  { href: "/account", label: "Account", icon: UserRound, prefixes: ["/account", "/fitness-id", "/login", "/signup"] },
];

function DockItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { pending } = useLinkStatus();
  return <>
    <span className="mobile-dock-icon-frame" data-nav-pending={pending}>
      <Icon className={`mobile-dock-icon h-5 w-5 ${pending ? "opacity-0" : ""}`} aria-hidden="true" />
      {pending && <LoaderCircle className="absolute inset-0 h-5 w-5 animate-spin" aria-hidden="true" />}
    </span>
    <span>{label}</span>
    {pending && <span role="status" className="sr-only">Opening {label}…</span>}
  </>;
}

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
          <Link key={href} href={href} prefetch={false} aria-label={label} aria-current={active ? "page" : undefined} className={`mobile-dock-link ${active ? "text-velocity" : "text-text-secondary hover:text-white"}`}>
            <DockItem icon={Icon} label={label} />
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
