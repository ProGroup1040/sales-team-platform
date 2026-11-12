import { describe, expect, it } from "vitest";
import { getPricingSsoSecret, getSessionSecret } from "./env";

describe("session secret environment resolution", () => {
  it("uses the application-owned secret when it is configured", () => {
    expect(getSessionSecret({ JWT_SECRET: "legacy", APP_JWT_SECRET: "a".repeat(48) })).toHaveLength(48);
  });

  it("falls back to JWT_SECRET for existing environments", () => {
    expect(getSessionSecret({ JWT_SECRET: "b".repeat(48) })).toHaveLength(48);
  });
});

describe("getPricingSsoSecret", () => {
  it("returns the trimmed shared SSO secret", () => {
    expect(getPricingSsoSecret({
      PRICING_SSO_SECRET: "  test-only-secret-value-with-at-least-32-characters  ",
    })).toBe("test-only-secret-value-with-at-least-32-characters");
  });

  it("returns an empty string when the SSO secret is missing", () => {
    expect(getPricingSsoSecret({})).toBe("");
  });
});
