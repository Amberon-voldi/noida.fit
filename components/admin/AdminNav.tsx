"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modules = [
  ["/admin", "Overview"], ["/admin/content/events", "Events"], ["/admin/content/communities", "Clubs"],
  ["/admin/content/places", "Places"], ["/admin/content/activities", "Activities"],
  ["/admin/members", "Members"], ["/admin/attendance", "Attendance"], ["/admin/audit", "Audit trail"], ["/admin/guide", "Admin guide"],
];

export function AdminNav() {
  const pathname = usePathname();
  return <nav className="admin-nav" aria-label="Admin modules">{modules.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav>;
}
