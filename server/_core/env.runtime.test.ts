import { describe, expect, it } from "vitest";
import { getSessionSecret } from "./env";

describe("production session-secret readiness", () => {
  it("has a deployment session secret, database configuration, and healthy endpoints", async () => {
    expect(getSessionSecret()).toHaveLength(96);
    expect(Boolean(process.env.DATABASE_URL)).toBe(true);
    const [health, readiness] = await Promise.all([
      fetch("http://localhost:3000/healthz"),
      fetch("http://localhost:3000/readyz"),
    ]);
    expect(health.ok).toBe(true);
    expect(readiness.ok).toBe(true);
  });
});
