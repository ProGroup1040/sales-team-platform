import { describe, expect, it } from "vitest";
import {
  calculateProjectStatus,
  calculateRequiredProjectUpdateStatus,
  getProjectDelayCategory,
  isProjectTimelineExcluded,
  isExecutionSlaRunning,
  EXECUTION_SURVEY_STATUSES,
  PRE_EXECUTION_WAITING_OWNERS,
  PRE_EXECUTION_WAITING_STATUSES,
  isExecutionSurveyComplete,
  isProjectStageDelayOwnerAllowed,
} from "./db";

describe("Project Timeline — Delay ownership", () => {
  it("يفصل التأخير بين الشركة والعميل والطرف الخارجي", () => {
    expect(getProjectDelayCategory("production")).toBe("company");
    expect(getProjectDelayCategory("client")).toBe("client");
    expect(getProjectDelayCategory("supplier")).toBe("external");
    expect(getProjectDelayCategory("unknown_owner")).toBe("company");
  });
});

describe("Project Timeline — Stage-specific delay owners", () => {
  it("يحصر مسؤول التأخير في الأطراف المعتمدة للمرحلة", () => {
    expect(isProjectStageDelayOwnerAllowed("technical_work", "technical_office")).toBe(true);
    expect(isProjectStageDelayOwnerAllowed("technical_work", "production")).toBe(false);
    expect(isProjectStageDelayOwnerAllowed("production", "production")).toBe(true);
    expect(isProjectStageDelayOwnerAllowed("production", "sales_engineer")).toBe(false);
    expect(isProjectStageDelayOwnerAllowed("installation", "client")).toBe(true);
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

describe("Project Timeline — Pre-Execution execution clock", () => {
  it("لا يبدأ SLA من تاريخ التعاقد أو من تاريخ جاهزية الموقع وحدهما", () => {
    expect(isExecutionSlaRunning(null, "not_started")).toBe(false);
    expect(isExecutionSlaRunning("2026-08-10", "not_started")).toBe(false);
    expect(isExecutionSlaRunning("2026-08-10", "paused")).toBe(false);
  });

  it("يبدأ SLA فقط عند Execution Start Date المعتمد وحالة Running", () => {
    expect(isExecutionSlaRunning("2026-08-10", "running")).toBe(true);
  });

  it("يحصر حالات الانتظار والمسؤولين قبل التنفيذ في القائمة التشغيلية الجديدة", () => {
    expect(PRE_EXECUTION_WAITING_STATUSES).toEqual(["waiting_site_readiness", "execution_survey_scheduled", "waiting_financial_requirement", "other"]);
    expect(PRE_EXECUTION_WAITING_OWNERS).toEqual(["client", "sales_engineer", "sales_department", "other"]);
    expect(EXECUTION_SURVEY_STATUSES).toEqual(["unspecified", "scheduled", "completed", "not_done", "resurvey_required"]);
  });

  it("لا يتيح بدء التنفيذ إلا بعد إتمام المعاينة فعلياً وتعيين مهندسها", () => {
    expect(isExecutionSurveyComplete("completed", "2026-08-25", 12)).toBe(true);
    expect(isExecutionSurveyComplete("completed", null, 12)).toBe(false);
    expect(isExecutionSurveyComplete("completed", "2026-08-25", null)).toBe(false);
    expect(isExecutionSurveyComplete("scheduled", "2026-08-25", 12)).toBe(false);
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
