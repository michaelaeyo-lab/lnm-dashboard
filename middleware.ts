import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, getCspHeaders } from "@/app/lib/security";

/**
 * Next.js Edge Middleware
 *
 * - Applies CSP + security headers to every response
 * - Rate-limits /api/* routes (100 req/min per IP)
 *
 * NOTE: Existing JWT auth logic lives in getSession() calls inside
 * each API route -- this middleware does NOT duplicate or replace that.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limit API routes ---
  if (pathname.startsWith("/api")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const key = `global:${ip}`;
    const result = rateLimit(key, 100, 60_000); // 100 req / 60 s

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

  // --- Attach security headers to every response ---
  const response = NextResponse.next();

  const cspHeaders = getCspHeaders();
  for (const [header, value] of Object.entries(cspHeaders)) {
    response.headers.set(header, value);
  }

  return response;
}

export const config = {
  // Run on all routes except static assets and Next internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
