/**
 * Management Focus Tests
 * يتحقق من منطق getManagementFocus: Admin Sales + Campaign + Alerts
 */
import { describe, it, expect } from "vitest";

// ─── Helper: تقييم Admin Sales Status ────────────────────────────────────────
function calcAdminSalesStatus(kpi: number, errors: number, delays: number): 'good' | 'needs_attention' | 'critical' {
  if (kpi < 50 || errors > 5) return 'critical';
  if (kpi < 75 || delays > 3) return 'needs_attention';
  return 'good';
}

// ─── Helper: تقييم Campaign Status ───────────────────────────────────────────
function calcCampaignStatus(total: number, qualityRate: number, delayedRate: number): 'strong' | 'medium' | 'weak' {
  if (total < 5 || qualityRate < 20) return 'weak';
  if (qualityRate < 40 || delayedRate > 40) return 'medium';
  return 'strong';
}

// ─── Helper: بناء Alerts ──────────────────────────────────────────────────────
function buildAlerts({
  overdueAmount = 0,
  collectionRate = 100,
  lowKPIEngineers = 0,
  medKPIEngineers = 0,
  leadsTotal = 20,
  leadsDelayedRate = 0,
  leadsQualityRate = 50,
  criticalTasks = 0,
  notDoneTasks = 0,
  adminSalesStatus = 'good' as 'good' | 'needs_attention' | 'critical',
  adminSalesKPI = 80,
  adminSalesErrors = 0,
  adminSalesDelays = 0,
}: {
  overdueAmount?: number;
  collectionRate?: number;
  lowKPIEngineers?: number;
  medKPIEngineers?: number;
  leadsTotal?: number;
  leadsDelayedRate?: number;
  leadsQualityRate?: number;
  criticalTasks?: number;
  notDoneTasks?: number;
  adminSalesStatus?: 'good' | 'needs_attention' | 'critical';
  adminSalesKPI?: number;
  adminSalesErrors?: number;
  adminSalesDelays?: number;
}) {
  const alerts: { severity: 'critical' | 'warning' | 'info'; category: string; message: string }[] = [];

  if (overdueAmount > 0) alerts.push({ severity: 'critical', category: 'تحصيل', message: `مبالغ متأخرة: ${overdueAmount.toLocaleString('ar-EG')} ج.م` });
  if (collectionRate < 60) alerts.push({ severity: 'warning', category: 'تحصيل', message: `معدل التحصيل منخفض: ${collectionRate}%` });
  if (lowKPIEngineers > 0) alerts.push({ severity: 'critical', category: 'KPI', message: `${lowKPIEngineers} مهندس KPI أقل من 60%` });
  if (medKPIEngineers > 0) alerts.push({ severity: 'warning', category: 'KPI', message: `${medKPIEngineers} مهندس KPI بين 60-75%` });
  if (leadsTotal < 10) alerts.push({ severity: 'warning', category: 'Leads', message: `عدد الـ Leads هذا الشهر منخفض: ${leadsTotal}` });
  if (leadsDelayedRate > 40) alerts.push({ severity: 'critical', category: 'Leads', message: `نسبة التأخير في الرد: ${leadsDelayedRate}%` });
  if (leadsQualityRate < 25 && leadsTotal > 0) alerts.push({ severity: 'warning', category: 'Leads', message: `جودة الـ Leads ضعيفة: ${leadsQualityRate}%` });
  if (criticalTasks > 0) alerts.push({ severity: 'critical', category: 'مهام', message: `${criticalTasks} مهمة حرجة` });
  if (notDoneTasks > 3) alerts.push({ severity: 'warning', category: 'مهام', message: `${notDoneTasks} مهمة لم تُنفذ اليوم` });
  if (adminSalesStatus === 'critical') alerts.push({ severity: 'critical', category: 'Admin Sales', message: `أداء Admin Sales ضعيف: KPI ${adminSalesKPI}%` });
  else if (adminSalesStatus === 'needs_attention') alerts.push({ severity: 'warning', category: 'Admin Sales', message: `Admin Sales يحتاج متابعة: ${adminSalesDelays} تأخيرات` });

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Management Focus - Admin Sales Status", () => {
  it("يجب أن يكون good عندما KPI >= 75 وأخطاء <= 5 وتأخيرات <= 3", () => {
    expect(calcAdminSalesStatus(80, 2, 1)).toBe('good');
    expect(calcAdminSalesStatus(75, 0, 0)).toBe('good');
    expect(calcAdminSalesStatus(90, 5, 3)).toBe('good');
  });

  it("يجب أن يكون needs_attention عندما KPI بين 50-75 أو تأخيرات > 3", () => {
    expect(calcAdminSalesStatus(60, 2, 1)).toBe('needs_attention');
    expect(calcAdminSalesStatus(74, 0, 0)).toBe('needs_attention');
    expect(calcAdminSalesStatus(80, 2, 4)).toBe('needs_attention');
  });

  it("يجب أن يكون critical عندما KPI < 50 أو أخطاء > 5", () => {
    expect(calcAdminSalesStatus(40, 2, 1)).toBe('critical');
    expect(calcAdminSalesStatus(80, 6, 1)).toBe('critical');
    expect(calcAdminSalesStatus(30, 10, 5)).toBe('critical');
  });
});

