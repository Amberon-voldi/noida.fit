import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const decodedPath = decodeURIComponent(pathname);

  // Handle /@username or /%40username rewrite to /fitness-id/[slug]
  if (decodedPath.startsWith("/@")) {
    const slug = decodedPath.slice(2).trim();
    if (slug) {
      const url = req.nextUrl.clone();
      url.pathname = `/fitness-id/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  // Redirect /fitness-id/[slug] to /@slug for modern canonical user URLs
  if (pathname.startsWith("/fitness-id/") && pathname.length > "/fitness-id/".length) {
    const slug = pathname.slice("/fitness-id/".length);
    const redirectUrl = new URL(`/@${slug}`, req.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  // Protected routes: /account and /fitness-id (User's private dashboard)
  if ((pathname === "/account" || pathname === "/fitness-id") && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|images|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

