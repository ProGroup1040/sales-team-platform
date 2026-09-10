import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getEngineerById: vi.fn(),
    bulkCreateEngineersAccounts: vi.fn(),
    resetEngineerPassword: vi.fn(),
    toggleEngineerAccountStatus: vi.fn(),
    createEngineerAccount: vi.fn(),
    manualOverrideEngineerTarget: vi.fn(),
    logActivity: vi.fn(),
  };
});

import {
  bulkCreateEngineersAccounts,
  createEngineerAccount,
  getEngineerById,
  logActivity,
  manualOverrideEngineerTarget,
  resetEngineerPassword,
  toggleEngineerAccountStatus,
} from "./db";
import { appRouter } from "./routers";

const mockedDb = {
  getEngineerById: vi.mocked(getEngineerById),
  bulkCreateEngineersAccounts: vi.mocked(bulkCreateEngineersAccounts),
  resetEngineerPassword: vi.mocked(resetEngineerPassword),
  toggleEngineerAccountStatus: vi.mocked(toggleEngineerAccountStatus),
  createEngineerAccount: vi.mocked(createEngineerAccount),
  logActivity: vi.mocked(logActivity),
  manualOverrideEngineerTarget: vi.mocked(manualOverrideEngineerTarget),
};

function callerFor(role: string) {
  const ctx = {
    user: null,
    actor: { id: 22, source: "local", role, name: "Test Actor", engineerId: 22 },
    req: { headers: {} },
    res: {},
  } as unknown as TrpcContext;
  return appRouter.createCaller(ctx);
}

