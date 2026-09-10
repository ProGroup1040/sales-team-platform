import type { RequestHandler } from "express";

export function getSecurityHeaders(isProduction: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  };

  // A CSP is intentionally not added here until the dashboard's third-party
  // resources are inventoried; an untested policy would be a reliability risk.
  if (isProduction) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  return headers;
}

export function securityHeaders(isProduction: boolean): RequestHandler {
  const headers = getSecurityHeaders(isProduction);
  return (_req, res, next) => {
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    next();
  };
}
