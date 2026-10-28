import type { Metadata } from "next";
import Link from "next/link";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

export const metadata: Metadata = {
  title: "Verify your email — NOIDA.FIT",
  robots: { index: false, follow: false },
  // The verification secret is in the query string; never leak it to linked sites.
  referrer: "no-referrer",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function VerifyEmailPage({ searchParams }: {
  searchParams: Promise<{ userId?: string | string[]; secret?: string | string[] }>;
}) {
  const params = await searchParams;
  const userId = first(params.userId);
  const secret = first(params.secret);
  if (!userId || !secret) {
    return <div className="text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">This verification link is incomplete</h1>
      <p className="text-sm text-text-secondary">Open the full link from your email, or send a new one from your account.</p>
      <Link href="/account" className="button-primary mt-6 w-full">Go to my account</Link>
    </div>;
  }
  return <VerifyEmail userId={userId} secret={secret} />;
}
