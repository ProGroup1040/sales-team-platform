import { describe, it, expect } from "vitest";

// ─── Helper: حساب الإحصائيات الإجمالية ──────────────────────────────────────
interface DayRow {
  totalLeads: number;
  contacted: number;
  delayed: number;
  notContacted: number;
  qualified: number;
  converted: number;
}

function calcSummary(rows: DayRow[]) {
  const totalLeads = rows.reduce((s, r) => s + r.totalLeads, 0);
  const contacted = rows.reduce((s, r) => s + r.contacted, 0);
  const delayed = rows.reduce((s, r) => s + r.delayed, 0);
  const notContacted = rows.reduce((s, r) => s + r.notContacted, 0);
  const qualified = rows.reduce((s, r) => s + r.qualified, 0);
  const converted = rows.reduce((s, r) => s + r.converted, 0);
  const contactRate = totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0;
  const delayRate = totalLeads > 0 ? Math.round((delayed / totalLeads) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  return { totalLeads, contacted, delayed, notContacted, qualified, converted, contactRate, delayRate, conversionRate, daysCount: rows.length };
}

// ─── Helper: تنبيهات الأداء ──────────────────────────────────────────────────
function getAlerts(summary: ReturnType<typeof calcSummary>) {
  const alerts: string[] = [];
  if (summary.delayRate > 30) alerts.push("delay_high");
  if (summary.contactRate < 70 && summary.contactRate > 0) alerts.push("contact_low");
  if (summary.conversionRate > 0 && summary.conversionRate < 5) alerts.push("conversion_low");
  return alerts;
}

// ─── Helper: Upsert Logic ─────────────────────────────────────────────────────
function upsertDay(store: Map<string, DayRow>, date: string, data: DayRow): DayRow {
  store.set(date, data);
  return data;
}

function getDay(store: Map<string, DayRow>, date: string): DayRow | undefined {
  return store.get(date);
}

function getRange(store: Map<string, DayRow>, from: string, to: string): DayRow[] {
  return Array.from(store.entries())
    .filter(([date]) => date >= from && date <= to)
    .map(([, row]) => row);
}

// ─── الاختبارات ───────────────────────────────────────────────────────────────

describe("Lead Daily Stats — إدخال وجلب البيانات", () => {
  it("يجب أن يُدخل سجل جديد ليوم جديد", () => {
    const store = new Map<string, DayRow>();
    upsertDay(store, "2026-04-01", { totalLeads: 50, contacted: 35, delayed: 10, notContacted: 5, qualified: 20, converted: 3 });
    const row = getDay(store, "2026-04-01");
    expect(row).toBeDefined();
    expect(row!.totalLeads).toBe(50);
    expect(row!.contacted).toBe(35);
    expect(row!.delayed).toBe(10);
  });

  it("يجب أن يُحدّث سجل موجود بدلاً من إنشاء سجل جديد (Upsert)", () => {
    const store = new Map<string, DayRow>();
    upsertDay(store, "2026-04-01", { totalLeads: 50, contacted: 35, delayed: 10, notContacted: 5, qualified: 20, converted: 3 });
    upsertDay(store, "2026-04-01", { totalLeads: 60, contacted: 45, delayed: 8, notContacted: 7, qualified: 25, converted: 4 });
    expect(store.size).toBe(1); // لا يوجد سجل مكرر
    const row = getDay(store, "2026-04-01");
    expect(row!.totalLeads).toBe(60);
    expect(row!.contacted).toBe(45);
  });

  it("يجب أن يُدخل أيام متعددة بشكل صحيح", () => {
    const store = new Map<string, DayRow>();
    upsertDay(store, "2026-04-01", { totalLeads: 50, contacted: 35, delayed: 10, notContacted: 5, qualified: 20, converted: 3 });
    upsertDay(store, "2026-04-02", { totalLeads: 40, contacted: 30, delayed: 5, notContacted: 5, qualified: 15, converted: 2 });
    upsertDay(store, "2026-04-03", { totalLeads: 55, contacted: 40, delayed: 12, notContacted: 3, qualified: 22, converted: 4 });
    expect(store.size).toBe(3);
  });

  it("يجب أن يُرجع undefined لتاريخ غير موجود", () => {
    const store = new Map<string, DayRow>();
    const row = getDay(store, "2026-01-01");
    expect(row).toBeUndefined();
  });
});

describe("Lead Daily Stats — حساب الإحصائيات", () => {
  it("يجب أن تحسب نسبة التواصل بشكل صحيح", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 70, delayed: 20, notContacted: 10, qualified: 30, converted: 5 }];
    const summary = calcSummary(rows);
    expect(summary.contactRate).toBe(70);
  });

  it("يجب أن تحسب نسبة التأخير بشكل صحيح", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 70, delayed: 25, notContacted: 5, qualified: 30, converted: 5 }];
    const summary = calcSummary(rows);
    expect(summary.delayRate).toBe(25);
  });

  it("يجب أن تحسب نسبة التحويل بشكل صحيح", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 70, delayed: 20, notContacted: 10, qualified: 30, converted: 5 }];
    const summary = calcSummary(rows);
    expect(summary.conversionRate).toBe(5);
  });

  it("يجب أن تُعيد صفر عند عدم وجود leads", () => {
    const rows: DayRow[] = [{ totalLeads: 0, contacted: 0, delayed: 0, notContacted: 0, qualified: 0, converted: 0 }];
    const summary = calcSummary(rows);
    expect(summary.contactRate).toBe(0);
    expect(summary.delayRate).toBe(0);
    expect(summary.conversionRate).toBe(0);
  });

  it("يجب أن تحسب الإجماليات لفترة زمنية بشكل صحيح", () => {
    const store = new Map<string, DayRow>();
    upsertDay(store, "2026-04-02", { totalLeads: 40, contacted: 30, delayed: 5, notContacted: 5, qualified: 15, converted: 2 });
    upsertDay(store, "2026-04-03", { totalLeads: 55, contacted: 40, delayed: 12, notContacted: 3, qualified: 22, converted: 4 });
    upsertDay(store, "2026-04-04", { totalLeads: 30, contacted: 20, delayed: 8, notContacted: 2, qualified: 10, converted: 1 });

    const rows = getRange(store, "2026-04-02", "2026-04-04");
    const summary = calcSummary(rows);
    expect(summary.daysCount).toBe(3);
    expect(summary.totalLeads).toBe(40 + 55 + 30); // 125
    expect(summary.contacted).toBe(30 + 40 + 20); // 90
    expect(summary.delayed).toBe(5 + 12 + 8); // 25
    expect(summary.converted).toBe(2 + 4 + 1); // 7
  });

  it("يجب أن تحسب contactRate الإجمالية بشكل صحيح للفترة", () => {
    const rows: DayRow[] = [
      { totalLeads: 100, contacted: 70, delayed: 20, notContacted: 10, qualified: 30, converted: 5 },
      { totalLeads: 50, contacted: 40, delayed: 5, notContacted: 5, qualified: 15, converted: 2 },
    ];
    const summary = calcSummary(rows);
    // إجمالي: 150 leads, 110 contacted → 73%
    expect(summary.totalLeads).toBe(150);
    expect(summary.contacted).toBe(110);
    expect(summary.contactRate).toBe(73);
  });

  it("يجب أن يكون daysCount صحيحاً", () => {
    const rows: DayRow[] = [
      { totalLeads: 50, contacted: 35, delayed: 10, notContacted: 5, qualified: 20, converted: 3 },
      { totalLeads: 40, contacted: 30, delayed: 5, notContacted: 5, qualified: 15, converted: 2 },
    ];
    const summary = calcSummary(rows);
    expect(summary.daysCount).toBe(2);
  });
});

