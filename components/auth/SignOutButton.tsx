"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-[#64748b] hover:text-white transition-colors"
    >
      Sign Out
    </button>
  );
}
