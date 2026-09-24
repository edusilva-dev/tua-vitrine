import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getSafeCallbackUrl(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export function proxy(request: NextRequest) {
  if (process.env.AUTH_MODE !== "session") return NextResponse.next();

  if (getSessionCookie(request)) return NextResponse.next();

  const signInUrl = new URL("/entrar", request.url);

  signInUrl.searchParams.set("callbackURL", getSafeCallbackUrl(request));

  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: "/admin/:path*",
};