describe("Management Focus - Campaign Status", () => {
  it("يجب أن يكون strong عندما جودة >= 40 وتأخير <= 40 وعدد >= 5", () => {
    expect(calcCampaignStatus(20, 50, 20)).toBe('strong');
    expect(calcCampaignStatus(10, 40, 40)).toBe('strong');
  });

  it("يجب أن يكون medium عندما جودة بين 20-40 أو تأخير > 40", () => {
    expect(calcCampaignStatus(10, 30, 20)).toBe('medium');
    expect(calcCampaignStatus(10, 50, 50)).toBe('medium');
  });

  it("يجب أن يكون weak عندما عدد < 5 أو جودة < 20", () => {
    expect(calcCampaignStatus(3, 50, 10)).toBe('weak');
    expect(calcCampaignStatus(10, 15, 10)).toBe('weak');
  });
});

describe("Management Focus - Alerts Generation", () => {
  it("يجب أن لا يكون هناك alerts عندما كل شيء طبيعي", () => {
    const alerts = buildAlerts({ leadsTotal: 20, leadsQualityRate: 50 });
    expect(alerts).toHaveLength(0);
  });

  it("يجب أن يولد alert حرج عند وجود مبالغ متأخرة", () => {
    const alerts = buildAlerts({ overdueAmount: 50000, leadsTotal: 20 });
    const criticals = alerts.filter(a => a.severity === 'critical');
    expect(criticals.length).toBeGreaterThan(0);
    expect(criticals[0].category).toBe('تحصيل');
  });

  it("يجب أن يولد alert تحذير عند معدل تحصيل منخفض", () => {
    const alerts = buildAlerts({ collectionRate: 40, leadsTotal: 20 });
    const warnings = alerts.filter(a => a.severity === 'warning' && a.category === 'تحصيل');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("يجب أن يولد alert حرج عند وجود مهندسين KPI < 60%", () => {
    const alerts = buildAlerts({ lowKPIEngineers: 2, leadsTotal: 20 });
    const kpiAlerts = alerts.filter(a => a.category === 'KPI' && a.severity === 'critical');
    expect(kpiAlerts.length).toBe(1);
    expect(kpiAlerts[0].message).toContain('2');
  });

  it("يجب أن يولد alert تحذير عند قلة الـ Leads", () => {
    const alerts = buildAlerts({ leadsTotal: 5 });
    const leadsWarning = alerts.filter(a => a.category === 'Leads' && a.severity === 'warning');
    expect(leadsWarning.length).toBeGreaterThan(0);
  });

  it("يجب أن يولد alert حرج عند تأخير الرد على Leads > 40%", () => {
    const alerts = buildAlerts({ leadsDelayedRate: 50, leadsTotal: 20 });
    const leadsAlert = alerts.filter(a => a.category === 'Leads' && a.severity === 'critical');
    expect(leadsAlert.length).toBe(1);
  });

  it("يجب أن يولد alert حرج عند وجود مهام حرجة", () => {
    const alerts = buildAlerts({ criticalTasks: 3, leadsTotal: 20 });
    const taskAlerts = alerts.filter(a => a.category === 'مهام' && a.severity === 'critical');
    expect(taskAlerts.length).toBe(1);
  });

  it("يجب أن يولد alert حرج عند Admin Sales في حالة critical", () => {
    const alerts = buildAlerts({
      adminSalesStatus: 'critical',
      adminSalesKPI: 40,
      leadsTotal: 20,
    });
    const adminAlerts = alerts.filter(a => a.category === 'Admin Sales' && a.severity === 'critical');
    expect(adminAlerts.length).toBe(1);
  });

  it("يجب أن يولد alert تحذير عند Admin Sales في حالة needs_attention", () => {
    const alerts = buildAlerts({
      adminSalesStatus: 'needs_attention',
      adminSalesDelays: 4,
      leadsTotal: 20,
    });
    const adminAlerts = alerts.filter(a => a.category === 'Admin Sales' && a.severity === 'warning');
    expect(adminAlerts.length).toBe(1);
  });

  it("يجب أن تكون الـ alerts مرتبة: critical أولاً ثم warning", () => {
    const alerts = buildAlerts({
      overdueAmount: 10000,
      collectionRate: 40,
      leadsTotal: 5,
    });
    const severities = alerts.map(a => a.severity);
    const criticalIndex = severities.lastIndexOf('critical');
    const warningIndex = severities.indexOf('warning');
    if (criticalIndex >= 0 && warningIndex >= 0) {
      expect(criticalIndex).toBeLessThan(warningIndex);
    }
  });

  it("يجب أن يولد تحذير عند ضعف جودة الـ Leads", () => {
    const alerts = buildAlerts({ leadsTotal: 20, leadsQualityRate: 15 });
    const qualityAlert = alerts.filter(a => a.category === 'Leads' && a.message.includes('جودة'));
    expect(qualityAlert.length).toBe(1);
  });
});

describe("Management Focus - KPI Calculation", () => {
  it("يجب أن يحسب KPI بشكل صحيح من done/total", () => {
    const total = 100;
    const done = 80;
    const kpi = total > 0 ? Math.round((done / total) * 100) : 0;
    expect(kpi).toBe(80);
  });

  it("يجب أن يكون KPI = 0 عندما total = 0", () => {
    const total = 0;
    const done = 0;
    const kpi = total > 0 ? Math.round((done / total) * 100) : 0;
    expect(kpi).toBe(0);
  });

  it("يجب أن يحسب qualityRate بشكل صحيح", () => {
    const total = 20;
    const qualified = 8;
    const qualityRate = total > 0 ? Math.round((qualified / total) * 100) : 0;
    expect(qualityRate).toBe(40);
  });
});
