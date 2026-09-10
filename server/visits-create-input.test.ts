import { describe, expect, it } from "vitest";
import { visitCreateInputSchema } from "./routers";

describe("visits.create scheduledAt input", () => {
  const baseInput = {
    engineerId: 7,
    clientName: "عميل اختبار",
  };

  it("keeps a Date received through superjson", () => {
    const scheduledAt = new Date("2026-09-10T10:28:02.000Z");
    const parsed = visitCreateInputSchema.parse({ ...baseInput, scheduledAt });

    expect(parsed.scheduledAt).toBeInstanceOf(Date);
    expect(parsed.scheduledAt.getTime()).toBe(scheduledAt.getTime());
  });

  it("normalizes an ISO string when the transformer is unavailable", () => {
    const parsed = visitCreateInputSchema.parse({
      ...baseInput,
      scheduledAt: "2026-09-10T13:28:02+03:00",
    });

    expect(parsed.scheduledAt).toBeInstanceOf(Date);
    expect(parsed.scheduledAt.toISOString()).toBe("2026-09-10T10:28:02.000Z");
  });

  it.each([null, undefined, "", "not-a-date"]) (
    "rejects an empty or invalid scheduledAt value: %s",
    (scheduledAt) => {
      expect(() => visitCreateInputSchema.parse({ ...baseInput, scheduledAt })).toThrow();
    },
  );
});
