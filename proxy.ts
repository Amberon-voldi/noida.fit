import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/config";

/** Routing and optimistic cookie checks only; server pages/APIs validate the session. */
export function proxy(request: NextRequest) {
  let pathname: string;
  try {
    pathname = decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const publicHandle = /^\/@([a-z0-9][a-z0-9._-]{1,38}[a-z0-9])\/?$/i.exec(pathname);
  if (publicHandle) {
    const username = publicHandle[1].toLowerCase();
    const url = request.nextUrl.clone();
    if (pathname !== `/@${username}`) {
      url.pathname = `/@${username}`;
      return NextResponse.redirect(url);
    }
    url.pathname = `/fitness-id/${username}`;
    return NextResponse.rewrite(url);
  }

  const legacyHandle = /^\/fitness-id\/([a-z0-9][a-z0-9._-]{1,38}[a-z0-9])\/?$/i.exec(pathname);
  if (legacyHandle) {
    const url = request.nextUrl.clone();
    url.pathname = `/@${legacyHandle[1].toLowerCase()}`;
    return NextResponse.redirect(url);
  }

  if ((pathname === "/account" || pathname.startsWith("/account/") || pathname === "/fitness-id" || pathname === "/fitness-id/")
    && !request.cookies.get(APPWRITE_SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico|sitemap.xml|robots.txt).*)"],
};
