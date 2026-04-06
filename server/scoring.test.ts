import { describe, expect, it } from "vitest";
import { calcTaskScore } from "./db";

describe("Dynamic Scoring Logic", () => {
  describe("calcTaskScore - حالة منجزة", () => {
    it("Done = 1 بغض النظر عن عدد أيام التأخير", () => {
      expect(calcTaskScore("completed", 0)).toBe(1);
      expect(calcTaskScore("completed", 5)).toBe(1);
    });
  });

  describe("calcTaskScore - حالة متأخرة", () => {
    it("Delayed 1 يوم = 0.5", () => {
      expect(calcTaskScore("delayed", 1)).toBe(0.5);
    });

    it("Delayed 2 يوم = 0.3", () => {
      expect(calcTaskScore("delayed", 2)).toBe(0.3);
    });

    it("Delayed 3 يوم = 0.1", () => {
      expect(calcTaskScore("delayed", 3)).toBe(0.1);
    });

    it("Delayed أكثر من 3 أيام = 0", () => {
      expect(calcTaskScore("delayed", 4)).toBe(0);
      expect(calcTaskScore("delayed", 10)).toBe(0);
    });
  });

  describe("calcTaskScore - حالة لم تُنفذ", () => {
    it("Not Done = 0", () => {
      expect(calcTaskScore("not_done", 0)).toBe(0);
    });
  });

  describe("calcTaskScore - تأخير العميل", () => {
    it("Client Delay = -1 (علامة استبعاد من الحساب)", () => {
      expect(calcTaskScore("client_delay", 0)).toBe(-1);
    });

    it("Client Delay لا يُحتسب في المقام (استبعاد كامل)", () => {
      // التحقق أن القيمة -1 تُشير إلى الاستبعاد
      const score = calcTaskScore("client_delay", 0);
      expect(score).toBe(-1);
      expect(score).not.toBe(0); // ليست صفر - بل علامة استبعاد
    });
  });

  describe("حساب Execution Score الإجمالي", () => {
    it("مهندس بمهام متنوعة - حساب صحيح", () => {
      // 1 منجزة + 1 متأخرة يوم + 1 تأخير عميل (مستبعدة)
      const tasks = [
        { status: "completed", delayDays: 0 },
        { status: "delayed", delayDays: 1 },
        { status: "client_delay", delayDays: 0 }, // مستبعدة
      ];
      const scorable = tasks.filter(t => t.status !== "client_delay" && t.status !== "planned");
      const totalPoints = scorable.reduce((sum, t) => sum + calcTaskScore(t.status, t.delayDays), 0);
      const executionScore = scorable.length > 0 ? Math.round((totalPoints / scorable.length) * 100) : 0;
      // (1 + 0.5) / 2 = 0.75 = 75%
      expect(executionScore).toBe(75);
    });

    it("مهندس بمهام منجزة فقط = 100%", () => {
      const tasks = [
        { status: "completed", delayDays: 0 },
        { status: "completed", delayDays: 0 },
        { status: "completed", delayDays: 0 },
      ];
      const scorable = tasks.filter(t => t.status !== "client_delay" && t.status !== "planned");
      const totalPoints = scorable.reduce((sum, t) => sum + calcTaskScore(t.status, t.delayDays), 0);
      const executionScore = scorable.length > 0 ? Math.round((totalPoints / scorable.length) * 100) : 0;
      expect(executionScore).toBe(100);
    });

    it("مهندس بمهام لم تُنفذ فقط = 0%", () => {
      const tasks = [
        { status: "not_done", delayDays: 0 },
        { status: "not_done", delayDays: 0 },
      ];
      const scorable = tasks.filter(t => t.status !== "client_delay" && t.status !== "planned");
      const totalPoints = scorable.reduce((sum, t) => sum + calcTaskScore(t.status, t.delayDays), 0);
      const executionScore = scorable.length > 0 ? Math.round((totalPoints / scorable.length) * 100) : 0;
      expect(executionScore).toBe(0);
    });

    it("مهندس بمهام تأخير عميل فقط = 0% (لا توجد مهام قابلة للتقييم)", () => {
      const tasks = [
        { status: "client_delay", delayDays: 0 },
        { status: "client_delay", delayDays: 0 },
      ];
      const scorable = tasks.filter(t => t.status !== "client_delay" && t.status !== "planned");
      const executionScore = scorable.length > 0 ? Math.round((scorable.reduce((sum, t) => sum + calcTaskScore(t.status, t.delayDays), 0) / scorable.length) * 100) : 0;
      expect(executionScore).toBe(0);
    });

    it("مهندس بتأخير حرج (3 أيام) = 10%", () => {
      const tasks = [{ status: "delayed", delayDays: 3 }];
      const scorable = tasks.filter(t => t.status !== "client_delay" && t.status !== "planned");
      const totalPoints = scorable.reduce((sum, t) => sum + calcTaskScore(t.status, t.delayDays), 0);
      const executionScore = scorable.length > 0 ? Math.round((totalPoints / scorable.length) * 100) : 0;
      expect(executionScore).toBe(10);
    });
  });

  describe("Critical Tasks - تصنيف المهام الحرجة", () => {
    it("تأخير أكثر من يومين = حرجة", () => {
      const isCritical = (delayDays: number) => delayDays > 2;
      expect(isCritical(3)).toBe(true);
      expect(isCritical(5)).toBe(true);
      expect(isCritical(10)).toBe(true);
    });

    it("تأخير يومين أو أقل = ليست حرجة", () => {
      const isCritical = (delayDays: number) => delayDays > 2;
      expect(isCritical(0)).toBe(false);
      expect(isCritical(1)).toBe(false);
      expect(isCritical(2)).toBe(false);
    });
  });
});
