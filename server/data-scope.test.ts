import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { scopedEngineerId } from "./dataScope";

describe("scopedEngineerId", () => {
  it("forces own-scope users to their linked engineer regardless of caller input", () => {
    expect(scopedEngineerId({ caller: { engineerId: 17 }, scope: "own" }, 99)).toBe(17);
    expect(scopedEngineerId({ caller: { engineerId: 17 }, scope: "own" })).toBe(17);
  });

  it("preserves a requested engineer filter for all-scope users", () => {
    expect(scopedEngineerId({ caller: { engineerId: 17 }, scope: "all" }, 99)).toBe(99);
    expect(scopedEngineerId({ caller: { engineerId: 17 }, scope: "all" })).toBeUndefined();
  });

  it("denies own-scope users who have no linked engineer", () => {
    try {
      scopedEngineerId({ caller: { engineerId: null }, scope: "own" });
      throw new Error("Expected scope enforcement to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});
