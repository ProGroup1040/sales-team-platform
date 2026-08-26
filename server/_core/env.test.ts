import { describe, expect, it } from "vitest";
import { getSessionSecret } from "./env";

describe("session secret environment resolution", () => {
  it("uses the application-owned secret when it is configured", () => {
    expect(getSessionSecret({ JWT_SECRET: "legacy", APP_JWT_SECRET: "a".repeat(48) })).toHaveLength(48);
  });

  it("falls back to JWT_SECRET for existing environments", () => {
    expect(getSessionSecret({ JWT_SECRET: "b".repeat(48) })).toHaveLength(48);
  });
});
