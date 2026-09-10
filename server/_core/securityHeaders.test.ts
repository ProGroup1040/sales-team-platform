import { describe, expect, it } from "vitest";
import { getSecurityHeaders } from "./securityHeaders";

describe("security headers", () => {
  it("sets clickjacking, MIME, referrer, and browser-permission protections", () => {
    expect(getSecurityHeaders(false)).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    });
  });

  it("enables HSTS only for production", () => {
    expect(getSecurityHeaders(false)["Strict-Transport-Security"]).toBeUndefined();
    expect(getSecurityHeaders(true)["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
  });
});
