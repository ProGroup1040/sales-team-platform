import { describe, expect, it } from "vitest";
import { mapEngineerRoleToAppUserRole } from "./db";

describe("legacy engineer to app-user role mapping", () => {
  it("preserves the admin role", () => {
    expect(mapEngineerRoleToAppUserRole("admin")).toBe("admin");
  });

  it("preserves supported managed roles", () => {
    expect(mapEngineerRoleToAppUserRole("manager")).toBe("manager");
    expect(mapEngineerRoleToAppUserRole("admin_sales")).toBe("admin_sales");
    expect(mapEngineerRoleToAppUserRole("sales_specialist")).toBe("sales_specialist");
  });

  it("fails closed to the engineer role for unknown legacy roles", () => {
    expect(mapEngineerRoleToAppUserRole("site_engineer")).toBe("sales_engineer");
  });
});
