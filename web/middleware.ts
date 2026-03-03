import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const bearerPattern = /^Bearer\s+.+$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/assessments") || pathname.startsWith("/api/auth/sync-user")) {
    const authorizationHeader = request.headers.get("authorization") ?? "";
    if (!bearerPattern.test(authorizationHeader)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
