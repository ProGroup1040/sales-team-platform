import { describe, expect, it } from "vitest";
import {
  evaluateLoginRateLimit,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "./loginRateLimit";

describe("login rate-limit policy", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");

  it("allows a new attempt and expired windows", () => {
    expect(evaluateLoginRateLimit(null, now)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(evaluateLoginRateLimit({
      attempts: 5,
      windowStartedAt: new Date(now.getTime() - LOGIN_RATE_LIMIT_WINDOW_MS),
      blockedUntil: null,
    }, now)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("denies attempts until an active block expires", () => {
    const result = evaluateLoginRateLimit({
      attempts: 5,
      windowStartedAt: now,
      blockedUntil: new Date(now.getTime() + 31_000),
    }, now);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(31);
  });
});
