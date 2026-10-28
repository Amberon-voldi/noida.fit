import { MailWarning } from "lucide-react";
import { auth } from "@/lib/auth";
import { ResendVerificationButton } from "./ResendVerificationButton";

/** Signed-in members with an unverified email can browse, but not take part, until they verify. */
export async function VerifyEmailBanner() {
  const session = await auth();
  if (!session || session.user.emailVerified) return null;
  return (
    <aside aria-label="Email verification" className="border-b border-border-subtle bg-surface px-4 py-3">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 sm:px-2 lg:px-4">
        <p className="flex min-w-0 flex-[1_1_18rem] items-start gap-2 text-sm leading-relaxed text-text-secondary">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-velocity" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">Verify your email to RSVP, save, follow and check in. We sent a link to <strong className="font-semibold text-white">{session.user.email}</strong>.</span>
        </p>
        <ResendVerificationButton />
      </div>
    </aside>
  );
}
