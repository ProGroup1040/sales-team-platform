import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getAppUserByEngineerId: vi.fn(),
  getUserPermissions: vi.fn(),
}));

import { getUserPermissions } from "./db";
import { protectedProcedure, router } from "./_core/trpc";
import type { RequestActor } from "./_core/context";

const mockedGetUserPermissions = vi.mocked(getUserPermissions);
const previousLegacyBypass = process.env.AUTHZ_ALLOW_LEGACY_TEST_BYPASS;

const permissionRows = (overrides: Partial<{
  canView: number;
  canAdd: number;
  canEdit: number;
  canDelete: number;
  dataScope: string;
}> = {}) => [{
  module: "tasks",
  canView: 0,
  canAdd: 0,
  canEdit: 0,
  canDelete: 0,
  dataScope: "own",
  ...overrides,
}];

const testRouter = router({
  tasks: router({
    list: protectedProcedure.query(() => ({ ok: true })),
    updateStatus: protectedProcedure.mutation(() => ({ ok: true })),
    delete: protectedProcedure.mutation(() => ({ ok: true })),
  }),
  closing: router({
    autoCreateFromTask: protectedProcedure.mutation(() => ({ ok: true })),
  }),
});

function createCaller() {
  return testRouter.createCaller({
    req: {} as never,
    res: {} as never,
    user: null,
    actor: {
      id: 701,
      source: "app_user",
      role: "sales_engineer",
      name: "Authorization test actor",
      engineerId: 1701,
    },
  });
}

describe("operational authorization middleware", () => {
  beforeEach(() => {
    delete process.env.AUTHZ_ALLOW_LEGACY_TEST_BYPASS;
    mockedGetUserPermissions.mockReset();
    mockedGetUserPermissions.mockResolvedValue([] as Awaited<ReturnType<typeof getUserPermissions>>);
  });

  it("denies an authenticated actor when no user-permission row exists", async () => {
    await expect(createCaller().tasks.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows reads only with canView", async () => {
    mockedGetUserPermissions.mockResolvedValue(permissionRows({ canView: 1 }) as Awaited<ReturnType<typeof getUserPermissions>>);
    await expect(createCaller().tasks.list()).resolves.toEqual({ ok: true });
  });

  it("denies a view-only actor from performing a mutation", async () => {
    mockedGetUserPermissions.mockResolvedValue(permissionRows({ canView: 1 }) as Awaited<ReturnType<typeof getUserPermissions>>);
    await expect(createCaller().tasks.updateStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies edit-only actors from deleting records", async () => {
    mockedGetUserPermissions.mockResolvedValue(permissionRows({ canEdit: 1 }) as Awaited<ReturnType<typeof getUserPermissions>>);
    await expect(createCaller().tasks.delete()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires every declared grant for an upsert/synchronization mutation", async () => {
    mockedGetUserPermissions.mockResolvedValue([{
      module: "closing",
      canView: 1,
      canAdd: 1,
      canEdit: 0,
      canDelete: 0,
      dataScope: "own",
    }] as Awaited<ReturnType<typeof getUserPermissions>>);
    await expect(createCaller().closing.autoCreateFromTask()).rejects.toMatchObject({ code: "FORBIDDEN" });

    mockedGetUserPermissions.mockResolvedValue([{
      module: "closing",
      canView: 1,
      canAdd: 1,
      canEdit: 1,
      canDelete: 0,
      dataScope: "own",
    }] as Awaited<ReturnType<typeof getUserPermissions>>);
    await expect(createCaller().closing.autoCreateFromTask()).resolves.toEqual({ ok: true });
  });
  afterAll(() => {
    if (previousLegacyBypass === undefined) delete process.env.AUTHZ_ALLOW_LEGACY_TEST_BYPASS;
    else process.env.AUTHZ_ALLOW_LEGACY_TEST_BYPASS = previousLegacyBypass;
  });

});
