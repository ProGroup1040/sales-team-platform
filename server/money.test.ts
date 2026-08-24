import { describe, expect, it } from "vitest";
import { addMoney, fromCents, percentOfMoney, subtractMoney, toCents } from "../shared/money";

describe("money policy", () => {
  it("rounds input to integer cents", () => {
    expect(toCents("10.005")).toBe(1001);
    expect(fromCents(1001)).toBe("10.01");
  });

  it("adds decimal values without binary floating-point drift", () => {
    expect(addMoney("0.10", "0.20", "0.30")).toBe("0.60");
  });

  it("does not allow a discount above gross value", () => {
    expect(subtractMoney("100.00", "25.50")).toBe("74.50");
    expect(() => subtractMoney("25.00", "25.01")).toThrow();
  });

  it("calculates percentage amounts in cents", () => {
    expect(percentOfMoney("99.99", 50)).toBe("50.00");
  });
});
