import { describe, expect, it } from "vitest";
import {
  calculateProjectStatus,
  calculateRequiredProjectUpdateStatus,
  getProjectDelayCategory,
  isProjectTimelineExcluded,
} from "./db";

describe("Project Timeline — Delay ownership", () => {
  it("يفصل التأخير بين الشركة والعميل والطرف الخارجي", () => {
    expect(getProjectDelayCategory("production")).toBe("company");
    expect(getProjectDelayCategory("client")).toBe("client");
    expect(getProjectDelayCategory("supplier")).toBe("external");
    expect(getProjectDelayCategory("unknown_owner")).toBe("company");
  });
});

describe("Project Timeline — Status calculation", () => {
  const standard = { currentStageKey: "production", stageDelayDays: 0, stageSlaDays: 10, daysUntilReference: 5 };

  it("يعطي On Hold أولوية على كل الحالات الأخرى", () => {
    expect(calculateProjectStatus({ ...standard, isOnHold: true, stageDelayDays: 20 })).toBe("on_hold");
  });

  it("يعطي Closed وCompleted الأولوية الصحيحة", () => {
    expect(calculateProjectStatus({ ...standard, isOnHold: false, currentStageKey: "closed" })).toBe("closed");
    expect(calculateProjectStatus({ ...standard, isOnHold: false, actualCompletionDate: "2026-08-20" })).toBe("completed");
  });

  it("يصنف التأخير الحرج عند تجاوز حد SLA الحرج", () => {
    expect(calculateProjectStatus({ ...standard, isOnHold: false, stageDelayDays: 7, stageSlaDays: 10 })).toBe("critical_delay");
    expect(calculateProjectStatus({ ...standard, isOnHold: false, stageDelayDays: 1, stageSlaDays: 10 })).toBe("delayed");
  });

  it("يكتشف المشروع المعرض للتأخير قبل يوم من الموعد", () => {
    expect(calculateProjectStatus({ ...standard, isOnHold: false, daysUntilReference: 1 })).toBe("at_risk");
    expect(calculateProjectStatus({ ...standard, isOnHold: false, daysUntilReference: 6 })).toBe("on_time");
  });
});

describe("Project Timeline — Completed exclusion", () => {
  it("يستبعد Completed من المتابعة فقط، ويُبقي الحالات التشغيلية الأخرى ظاهرة", () => {
    expect(isProjectTimelineExcluded("completed")).toBe(true);
    expect(isProjectTimelineExcluded("on_time")).toBe(false);
    expect(isProjectTimelineExcluded("delayed")).toBe(false);
    expect(isProjectTimelineExcluded("closed")).toBe(false);
    expect(isProjectTimelineExcluded(null)).toBe(false);
  });
});

describe("Project Timeline — Monday/Wednesday update discipline", () => {
  it("يعتبر تحديث يوم المراجعة نفسه محدثاً", () => {
    const wednesday = new Date("2026-08-19T12:00:00");
    expect(calculateRequiredProjectUpdateStatus(new Date("2026-08-19T09:00:00"), wednesday)).toBe("up_to_date");
  });

  it("يعتبر مشروعاً بدون تحديث بعد آخر مراجعة في حالة missing", () => {
    const thursday = new Date("2026-08-20T12:00:00");
    expect(calculateRequiredProjectUpdateStatus(new Date("2026-08-18T12:00:00"), thursday)).toBe("missing");
  });

  it("يقبل تحديث الأربعاء عند الفحص يوم الخميس", () => {
    const thursday = new Date("2026-08-20T12:00:00");
    expect(calculateRequiredProjectUpdateStatus(new Date("2026-08-19T15:00:00"), thursday)).toBe("up_to_date");
  });
});
