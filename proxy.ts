import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { rateLimit, getCspHeaders } from "@/app/lib/security";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/seed"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limit API routes ---
  if (pathname.startsWith("/api")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const result = rateLimit(`global:${ip}`, 100, 60_000);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((result.resetMs - Date.now()) / 1000)
            ),
          },
        }
      );
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("lnm-session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

function applySecurityHeaders(response: NextResponse) {
  const headers = getCspHeaders();
  for (const [header, value] of Object.entries(headers)) {
    response.headers.set(header, value);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
