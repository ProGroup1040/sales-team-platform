/**
 * Vitest Tests for DateRangePicker System
 * يختبر: dateFilterToParams, getCurrentMonthFilter, getCollectionPeriodAnalysis
 */
import { describe, it, expect } from 'vitest';
import {
  dateFilterToParams,
  getCurrentMonthFilter,
  type CustomRangeFilter,
  type MonthYearFilter,
} from '../client/src/components/DateRangePicker';
import { formatLocalDate } from '../shared/dateUtils';

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('DateRangePicker utilities', () => {
  it('getCurrentMonthFilter returns current month/year', () => {
    const filter = getCurrentMonthFilter();
    const now = new Date();
    expect(filter.mode).toBe('month');
    expect(filter.month).toBe(now.getMonth() + 1);
    expect(filter.year).toBe(now.getFullYear());
  });

  it('dateFilterToParams - month mode returns correct params', () => {
    const filter: MonthYearFilter = { mode: 'month', month: 3, year: 2025 };
    const params = dateFilterToParams(filter);
    expect(params.year).toBe(2025);
    expect(params.month).toBe(3);
    expect(params.isCustomRange).toBe(false);
    expect(params.startDate).toBeUndefined();
    expect(params.endDate).toBeUndefined();
  });

  it('dateFilterToParams - custom mode returns correct params', () => {
    const start = new Date(2025, 0, 1); // Jan 1, 2025
    const end = new Date(2025, 0, 31); // Jan 31, 2025
    const filter: CustomRangeFilter = { mode: 'custom', startDate: start, endDate: end };
    const params = dateFilterToParams(filter);
    expect(params.year).toBe(2025);
    expect(params.month).toBe(1);
    expect(params.isCustomRange).toBe(true);
    expect(params.startDate).toBe('2025-01-01');
    expect(params.endDate).toBe('2025-01-31');
  });

  it('dateFilterToParams - custom range spanning multiple months', () => {
    const start = new Date(2025, 2, 15); // Mar 15, 2025
    const end = new Date(2025, 4, 20); // May 20, 2025
    const filter: CustomRangeFilter = { mode: 'custom', startDate: start, endDate: end };
    const params = dateFilterToParams(filter);
    expect(params.year).toBe(2025);
    expect(params.month).toBe(3); // March (start month)
    expect(params.isCustomRange).toBe(true);
    expect(params.startDate).toBe('2025-03-15');
    expect(params.endDate).toBe('2025-05-20');
  });

  it('month filter mode correctly identifies month 12 (December)', () => {
    const filter: MonthYearFilter = { mode: 'month', month: 12, year: 2024 };
    const params = dateFilterToParams(filter);
    expect(params.month).toBe(12);
    expect(params.year).toBe(2024);
    expect(params.isCustomRange).toBe(false);
  });

  it('custom range - today filter (same start and end)', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filter: CustomRangeFilter = { mode: 'custom', startDate: today, endDate: today, label: 'اليوم' };
    const params = dateFilterToParams(filter);
    expect(params.startDate).toBe(params.endDate);
    expect(params.isCustomRange).toBe(true);
  });

  it('last 7 days preset produces correct date range', () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Start = new Date(today);
    last7Start.setDate(today.getDate() - 6);
    const filter: CustomRangeFilter = { mode: 'custom', startDate: last7Start, endDate: today, label: 'آخر 7 أيام' };
    const params = dateFilterToParams(filter);
    expect(params.isCustomRange).toBe(true);
    // Verify 7-day span
    const start = new Date(params.startDate!);
    const end = new Date(params.endDate!);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(6); // 0-indexed: 6 days difference = 7 days total
  });

  it('last month preset produces correct month/year', () => {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const filter: MonthYearFilter = { mode: 'month', month: lastMonth, year: lastMonthYear };
    const params = dateFilterToParams(filter);
    expect(params.month).toBe(lastMonth);
    expect(params.year).toBe(lastMonthYear);
    expect(params.isCustomRange).toBe(false);
  });
});

describe('CollectionsModule period analysis params', () => {
  it('month mode produces correct period start/end', () => {
    const filter: MonthYearFilter = { mode: 'month', month: 5, year: 2025 };
    const periodStart = filter.mode === 'month'
      ? formatLocalDate(new Date(filter.year, filter.month - 1, 1))
      : '';
    const periodEnd = filter.mode === 'month'
      ? formatLocalDate(new Date(filter.year, filter.month, 0))
      : '';
    expect(periodStart).toBe('2025-05-01');
    expect(periodEnd).toBe('2025-05-31');
  });

  it('custom mode produces correct period start/end', () => {
    const start = new Date(2025, 3, 1); // Apr 1
    const end = new Date(2025, 3, 30); // Apr 30
    const filter: CustomRangeFilter = { mode: 'custom', startDate: start, endDate: end };
    const periodStart = filter.mode === 'custom'
      ? formatLocalDate(filter.startDate)
      : '';
    const periodEnd = filter.mode === 'custom'
      ? formatLocalDate(filter.endDate)
      : '';
    expect(periodStart).toBe('2025-04-01');
    expect(periodEnd).toBe('2025-04-30');
  });
});
