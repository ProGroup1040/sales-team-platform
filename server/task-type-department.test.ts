import { describe, expect, it } from "vitest";
import { ALLOWED_TASK_TYPES_BY_DEPARTMENT } from "./db";

describe("Task types by engineer department", () => {
  it("يتيح مهندس المبيعات الأنواع التسعة التشغيلية", () => {
    expect(ALLOWED_TASK_TYPES_BY_DEPARTMENT.sales_engineer).toHaveLength(9);
    expect(ALLOWED_TASK_TYPES_BY_DEPARTMENT.sales_engineer).toContain("work_order");
  });

  it("يقيد المصمم الداخلي بمهام التصميم فقط", () => {
    expect(ALLOWED_TASK_TYPES_BY_DEPARTMENT.interior_designer).toEqual(["design_2d", "design_3d", "render"]);
  });

  it("يدعم الاسم الفعلي لقسم مهندس المعاينات دون إظهار كل أنواع المهام", () => {
    expect(ALLOWED_TASK_TYPES_BY_DEPARTMENT.site_engineer).toEqual(["meeting_modeling", "meeting_presentation", "meeting_closing"]);
    expect(ALLOWED_TASK_TYPES_BY_DEPARTMENT.site_engineer).not.toContain("design_3d");
  });

  it("لا يتيح تيلي سيلز أعمال التصميم أو الإنتاج", () => {
    expect(ALLOWED_TASK_TYPES_BY_DEPARTMENT.tele_sales).toEqual(["quotation", "meeting_modeling", "meeting_presentation"]);
  });
});
