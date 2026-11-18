import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ getUserPermissions: vi.fn(), getAppUserByEngineerId: vi.fn() }));
vi.mock("./db", async (importOriginal) => ({
  ...await importOriginal<typeof import("./db")>(),
  getUserPermissions: mocks.getUserPermissions,
  getAppUserByEngineerId: mocks.getAppUserByEngineerId,
}));

// Deliberately test-only; never provision this value into an environment.
const testSecret = "pricing-sso-unit-test-secret-not-for-deployment";
function caller(role: string | null = "sales_engineer") {
  return appRouter.createCaller({
    user: null,
    actor: role ? { id: 987654, role, source: "app_user", name: "SSO fixture", engineerId: null } : null,
    req: { headers: {} },
    res: {},
  } as TrpcContext);
}
function grant(dataScope: "own" | "all" = "own", permissions: Record<string, number> = {}) {
  mocks.getUserPermissions.mockResolvedValue([{
    module: "pricing_system", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1,
    dataScope, ...permissions,
  }]);
}
async function verify(role = "sales_engineer") {
  const issued = await caller(role).pricingSystemSso.issueLaunchToken();
  const verified = await jwtVerify(issued.token, new TextEncoder().encode(testSecret), {
    algorithms: ["HS256"], issuer: "sales-team-platform", audience: "professor-kitchens",
  });
  return { ...verified, issued };
}

beforeEach(() => {
  vi.stubEnv("PRICING_SSO_SECRET", testSecret);
  mocks.getAppUserByEngineerId.mockResolvedValue(null);
  grant();
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("Pricing SSO server-side issuance", () => {
  it("rejects a caller without an authenticated actor", async () => {
    await expect(caller(null).pricingSystemSso.issueLaunchToken()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it.each([
    { label: "absent", permissions: [] },
    { label: "explicitly denied", permissions: [{ module: "pricing_system", canView: 0, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" }] },
  ])(
    "rejects $label pricing view grants", async ({ permissions }) => {
      mocks.getUserPermissions.mockResolvedValue(permissions);
      await expect(caller().pricingSystemSso.issueLaunchToken()).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
  it.each(["", "too-short", " "])("fails closed for an unusable signing secret", async (secret) => {
    vi.stubEnv("PRICING_SSO_SECRET", secret);
    await expect(caller().pricingSystemSso.issueLaunchToken()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("issues a verifiable 60-second token with fixed trust claims and a fresh identifier", async () => {
    const { payload, protectedHeader, issued } = await verify();
    expect(protectedHeader).toEqual({ alg: "HS256", typ: "JWT" });
    expect(payload).toMatchObject({
      iss: "sales-team-platform", aud: "professor-kitchens", sub: "987654",
      displayName: "SSO fixture", role: "sales_engineer", engineerId: null, scope: "own",
      permissions: { canView: true, canAdd: true, canEdit: true, canDelete: true },
      catalogPermissions: { canView: true, canAdd: false, canEdit: false, canDelete: false },
    });
    expect(payload.exp! - payload.iat!).toBe(60);
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/i);
    expect(Object.keys(issued).sort()).toEqual(["expiresInSeconds", "token"]);
    expect(issued.expiresInSeconds).toBe(60);
    expect((await verify()).payload.jti).not.toBe(payload.jti);
  });
  it("keeps an all-scope sales engineer from receiving catalog-write claims", async () => {
    grant("all");
    expect((await verify()).payload.catalogPermissions).toEqual({ canView: true, canAdd: false, canEdit: false, canDelete: false });
  });
  it("preserves individual CRUD denials for Admin Sales", async () => {
    grant("all", { canAdd: 0, canEdit: 1, canDelete: 0 });
    const { payload } = await verify("admin_sales");
    expect(payload.permissions).toEqual({ canView: true, canAdd: false, canEdit: true, canDelete: false });
    expect(payload.catalogPermissions).toEqual(payload.permissions);
  });
  it("does not grant shared-catalog writes to own-scope Admin Sales", async () => {
    expect((await verify("admin_sales")).payload.catalogPermissions).toEqual({ canView: true, canAdd: false, canEdit: false, canDelete: false });
  });
  it.each(["admin", "manager"])("retains the upstream organization-wide policy for %s", async (role) => {
    mocks.getUserPermissions.mockResolvedValue([]);
    const { payload } = await verify(role);
    expect(payload.scope).toBe("all");
    expect(payload.catalogPermissions).toEqual({ canView: true, canAdd: true, canEdit: true, canDelete: true });
  });
});
