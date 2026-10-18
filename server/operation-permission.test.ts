import { describe, expect, it } from "vitest";
import { operationPermission } from "./_core/trpc";

describe("operationPermission", () => {
  it("requires delete permission for every soft-delete route", () => {
    for (const entity of ["engineer", "task", "lead", "visit", "deal"]) {
      expect(operationPermission(`softDelete.${entity}`, "mutation")).toBe("canDelete");
    }
  });

  it("requires edit permission for recording link updates", () => {
    expect(operationPermission("playbook.updateRecording", "mutation")).toBe("canEdit");
    expect(operationPermission("session.updateRecording", "mutation")).toBe("canEdit");
    expect(operationPermission("meetingReview.submitLink", "mutation")).toBe("canEdit");
  });

  it("retains the normal read, create, and edit classifications", () => {
    expect(operationPermission("tasks.list", "query")).toBe("canView");
    expect(operationPermission("playbook.createQuotation", "mutation")).toBe("canAdd");
    expect(operationPermission("tasks.updateStatus", "mutation")).toBe("canEdit");
  });

  it("requires both add and edit grants for upsert operations", () => {
    expect(operationPermission("meetingReview.upsertReview", "mutation")).toEqual(["canAdd", "canEdit"]);
    expect(operationPermission("leadDailyStats.upsert", "mutation")).toEqual(["canAdd", "canEdit"]);
  });

  it("fails closed for an unclassified operational mutation", () => {
    expect(operationPermission("tasks.unclassifiedMutation", "mutation")).toBeNull();
  });
});
