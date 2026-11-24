import { NextRequest, NextResponse } from "next/server";
import { sessionCookieOptions, APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/auth";
import { guardMutation, safeCallbackUrl } from "@/app/api/auth/_security";
import { signUp } from "@/app/api/auth/_accounts";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const rejected = guardMutation(request, "auth-signup");
  if (rejected) return rejected;

  try {
    const session = await signUp(request);
    const response = NextResponse.json({ ok: true, redirectTo: safeCallbackUrl(session.callbackUrl) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
    response.cookies.set(APPWRITE_SESSION_COOKIE, session.secret, sessionCookieOptions(session.expire));
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
