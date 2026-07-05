/**
 * Security & Rate-Limiting Middleware
 * Provides simple in-memory rate limiting and request sanitization.
 * In production, replace with express-rate-limit + Redis backend.
 */

const hits = new Map(); // ip -> { count, resetAt }

/**
 * createRateLimiter(options)
 * @param {number} options.windowMs  - Time window in ms (default 15 min)
 * @param {number} options.max       - Max requests per window (default 100)
 * @param {string} options.message   - Error message when limit hit
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests" } = {}) {
  return (req, res, next) => {
    const ip  = req.ip || req.connection.remoteAddress || "unknown";
    const key = `${ip}:${req.path.split("/")[2] || "global"}`;
    const now = Date.now();

    if (!hits.has(key) || hits.get(key).resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const entry = hits.get(key);
    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: message,
        retryAfter,
      });
    }

    next();
  };
}

// Specific limiters
const authLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: "Too many login attempts. Please wait 10 minutes.",
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: "Rate limit exceeded. Max 120 requests/minute.",
});

const mlLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "ML API rate limit exceeded. Max 30 predictions/minute.",
});

/**
 * Basic request sanitizer — strips dangerous characters from body strings
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") {
    const clean = (obj) => {
      if (typeof obj === "string") {
        // Strip basic script injection attempts
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .trim();
      }
      if (Array.isArray(obj)) return obj.map(clean);
      if (obj && typeof obj === "object") {
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, clean(v)])
        );
      }
      return obj;
    };
    req.body = clean(req.body);
  }
  next();
}

/**
 * Request logger for development
 */
function requestLogger(req, res, next) {
  if (process.env.NODE_ENV !== "production") {
    const start = Date.now();
    res.on("finish", () => {
      const ms    = Date.now() - start;
      const color = res.statusCode >= 400 ? "\x1b[31m" : "\x1b[32m";
      const reset = "\x1b[0m";
      console.log(
        `${color}${res.statusCode}${reset} ${req.method} ${req.originalUrl} — ${ms}ms`
      );
    });
  }
  next();
}

module.exports = { createRateLimiter, authLimiter, apiLimiter, mlLimiter, sanitizeBody, requestLogger };
