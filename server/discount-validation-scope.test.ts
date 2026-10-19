import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAppUserByEngineerId: vi.fn().mockResolvedValue({ id: 77, engineerId: 1701 }),
    getUserPermissions: vi.fn(),
    validateDealDiscount: vi.fn(),
  };
});

import { getUserPermissions, validateDealDiscount } from "./db";
import { appRouter } from "./routers";

const mockedGetUserPermissions = vi.mocked(getUserPermissions);
const mockedValidateDealDiscount = vi.mocked(validateDealDiscount);

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: 77,
      source: "app_user",
      role: "sales_engineer",
      name: "Discount scope test",
      engineerId: 1701,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("discount validation data scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateDealDiscount.mockResolvedValue({ valid: true, remaining: 123 } as never);
  });

  it("passes the authenticated engineer ID for own-scope validation without a deal ID", async () => {
    mockedGetUserPermissions.mockResolvedValue([{
      module: "closing",
      canView: 1,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "own",
    }] as never);

    await expect(caller().closing.validateDiscount({ discountValue: 10 }))
      .resolves.toEqual({ valid: true, remaining: 123 });
    expect(mockedValidateDealDiscount).toHaveBeenCalledWith(undefined, 10, 1701);
  });

  it("preserves team-wide validation only for explicit all-scope grants", async () => {
    mockedGetUserPermissions.mockResolvedValue([{
      module: "closing",
      canView: 1,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "all",
    }] as never);

    await caller().closing.validateDiscount({ discountValue: 10 });
    expect(mockedValidateDealDiscount).toHaveBeenCalledWith(undefined, 10, undefined);
  });
});
