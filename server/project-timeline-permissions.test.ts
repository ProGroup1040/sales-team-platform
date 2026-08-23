import { describe, expect, it } from "vitest";
import { canEditProjectTimeline, canManageProjectTimeline } from "./routers";

describe("Project Timeline edit permissions", () => {
  it("allows only Admin and Admin Sales role variants to edit", () => {
    expect(canEditProjectTimeline("admin")).toBe(true);
    expect(canEditProjectTimeline("manager")).toBe(true);
    expect(canEditProjectTimeline("admin_sales")).toBe(true);
  });

  it("gives Admin Sales the same full Timeline management scope as Admin", () => {
    ["admin", "manager", "admin_sales"].forEach((role) => {
      expect(canManageProjectTimeline(role)).toBe(true);
      expect(canEditProjectTimeline(role)).toBe(true);
    });
  });

  it("keeps operational and team roles view-only", () => {
    ["sales_engineer", "sales_specialist", "technical_office", "production", "procurement", "installation", "qc", "system_user", "user", null, undefined]
      .forEach((role) => expect(canEditProjectTimeline(role)).toBe(false));
    ["sales_engineer", "technical_office", "production", "system_user", null, undefined]
      .forEach((role) => expect(canManageProjectTimeline(role)).toBe(false));
  });
});
