"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Current({ className, children }: { className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // Back to this page after signing in (with email or Google), except from the sign-in pages themselves.
  const here = `${pathname}${search ? `?${search}` : ""}`;
  const href = /^\/(?:login|signup|welcome)(?:\/|$)/.test(pathname) ? "/login" : `/login?callbackUrl=${encodeURIComponent(here)}`;
  return <Link href={href} className={className}>{children}</Link>;
}

/** "Sign in" that returns the member to the page they were on. */
export function SignInLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Suspense fallback={<Link href="/login" className={className}>{children}</Link>}><Current className={className}>{children}</Current></Suspense>;
}
