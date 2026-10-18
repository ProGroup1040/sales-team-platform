import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertTaskEngineerMatch, getEngineersForScope, scopedEngineerId } from "./dataScope";

describe("scopedEngineerId", () => {
  it("forces own-scope users to their linked engineer regardless of caller input", () => {
    expect(scopedEngineerId({ caller: { id: 17, role: "sales_engineer", name: "Own", engineerId: 17 }, scope: "own" }, 99)).toBe(17);
    expect(scopedEngineerId({ caller: { id: 17, role: "sales_engineer", name: "Own", engineerId: 17 }, scope: "own" })).toBe(17);
  });

  it("preserves a requested engineer filter for all-scope users", () => {
    expect(scopedEngineerId({ caller: { id: 17, role: "sales_engineer", name: "Own", engineerId: 17 }, scope: "all" }, 99)).toBe(99);
    expect(scopedEngineerId({ caller: { id: 17, role: "sales_engineer", name: "Own", engineerId: 17 }, scope: "all" })).toBeUndefined();
  });

  it("denies own-scope users who have no linked engineer", () => {
    try {
      scopedEngineerId({ caller: { id: 0, role: "manager", name: "No link", engineerId: null }, scope: "own" });
      throw new Error("Expected scope enforcement to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

describe("task-linked review ownership", () => {
  it("accepts the engineer actually assigned to the task", () => {
    expect(() => assertTaskEngineerMatch(17, 17)).not.toThrow();
  });

  it("rejects attributing a task review to another engineer", () => {
    let thrown: unknown;
    try {
      assertTaskEngineerMatch(17, 18);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({ code: "BAD_REQUEST" });
  });
});


describe("getEngineersForScope", () => {
  const ownAccess = {
    caller: { id: 17, role: "sales_engineer", name: "Own", engineerId: 17 },
    scope: "own" as const,
  };
  const allAccess = {
    caller: { id: 99, role: "manager", name: "Manager", engineerId: null },
    scope: "all" as const,
  };

  it("returns only the authenticated engineer for own scope", async () => {
    const getAll = async () => [{ id: 17 }, { id: 18 }];
    const getById = async (id: number) => id === 17 ? { id: 17 } : null;
    await expect(getEngineersForScope(ownAccess, getAll, getById)).resolves.toEqual([{ id: 17 }]);
  });

  it("does not call the all-engineers query for own scope", async () => {
    const getAll = vi.fn(async () => [{ id: 17 }, { id: 18 }]);
    const getById = vi.fn(async (id: number) => ({ id }));
    await expect(getEngineersForScope(ownAccess, getAll, getById)).resolves.toEqual([{ id: 17 }]);
    expect(getAll).not.toHaveBeenCalled();
    expect(getById).toHaveBeenCalledWith(17);
  });

  it("returns all engineers only for all scope", async () => {
    const getAll = vi.fn(async () => [{ id: 17 }, { id: 18 }]);
    const getById = vi.fn(async (id: number) => ({ id }));
    await expect(getEngineersForScope(allAccess, getAll, getById)).resolves.toEqual([{ id: 17 }, { id: 18 }]);
    expect(getAll).toHaveBeenCalledOnce();
    expect(getById).not.toHaveBeenCalled();
  });

  it("denies own scope when the caller has no linked engineer", async () => {
    const unlinkedAccess = {
      caller: { id: 99, role: "manager", name: "Unlinked", engineerId: null },
      scope: "own" as const,
    };
    await expect(getEngineersForScope(unlinkedAccess, async () => [], async () => null))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
