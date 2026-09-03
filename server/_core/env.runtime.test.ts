import { describe, expect, it } from "vitest";
import { getSessionSecret } from "./env";

// This test requires a real database and a running server. It remains enabled
// automatically in CI (where DATABASE_URL is configured) and can be requested
// locally with RUNTIME_READINESS_TEST=1.
const shouldRunRuntimeReadiness = Boolean(
  process.env.DATABASE_URL || process.env.RUNTIME_READINESS_TEST === "1"
);

describe.skipIf(!shouldRunRuntimeReadiness)(
  "production session-secret readiness",
  () => {
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
  }
);
