/**
 * Security utilities for the LNM Dashboard.
 *
 * - In-memory rate limiter with TTL cleanup
 * - Environment variable validation
 * - Input sanitization (basic XSS protection)
 * - Content-Security-Policy header helper
 */

/* ------------------------------------------------------------------ */
/*  Rate Limiter                                                       */
/* ------------------------------------------------------------------ */

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries (every 60 s)
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000).unref?.(); // .unref keeps the timer from blocking Node shutdown
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check & increment rate limit for `key`.
 *
 * @param key         Unique key (e.g. IP + route)
 * @param maxRequests Max requests allowed within the window
 * @param windowMs    Window size in milliseconds
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  scheduleCleanup();

  const now = Date.now();
  const existing = rateLimitStore.get(key);

  // Window expired or first request
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetMs: now + windowMs };
  }

  // Within window
  existing.count += 1;

  if (existing.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: existing.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetMs: existing.resetAt,
  };
}

/* ------------------------------------------------------------------ */
/*  Environment Validation                                             */
/* ------------------------------------------------------------------ */

const REQUIRED_ENV_VARS = ["DATABASE_URL", "OPENAI_API_KEY", "JWT_SECRET"] as const;

/**
 * Validate that every required environment variable is set.
 * Call once at application startup.
 *
 * Throws a descriptive Error listing all missing vars.
 */
export function validateEnv(): void {
  const missing: string[] = [];
  for (const name of REQUIRED_ENV_VARS) {
    if (!process.env[name] || process.env[name]!.trim() === "") {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[security] Missing required environment variables: ${missing.join(", ")}. ` +
        `Set them in your .env file or deployment config.`
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Input Sanitization                                                 */
/* ------------------------------------------------------------------ */

/**
 * Strip basic XSS vectors from user-supplied input.
 *
 * 1. Remove <script>...</script> blocks entirely
 * 2. Remove event-handler attributes (onerror, onclick, etc.)
 * 3. Encode key HTML entities (< > " ' &)
 */
export function sanitizeInput(input: string): string {
  let clean = input;

  // Remove <script> tags and contents (case-insensitive, multiline)
  clean = clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  // Remove event handler attributes
  clean = clean.replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Encode dangerous HTML characters
  clean = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return clean;
}

/* ------------------------------------------------------------------ */
/*  CSP Headers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Return a strict Content-Security-Policy headers object.
 *
 * The policy allows:
 * - Scripts / styles from self only (+ unsafe-inline for Next.js hydration)
 * - Images from self and data: URIs
 * - Connections to self and OpenAI API
 * - No object / embed / base overrides
 */
export function getCspHeaders(): Record<string, string> {
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.openai.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  return {
    "Content-Security-Policy": policy,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
