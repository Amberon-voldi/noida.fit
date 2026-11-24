import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeCallbackUrl } from "@/components/auth/validation";

export const metadata: Metadata = {
  title: "Sign in — NOIDA.FIT",
  description: "Sign in to save local plans, follow communities and manage your .fit ID.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  if (await auth()) redirect(callbackUrl);
  return <AuthForm callbackUrl={callbackUrl} googleError={params.error === "google"} />;
}
