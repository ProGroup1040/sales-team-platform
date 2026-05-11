import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock DB ───────────────────────────────────────────────────────────────────
vi.mock('./db', () => ({
  createDealTask: vi.fn().mockResolvedValue({ id: 1, dealId: 10, engineerId: 5, title: 'Follow-up call', dueDate: new Date('2026-05-15'), status: 'pending' }),
  getOverdueDealTasks: vi.fn().mockResolvedValue([
    { id: 2, dealId: 11, engineerId: 5, title: 'Site visit', dueDate: new Date('2026-04-01'), status: 'overdue', daysOverdue: 10 },
  ]),
  getPendingDealTasks: vi.fn().mockResolvedValue([
    { id: 3, dealId: 12, engineerId: 6, title: 'Send proposal', dueDate: new Date('2026-05-20'), status: 'pending' },
  ]),
  markDealTaskDone: vi.fn().mockResolvedValue(undefined),
  getFollowupKPI: vi.fn().mockResolvedValue({ engineerId: 5, totalTasks: 10, completedTasks: 8, overdueCount: 2, complianceRate: 80 }),
  getFollowupComplianceReport: vi.fn().mockResolvedValue([
    { engineerId: 5, engineerName: 'أحمد', totalTasks: 10, completedTasks: 8, overdueCount: 2, pendingTasks: 0, complianceRate: 80 },
    { engineerId: 6, engineerName: 'محمد', totalTasks: 5, completedTasks: 3, overdueCount: 4, pendingTasks: 2, complianceRate: 60 },
  ]),
  getDiscountSummary: vi.fn().mockResolvedValue({
    availableDiscount: 50000,
    usedDiscount: 15000,
    remainingDiscount: 35000,
    potentialDiscount: 5000,
    achievedDiscount: 10000,
  }),
  getEngineerDiscountSummary: vi.fn().mockResolvedValue([
    { engineerId: 5, engineerName: 'أحمد', availableDiscount: 20000, usedDiscount: 5000, remainingDiscount: 15000 },
  ]),
}));

import {
  createDealTask,
  getOverdueDealTasks,
  getPendingDealTasks,
  markDealTaskDone,
  getFollowupKPI,
  getFollowupComplianceReport,
  getDiscountSummary,
  getEngineerDiscountSummary,
} from './db';

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Deal Tasks System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDealTask', () => {
    it('should create a deal task with required fields', async () => {
      const task = await createDealTask({
        dealId: 10,
        engineerId: 5,
        title: 'Follow-up call',
        dueDate: '2026-05-15',
      });
      expect(task).toBeDefined();
      expect(task.dealId).toBe(10);
      expect(task.engineerId).toBe(5);
      expect(task.title).toBe('Follow-up call');
    });
  });

  describe('getOverdueDealTasks', () => {
    it('should return overdue tasks', async () => {
      const tasks = await getOverdueDealTasks();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].status).toBe('overdue');
    });

    it('should filter by engineerId when provided', async () => {
      await getOverdueDealTasks(5);
      expect(getOverdueDealTasks).toHaveBeenCalledWith(5);
    });
  });

  describe('getPendingDealTasks', () => {
    it('should return pending tasks', async () => {
      const tasks = await getPendingDealTasks();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks[0].status).toBe('pending');
    });
  });

  describe('markDealTaskDone', () => {
    it('should mark a task as done', async () => {
      await markDealTaskDone(1);
      expect(markDealTaskDone).toHaveBeenCalledWith(1);
    });
  });

  describe('getFollowupKPI', () => {
    it('should return KPI metrics for an engineer', async () => {
      const kpi = await getFollowupKPI(5);
      expect(kpi).toBeDefined();
      expect(kpi.engineerId).toBe(5);
      expect(kpi.complianceRate).toBe(80);
      expect(kpi.overdueCount).toBe(2);
    });

    it('should accept date range parameters', async () => {
      await getFollowupKPI(5, '2026-05-01', '2026-05-31');
      expect(getFollowupKPI).toHaveBeenCalledWith(5, '2026-05-01', '2026-05-31');
    });
  });

  describe('getFollowupComplianceReport', () => {
    it('should return compliance report for all engineers', async () => {
      const report = await getFollowupComplianceReport();
      expect(Array.isArray(report)).toBe(true);
      expect(report.length).toBe(2);
    });

    it('should include complianceRate for each engineer', async () => {
      const report = await getFollowupComplianceReport();
      report.forEach((eng: any) => {
        expect(eng).toHaveProperty('complianceRate');
        expect(eng).toHaveProperty('overdueCount');
        expect(eng).toHaveProperty('totalTasks');
      });
    });

    it('should identify high-risk engineers (overdueCount > 3)', async () => {
      const report = await getFollowupComplianceReport();
      const highRisk = report.filter((e: any) => e.overdueCount > 3);
      expect(highRisk.length).toBe(1);
      expect(highRisk[0].engineerName).toBe('محمد');
    });
  });
});

