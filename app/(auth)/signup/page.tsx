import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "@/components/auth/SignupForm";
import { safeCallbackUrl } from "@/components/auth/validation";

export const metadata: Metadata = {
  title: "Create your Fitness ID — NOIDA.FIT",
  description: "Join Noida’s fitness community. Your profile starts private; you choose what to share.",
  robots: { index: false, follow: false },
};

export default async function SignupPage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  if (await auth()) redirect(callbackUrl);
  return <SignupForm callbackUrl={callbackUrl} />;
}
