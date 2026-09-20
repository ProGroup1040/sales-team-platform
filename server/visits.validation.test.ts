import { describe, expect, it } from "vitest";
import { visitScheduledAtSchema } from "./routers";

describe("visits scheduledAt input", () => {
  it("accepts a Date produced by the superjson transformer", () => {
    const value = new Date("2026-09-10T10:30:00.000Z");
    expect(visitScheduledAtSchema.parse(value)).toEqual(value);
  });

  it("accepts a valid ISO string when a proxy sends the serialized value", () => {
    const parsed = visitScheduledAtSchema.parse("2026-09-10T10:30:00.000Z");
    expect(parsed).toEqual(new Date("2026-09-10T10:30:00.000Z"));
  });

  it("rejects null and invalid date values instead of converting them", () => {
    expect(() => visitScheduledAtSchema.parse(null)).toThrow();
    expect(() => visitScheduledAtSchema.parse("not-a-date")).toThrow();
  });
});
