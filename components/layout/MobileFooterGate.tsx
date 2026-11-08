"use client";

import { usePathname } from "next/navigation";

// Content pages keep the footer on mobile; app-style pages drop it there.
const MOBILE_FOOTER_PATHS = ["/about", "/for-organizers", "/privacy", "/refund-policy", "/terms"];

export function MobileFooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showOnMobile = MOBILE_FOOTER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return <div className={showOnMobile ? "mt-auto" : "mt-auto hidden md:block"}>{children}</div>;
}
