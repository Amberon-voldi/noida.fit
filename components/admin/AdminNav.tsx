"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { BookOpen, ChevronDown } from "lucide-react";

const groups = [
  { label: "Workspace", modules: [["/admin", "Overview"]] },
  { label: "Directory", modules: [["/admin/content/events", "Events"], ["/admin/content/communities", "Clubs"], ["/admin/content/places", "Places"], ["/admin/content/activities", "Activities"]] },
  { label: "Operations", modules: [["/admin/members", "Members"], ["/admin/attendance", "Attendance"], ["/admin/audit", "Audit trail"]] },
];

export function AdminNav() {
  const pathname = usePathname();
  const switcher = useRef<HTMLDetailsElement>(null);
  const activeLabel = groups.flatMap(group => group.modules).find(([href]) => pathname === href)?.[1] ?? (pathname === "/admin/guide" ? "Admin guide" : "Admin");
  const moduleLinks = groups.map(group => <div className="admin-nav-group" key={group.label}>
    <p>{group.label}</p>
    {group.modules.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => { if (switcher.current) switcher.current.open = false; }}>{label}</Link>)}
  </div>);
  const guide = <Link href="/admin/guide" className="admin-nav-guide" aria-current={pathname === "/admin/guide" ? "page" : undefined}><BookOpen size={16} aria-hidden="true" /><span>Admin guide</span></Link>;

  return <aside className="admin-navigation">
    <nav className="admin-nav admin-nav-desktop" aria-label="Admin modules"><p className="admin-nav-title">Admin workspace</p>{moduleLinks}{guide}</nav>
    <nav className="admin-nav admin-nav-mobile" aria-label="Admin modules">
      <details ref={switcher} className="admin-module-switcher" onKeyDown={event => { if (event.key === "Escape" && switcher.current?.open) { switcher.current.open = false; switcher.current.querySelector("summary")?.focus(); } }}>
        <summary><span><small>Admin module</small><strong>{activeLabel}</strong></span><ChevronDown size={16} aria-hidden="true" /></summary>
        <div className="admin-mobile-modules">{moduleLinks}</div>
      </details>
      {guide}
    </nav>
  </aside>;
}
