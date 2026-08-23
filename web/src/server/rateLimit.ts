interface Options {
  windowMs: number;
  max: number;
}

/** Einfacher In-Memory-Rate-Limiter pro IP, ohne Extra-Dependency. Wichtiger als frueher: da die
 * Website nichts mehr cached, loest jeder einzelne Request einen echten Live-Abruf bei Stundenplan24
 * aus - ohne Limit koennte ein fehlerhafter/boesartiger Client Stundenplan24 selbst ueberlasten. */
export function createRateLimiter({ windowMs, max }: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= max) return false;

    entry.count += 1;
    return true;
  };
}

export const checkRateLimit = createRateLimiter({ windowMs: 60_000, max: 60 });

/** Bestes verfuegbares Client-Identifier fuer einen Next.js Route-Handler-Request (kein `req.ip`
 * wie in Express - hinter einem Reverse-Proxy sollte X-Forwarded-For gesetzt sein). */
export function clientKeyFor(request: Request): string {
  return request.headers.get("x-forwarded-for") ?? "unknown";
}
