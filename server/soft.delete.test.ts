import { describe, it, expect } from "vitest";

// ─── Unit tests for Soft Delete logic ────────────────────────────────────────

describe("Soft Delete - Reason Validation", () => {
  const VALID_REASONS = ["data_entry_error", "duplicate", "client_cancelled", "other"] as const;
  type DeleteReason = typeof VALID_REASONS[number];

  function validateReason(reason: string): reason is DeleteReason {
    return VALID_REASONS.includes(reason as DeleteReason);
  }

  it("accepts all valid reasons", () => {
    for (const r of VALID_REASONS) {
      expect(validateReason(r)).toBe(true);
    }
  });

  it("rejects invalid reason", () => {
    expect(validateReason("random_reason")).toBe(false);
    expect(validateReason("")).toBe(false);
  });
});

describe("Soft Delete - Audit Log Entry Builder", () => {
  function buildAuditEntry(
    entityType: string,
    entityId: number,
    reason: string,
    deletedBy: string,
    reasonCustom?: string
  ) {
    return {
      entityType,
      entityId,
      reason,
      deletedBy,
      reasonCustom: reasonCustom ?? null,
      deletedAt: expect.any(Number),
    };
  }

  it("builds correct audit entry for engineer", () => {
    const entry = buildAuditEntry("engineer", 5, "duplicate", "admin_user");
    expect(entry.entityType).toBe("engineer");
    expect(entry.entityId).toBe(5);
    expect(entry.reason).toBe("duplicate");
    expect(entry.deletedBy).toBe("admin_user");
    expect(entry.reasonCustom).toBeNull();
  });

  it("includes reasonCustom when provided", () => {
    const entry = buildAuditEntry("lead", 12, "other", "admin_user", "تم الاتفاق على إلغاء");
    expect(entry.reasonCustom).toBe("تم الاتفاق على إلغاء");
  });

  it("sets reasonCustom to null when not provided", () => {
    const entry = buildAuditEntry("visit", 3, "client_cancelled", "admin_sales");
    expect(entry.reasonCustom).toBeNull();
  });
});

describe("Soft Delete - Permission Rules", () => {
  type UserRole = "admin" | "admin_sales" | "engineer" | "user";

  function canDelete(role: UserRole, entityType: string): boolean {
    if (role === "admin") {
      // Admin can delete everything
      return true;
    }
    if (role === "admin_sales") {
      // Admin Sales can delete visits and leads
      return ["visit", "lead"].includes(entityType);
    }
    // Engineers and regular users cannot delete
    return false;
  }

  it("admin can delete all entity types", () => {
    const entities = ["engineer", "task", "lead", "visit", "deal"];
    for (const e of entities) {
      expect(canDelete("admin", e)).toBe(true);
    }
  });

  it("admin_sales can delete visits and leads", () => {
    expect(canDelete("admin_sales", "visit")).toBe(true);
    expect(canDelete("admin_sales", "lead")).toBe(true);
  });

  it("admin_sales cannot delete engineers or deals", () => {
    expect(canDelete("admin_sales", "engineer")).toBe(false);
    expect(canDelete("admin_sales", "deal")).toBe(false);
  });

  it("engineer cannot delete anything", () => {
    const entities = ["engineer", "task", "lead", "visit", "deal"];
    for (const e of entities) {
      expect(canDelete("engineer", e)).toBe(false);
    }
  });

  it("regular user cannot delete anything", () => {
    expect(canDelete("user", "task")).toBe(false);
  });
});

describe("Soft Delete - Debt Calculation (Visits)", () => {
  type VisitStatus = "completed" | "cancelled" | "postponed" | "pending";
  type PaymentStatus = "paid" | "unpaid";

  interface Visit {
    id: number;
    status: VisitStatus;
    paymentStatus: PaymentStatus;
    feeAmount: number;
    isDeleted: boolean;
  }

  function calculateDebt(visits: Visit[]): number {
    return visits
      .filter(v => !v.isDeleted)
      .filter(v => v.status === "completed")
      .filter(v => v.paymentStatus === "unpaid")
      .reduce((sum, v) => sum + v.feeAmount, 0);
  }

  const sampleVisits: Visit[] = [
    { id: 1, status: "completed", paymentStatus: "unpaid", feeAmount: 500, isDeleted: false },
    { id: 2, status: "completed", paymentStatus: "paid", feeAmount: 300, isDeleted: false },
    { id: 3, status: "cancelled", paymentStatus: "unpaid", feeAmount: 200, isDeleted: false },
    { id: 4, status: "postponed", paymentStatus: "unpaid", feeAmount: 400, isDeleted: false },
    { id: 5, status: "completed", paymentStatus: "unpaid", feeAmount: 700, isDeleted: true }, // soft deleted
  ];

  it("calculates debt correctly (only completed + unpaid + not deleted)", () => {
    expect(calculateDebt(sampleVisits)).toBe(500); // only visit 1
  });

  it("excludes cancelled visits from debt", () => {
    const visits: Visit[] = [
      { id: 1, status: "cancelled", paymentStatus: "unpaid", feeAmount: 500, isDeleted: false },
    ];
    expect(calculateDebt(visits)).toBe(0);
  });

  it("excludes postponed visits from debt", () => {
    const visits: Visit[] = [
      { id: 1, status: "postponed", paymentStatus: "unpaid", feeAmount: 500, isDeleted: false },
    ];
    expect(calculateDebt(visits)).toBe(0);
  });

  it("excludes soft-deleted visits from debt", () => {
    const visits: Visit[] = [
      { id: 1, status: "completed", paymentStatus: "unpaid", feeAmount: 500, isDeleted: true },
    ];
    expect(calculateDebt(visits)).toBe(0);
  });

  it("sums multiple unpaid completed visits", () => {
    const visits: Visit[] = [
      { id: 1, status: "completed", paymentStatus: "unpaid", feeAmount: 300, isDeleted: false },
      { id: 2, status: "completed", paymentStatus: "unpaid", feeAmount: 700, isDeleted: false },
    ];
    expect(calculateDebt(visits)).toBe(1000);
  });
});