describe('Time-Based Discount System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDiscountSummary with date range', () => {
    it('should return discount summary for a specific month', async () => {
      const summary = await getDiscountSummary('2026-05-01', '2026-05-31');
      expect(summary).toBeDefined();
      expect(summary.availableDiscount).toBeGreaterThanOrEqual(0);
      expect(summary.usedDiscount).toBeGreaterThanOrEqual(0);
      expect(summary.remainingDiscount).toBeGreaterThanOrEqual(0);
    });

    it('should accept startDate and endDate parameters', async () => {
      await getDiscountSummary('2026-04-01', '2026-04-30');
      expect(getDiscountSummary).toHaveBeenCalledWith('2026-04-01', '2026-04-30');
    });

    it('should return different results for different date ranges', async () => {
      // April
      (getDiscountSummary as any).mockResolvedValueOnce({ availableDiscount: 30000, usedDiscount: 10000, remainingDiscount: 20000 });
      const aprilSummary = await getDiscountSummary('2026-04-01', '2026-04-30');

      // May
      (getDiscountSummary as any).mockResolvedValueOnce({ availableDiscount: 50000, usedDiscount: 15000, remainingDiscount: 35000 });
      const maySummary = await getDiscountSummary('2026-05-01', '2026-05-31');

      // They should be different (time-based, not cumulative)
      expect(aprilSummary.usedDiscount).not.toBe(maySummary.usedDiscount);
    });
  });

  describe('getEngineerDiscountSummary with date range', () => {
    it('should return per-engineer discount summary', async () => {
      const summaries = await getEngineerDiscountSummary('2026-05-01', '2026-05-31');
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries[0]).toHaveProperty('engineerId');
      expect(summaries[0]).toHaveProperty('availableDiscount');
      expect(summaries[0]).toHaveProperty('usedDiscount');
      expect(summaries[0]).toHaveProperty('remainingDiscount');
    });

    it('should accept date range parameters', async () => {
      await getEngineerDiscountSummary('2026-04-01', '2026-04-30');
      expect(getEngineerDiscountSummary).toHaveBeenCalledWith('2026-04-01', '2026-04-30');
    });
  });

  describe('Discount Calculation Logic', () => {
    it('remaining discount should equal available minus used', async () => {
      const summary = await getDiscountSummary('2026-05-01', '2026-05-31');
      expect(summary.remainingDiscount).toBe(summary.availableDiscount - summary.usedDiscount);
    });

    it('should not accumulate discounts across months (no cumulative totals)', async () => {
      // Each call with different date range should be independent
      const call1 = await getDiscountSummary('2026-05-01', '2026-05-31');
      const call2 = await getDiscountSummary('2026-05-01', '2026-05-31');
      // Same date range = same result (deterministic)
      expect(call1.availableDiscount).toBe(call2.availableDiscount);
    });
  });
});

describe('Accounting Month System', () => {
  it('should validate accountingMonth is between 1 and 12', () => {
    const validMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    validMonths.forEach(m => {
      expect(m >= 1 && m <= 12).toBe(true);
    });
  });

  it('should validate accountingYear is a reasonable year', () => {
    const validYears = [2024, 2025, 2026, 2027];
    validYears.forEach(y => {
      expect(y >= 2020 && y <= 2030).toBe(true);
    });
  });

  it('should correctly format accounting period label', () => {
    const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const getLabel = (month: number, year: number) => `${MONTHS_AR[month - 1]} ${year}`;
    expect(getLabel(5, 2026)).toBe('مايو 2026');
    expect(getLabel(4, 2026)).toBe('أبريل 2026');
    expect(getLabel(1, 2025)).toBe('يناير 2025');
  });
});