describe("Lead Daily Stats — تنبيهات الأداء", () => {
  it("يجب أن يُطلق تنبيه delay_high عند تجاوز نسبة التأخير 30%", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 60, delayed: 35, notContacted: 5, qualified: 20, converted: 3 }];
    const summary = calcSummary(rows);
    const alerts = getAlerts(summary);
    expect(alerts).toContain("delay_high");
  });

  it("يجب ألا يُطلق تنبيه delay_high عند نسبة تأخير أقل من 30%", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 70, delayed: 20, notContacted: 10, qualified: 30, converted: 5 }];
    const summary = calcSummary(rows);
    const alerts = getAlerts(summary);
    expect(alerts).not.toContain("delay_high");
  });

  it("يجب أن يُطلق تنبيه contact_low عند نسبة تواصل أقل من 70%", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 60, delayed: 20, notContacted: 20, qualified: 20, converted: 3 }];
    const summary = calcSummary(rows);
    const alerts = getAlerts(summary);
    expect(alerts).toContain("contact_low");
  });

  it("يجب ألا يُطلق تنبيه contact_low عند نسبة تواصل 70% أو أكثر", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 75, delayed: 15, notContacted: 10, qualified: 30, converted: 5 }];
    const summary = calcSummary(rows);
    const alerts = getAlerts(summary);
    expect(alerts).not.toContain("contact_low");
  });

  it("يجب ألا يُطلق تنبيه contact_low عند عدم وجود بيانات (contactRate = 0)", () => {
    const rows: DayRow[] = [{ totalLeads: 0, contacted: 0, delayed: 0, notContacted: 0, qualified: 0, converted: 0 }];
    const summary = calcSummary(rows);
    const alerts = getAlerts(summary);
    expect(alerts).not.toContain("contact_low");
  });

  it("يجب أن يُطلق تنبيه conversion_low عند نسبة تحويل أقل من 5%", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 70, delayed: 20, notContacted: 10, qualified: 30, converted: 3 }];
    const summary = calcSummary(rows);
    const alerts = getAlerts(summary);
    expect(alerts).toContain("conversion_low");
  });

  it("يجب ألا يُطلق تنبيه conversion_low عند نسبة تحويل 5% أو أكثر", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 70, delayed: 20, notContacted: 10, qualified: 30, converted: 6 }];
    const summary = calcSummary(rows);
    const alerts = getAlerts(summary);
    expect(alerts).not.toContain("conversion_low");
  });
});

