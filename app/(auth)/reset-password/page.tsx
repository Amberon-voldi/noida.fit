import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password — NOIDA.FIT",
  robots: { index: false, follow: false },
  // The recovery secret is in the query string; never leak it to linked sites.
  referrer: "no-referrer",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ userId?: string | string[]; secret?: string | string[] }>;
}) {
  const params = await searchParams;
  const userId = first(params.userId);
  const secret = first(params.secret);
  if (!userId || !secret) {
    return <div className="text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">This reset link is incomplete</h1>
      <p className="text-sm text-text-secondary">Open the full link from your email, or request a new one.</p>
      <Link href="/forgot-password" className="button-primary mt-6 w-full">Send a new link</Link>
    </div>;
  }
  return <ResetPasswordForm userId={userId} secret={secret} />;
}
