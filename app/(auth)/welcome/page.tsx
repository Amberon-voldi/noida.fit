import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeCallbackUrl } from "@/components/auth/validation";
import { WelcomeConsent } from "@/components/auth/WelcomeConsent";
import { OAUTH_PENDING_COOKIE } from "@/lib/appwrite/oauth";

export const metadata: Metadata = { title: "Welcome — NOIDA.FIT", robots: { index: false, follow: false } };

/** New with Google: agree to the Terms and the Privacy Policy, and your .fit ID is created. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeCallbackUrl((await searchParams).next);
  if (!(await cookies()).get(OAUTH_PENDING_COOKIE)?.value) redirect(`/login?callbackUrl=${encodeURIComponent(next)}`);
  return <WelcomeConsent next={next} />;
}
