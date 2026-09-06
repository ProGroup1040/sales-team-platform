import { describe, expect, it } from "vitest";
import { addMoney, fromCents, percentOfMoney, subtractMoney, sumCents, toCents } from "../shared/money";

describe("money policy", () => {
  it("converts DECIMAL(14,2) strings to exact cents", () => {
    expect(toCents("100.00")).toBe(10_000);
    expect(toCents("100.50")).toBe(10_050);
    expect(toCents("100.01")).toBe(10_001);
    expect(toCents("0.10")).toBe(10);
    expect(toCents("99999999.99")).toBe(9_999_999_999);
    expect(fromCents(10_001)).toBe("100.01");
  });

  it("rejects malformed or over-precise decimal input", () => {
    expect(() => toCents("10.005")).toThrow("Invalid monetary value");
    expect(() => toCents("not-money")).toThrow("Invalid monetary value");
  });

  it("adds decimal values without binary floating-point drift", () => {
    expect(addMoney("0.10", "0.20", "0.30")).toBe("0.60");
    expect(sumCents(["100.00", "100.01", "0.10"])).toBe(20_011);
  });

  it("subtracts monetary values in cents", () => {
    expect(subtractMoney("100.00", "25.50")).toBe("74.50");
    expect(() => subtractMoney("25.00", "25.01")).toThrow();
  });

  it("calculates percentage amounts in cents", () => {
    expect(percentOfMoney("99.99", 50)).toBe("50.00");
    expect(percentOfMoney("100.01", 10)).toBe("10.00");
  });
});
