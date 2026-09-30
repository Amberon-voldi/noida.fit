import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeCallbackUrl } from "@/components/auth/validation";

export const metadata: Metadata = {
  title: "Sign in — NOIDA.FIT",
  description: "Sign in to save local plans, follow communities and manage your Fitness ID.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  if (await auth()) redirect(callbackUrl);
  return <LoginForm callbackUrl={callbackUrl} />;
}