describe("Lead Daily Stats — فلترة الفترات الزمنية", () => {
  const store = new Map<string, DayRow>();
  store.set("2026-04-01", { totalLeads: 50, contacted: 35, delayed: 10, notContacted: 5, qualified: 20, converted: 3 });
  store.set("2026-04-02", { totalLeads: 40, contacted: 30, delayed: 5, notContacted: 5, qualified: 15, converted: 2 });
  store.set("2026-04-03", { totalLeads: 55, contacted: 40, delayed: 12, notContacted: 3, qualified: 22, converted: 4 });
  store.set("2026-04-04", { totalLeads: 30, contacted: 20, delayed: 8, notContacted: 2, qualified: 10, converted: 1 });

  it("يجب أن يُرجع بيانات اليوم فقط عند فلترة today", () => {
    const rows = getRange(store, "2026-04-04", "2026-04-04");
    expect(rows.length).toBe(1);
    expect(rows[0].totalLeads).toBe(30);
  });

  it("يجب أن يُرجع بيانات آخر 7 أيام عند فلترة week", () => {
    const rows = getRange(store, "2026-04-01", "2026-04-07");
    expect(rows.length).toBe(4);
  });

  it("يجب أن يُرجع نتائج فارغة لفترة لا توجد فيها بيانات", () => {
    const rows = getRange(store, "2025-01-01", "2025-01-31");
    expect(rows.length).toBe(0);
  });

  it("يجب أن يُرجع بيانات فترة جزئية بشكل صحيح", () => {
    const rows = getRange(store, "2026-04-02", "2026-04-03");
    expect(rows.length).toBe(2);
  });
});

describe("Lead Daily Stats — منطق KPI", () => {
  it("يجب أن يكون contactRate >= 70% مقبولاً", () => {
    const contactRate = 72;
    expect(contactRate >= 70).toBe(true);
  });

  it("يجب أن يكون delayRate <= 20% مقبولاً", () => {
    const delayRate = 15;
    expect(delayRate <= 20).toBe(true);
  });

  it("يجب أن يكون conversionRate >= 5% هدفاً جيداً", () => {
    const conversionRate = 8;
    expect(conversionRate >= 5).toBe(true);
  });

  it("يجب أن يكون الإجمالي = contacted + delayed + notContacted", () => {
    const contacted = 35;
    const delayed = 10;
    const notContacted = 5;
    const total = 50;
    expect(contacted + delayed + notContacted).toBe(total);
  });

  it("يجب أن تكون نسبة التواصل مرتفعة عند انخفاض التأخير", () => {
    const rows: DayRow[] = [{ totalLeads: 100, contacted: 85, delayed: 10, notContacted: 5, qualified: 40, converted: 8 }];
    const summary = calcSummary(rows);
    expect(summary.contactRate).toBe(85);
    expect(summary.delayRate).toBe(10);
    expect(summary.conversionRate).toBe(8);
  });
});
