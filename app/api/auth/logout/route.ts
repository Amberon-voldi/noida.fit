import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookieOptions,
  deleteCurrentSession,
  APPWRITE_SESSION_COOKIE,
} from "@/lib/appwrite/auth";
import { isSameOrigin } from "@/app/api/auth/_security";
import { getSessionSecret } from "@/lib/appwrite/server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const secret = await getSessionSecret();
    if (secret) await deleteCurrentSession(secret);
    const response = NextResponse.json({ ok: true, redirectTo: "/" });
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(APPWRITE_SESSION_COOKIE, "", clearSessionCookieOptions());
    return response;
  } catch {
    // Do not claim server-side revocation when Appwrite is unavailable. Keep
    // the cookie so the user can retry and revoke the actual session.
    return NextResponse.json({ error: "Sign-out could not be completed. Please retry." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