describe("appUsers privileged account procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDb.logActivity.mockResolvedValue(undefined as never);
  });

  it("requires an explicit strong password for bulk account creation", async () => {
    const caller = callerFor("manager");

    await expect(caller.appUsers.bulkCreateAccounts({} as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.appUsers.bulkCreateAccounts({ defaultPassword: "12345678" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockedDb.bulkCreateEngineersAccounts).not.toHaveBeenCalled();
  });

  it("rejects short passwords when creating or resetting an app user", async () => {
    const caller = callerFor("manager");
    await expect(caller.appUsers.create({
      name: "مستخدم اختبار",
      username: "short.password",
      password: "short",
      role: "sales_engineer",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.appUsers.update({ userId: 1, password: "short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks Admin Sales from managing a Manager or Admin engineer account", async () => {
    mockedDb.getEngineerById.mockResolvedValue({ id: 501, role: "manager", isDeleted: 0 } as never);
    const caller = callerFor("admin_sales");

    await expect(caller.appUsers.resetPassword({ engineerId: 501, newPassword: "safe-password-123" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.appUsers.toggleStatus({ engineerId: 501, status: "inactive" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.appUsers.createEngineerAccount({ engineerId: 501, username: "manager.target", password: "safe-password-123" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    mockedDb.getEngineerById.mockResolvedValue({ id: 502, role: "admin", isDeleted: 0 } as never);
    await expect(caller.appUsers.resetPassword({ engineerId: 502, newPassword: "safe-password-123" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockedDb.resetEngineerPassword).not.toHaveBeenCalled();
    expect(mockedDb.toggleEngineerAccountStatus).not.toHaveBeenCalled();
    expect(mockedDb.createEngineerAccount).not.toHaveBeenCalled();
  });

  it("preserves authorized management of a standard engineer account", async () => {
    mockedDb.getEngineerById.mockResolvedValue({ id: 503, role: "sales_engineer", isDeleted: 0 } as never);
    mockedDb.resetEngineerPassword.mockResolvedValue({ success: true });
    mockedDb.toggleEngineerAccountStatus.mockResolvedValue({ success: true });
    mockedDb.createEngineerAccount.mockResolvedValue({ success: true });
    const caller = callerFor("admin_sales");

    await expect(caller.appUsers.resetPassword({ engineerId: 503, newPassword: "safe-password-123" })).resolves.toEqual({ success: true });
    await expect(caller.appUsers.toggleStatus({ engineerId: 503, status: "inactive" })).resolves.toEqual({ success: true });
    await expect(caller.appUsers.createEngineerAccount({ engineerId: 503, username: "standard.engineer", password: "safe-password-123" })).resolves.toEqual({ success: true });

    expect(mockedDb.resetEngineerPassword).toHaveBeenCalledWith(503, "safe-password-123");
    expect(mockedDb.toggleEngineerAccountStatus).toHaveBeenCalledWith(503, "inactive");
    expect(mockedDb.createEngineerAccount).toHaveBeenCalledWith(503, "standard.engineer", "safe-password-123", true);
  });

  it("allows a privileged manager to manage a standard engineer account", async () => {
    mockedDb.getEngineerById.mockResolvedValue({ id: 504, role: "sales_engineer", isDeleted: 0 } as never);
    mockedDb.resetEngineerPassword.mockResolvedValue({ success: true });
    mockedDb.toggleEngineerAccountStatus.mockResolvedValue({ success: true });
    mockedDb.createEngineerAccount.mockResolvedValue({ success: true });
    const caller = callerFor("manager");

    await expect(caller.appUsers.resetPassword({ engineerId: 504, newPassword: "safe-password-123" })).resolves.toEqual({ success: true });
    await expect(caller.appUsers.toggleStatus({ engineerId: 504, status: "active" })).resolves.toEqual({ success: true });
    await expect(caller.appUsers.createEngineerAccount({ engineerId: 504, username: "manager.engineer", password: "safe-password-123" })).resolves.toEqual({ success: true });

    expect(mockedDb.resetEngineerPassword).toHaveBeenCalledWith(504, "safe-password-123");
    expect(mockedDb.toggleEngineerAccountStatus).toHaveBeenCalledWith(504, "active");
    expect(mockedDb.createEngineerAccount).toHaveBeenCalledWith(504, "manager.engineer", "safe-password-123", true);
  });

  it("allows an Admin to manage a standard engineer account", async () => {
    mockedDb.getEngineerById.mockResolvedValue({ id: 505, role: "sales_engineer", isDeleted: 0 } as never);
    mockedDb.resetEngineerPassword.mockResolvedValue({ success: true });
    mockedDb.toggleEngineerAccountStatus.mockResolvedValue({ success: true });
    mockedDb.createEngineerAccount.mockResolvedValue({ success: true });
    const caller = callerFor("admin");

    await expect(caller.appUsers.resetPassword({ engineerId: 505, newPassword: "safe-password-123" })).resolves.toEqual({ success: true });
    await expect(caller.appUsers.toggleStatus({ engineerId: 505, status: "inactive" })).resolves.toEqual({ success: true });
    await expect(caller.appUsers.createEngineerAccount({ engineerId: 505, username: "admin.engineer", password: "safe-password-123" })).resolves.toEqual({ success: true });

    expect(mockedDb.resetEngineerPassword).toHaveBeenCalledWith(505, "safe-password-123");
    expect(mockedDb.toggleEngineerAccountStatus).toHaveBeenCalledWith(505, "inactive");
    expect(mockedDb.createEngineerAccount).toHaveBeenCalledWith(505, "admin.engineer", "safe-password-123", true);
  });

  it("allows only privileged managers to run bulk account creation", async () => {
    mockedDb.bulkCreateEngineersAccounts.mockResolvedValue({ created: [], skipped: [] });

    await expect(callerFor("admin_sales").appUsers.bulkCreateAccounts({ defaultPassword: "safe-password-123" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerFor("manager").appUsers.bulkCreateAccounts({ defaultPassword: "safe-password-123" })).resolves.toEqual({ created: [], skipped: [] });
    expect(mockedDb.bulkCreateEngineersAccounts).toHaveBeenCalledWith("safe-password-123");
  });

  it("limits manual engineer-target overrides to management roles", async () => {
    mockedDb.manualOverrideEngineerTarget.mockResolvedValue(undefined);
    const input = { engineerId: 42, year: 2026, month: 9, targetAmount: 500_000 };

    await expect(callerFor("sales_engineer").planning.manualOverride(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerFor("admin_sales").planning.manualOverride(input)).resolves.toEqual({ success: true });
    await expect(callerFor("manager").planning.manualOverride(input)).resolves.toEqual({ success: true });
    await expect(callerFor("admin").planning.manualOverride(input)).resolves.toEqual({ success: true });
    expect(mockedDb.manualOverrideEngineerTarget).toHaveBeenCalledTimes(3);
    expect(mockedDb.manualOverrideEngineerTarget).toHaveBeenCalledWith(input);
  });
});
