/**
 * Tests for deal month attribution logic
 * CRITICAL: deals are attributed by closingMonth/closingYear (not createdAt)
 */
import { describe, it, expect } from 'vitest';

// ─── Helper: simulate getDealsStats month filter logic ────────────────────────
function filterDealsByMonth(deals: any[], year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const closedDeals = deals.filter(d => {
    if (!['closed_won', 'closed_lost'].includes(d.stage)) return false;
    if (d.isDeleted) return false;
    // Use closingMonth/closingYear if set
    if (d.closingMonth !== null && d.closingMonth !== undefined) {
      return d.closingMonth === month && d.closingYear === year;
    }
    // Fallback: use closedAt
    if (d.closedAt) {
      return d.closedAt >= startDate && d.closedAt <= endDate;
    }
    return false;
  });

  const pipelineDeals = deals.filter(d => {
    if (['closed_won', 'closed_lost'].includes(d.stage)) return false;
    if (d.isDeleted) return false;
    return d.createdAt >= startDate && d.createdAt <= endDate;
  });

  return { closedDeals, pipelineDeals };
}

// ─── Helper: compute netValue ─────────────────────────────────────────────────
function computeNetValue(grossValue: number, discountValue: number): number {
  return grossValue - discountValue;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Deal Month Attribution', () => {
  it('should attribute closed deal to closingMonth, not createdAt', () => {
    const deals = [
      {
        id: 1,
        stage: 'closed_won',
        isDeleted: 0,
        value: '100000',
        closingMonth: 5,   // May
        closingYear: 2026,
        closedAt: new Date(2026, 4, 15),  // May 15
        createdAt: new Date(2026, 2, 1),  // March 1 (different month!)
      }
    ];

    // Should appear in May 2026
    const { closedDeals: mayDeals } = filterDealsByMonth(deals, 2026, 5);
    expect(mayDeals).toHaveLength(1);

    // Should NOT appear in March 2026
    const { closedDeals: marchDeals } = filterDealsByMonth(deals, 2026, 3);
    expect(marchDeals).toHaveLength(0);
  });

  it('should use closedAt as fallback when closingMonth is null', () => {
    const deals = [
      {
        id: 2,
        stage: 'closed_won',
        isDeleted: 0,
        value: '200000',
        closingMonth: null,
        closingYear: null,
        closedAt: new Date(2026, 3, 20),  // April 20
        createdAt: new Date(2026, 1, 1),  // February 1
      }
    ];

    // Should appear in April 2026 (via closedAt fallback)
    const { closedDeals: aprilDeals } = filterDealsByMonth(deals, 2026, 4);
    expect(aprilDeals).toHaveLength(1);

    // Should NOT appear in February 2026
    const { closedDeals: febDeals } = filterDealsByMonth(deals, 2026, 2);
    expect(febDeals).toHaveLength(0);
  });

  it('should attribute pipeline deals by createdAt', () => {
    const deals = [
      {
        id: 3,
        stage: 'negotiation',
        isDeleted: 0,
        value: '150000',
        closingMonth: null,
        closingYear: null,
        closedAt: null,
        createdAt: new Date(2026, 4, 10),  // May 10
      }
    ];

    // Should appear in May 2026 pipeline
    const { pipelineDeals: mayPipeline } = filterDealsByMonth(deals, 2026, 5);
    expect(mayPipeline).toHaveLength(1);

    // Should NOT appear in April 2026 pipeline
    const { pipelineDeals: aprilPipeline } = filterDealsByMonth(deals, 2026, 4);
    expect(aprilPipeline).toHaveLength(0);
  });

  it('should not show deleted deals', () => {
    const deals = [
      {
        id: 4,
        stage: 'closed_won',
        isDeleted: 1,  // deleted!
        value: '300000',
        closingMonth: 5,
        closingYear: 2026,
        closedAt: new Date(2026, 4, 5),
        createdAt: new Date(2026, 4, 1),
      }
    ];

    const { closedDeals } = filterDealsByMonth(deals, 2026, 5);
    expect(closedDeals).toHaveLength(0);
  });
});

describe('Gross/Net Value Calculation', () => {
  it('should compute netValue = grossValue - discountValue', () => {
    const grossValue = 500000;
    const discountValue = 25000;  // 5%
    const netValue = computeNetValue(grossValue, discountValue);
    expect(netValue).toBe(475000);
  });

  it('should compute discountPercent correctly', () => {
    const grossValue = 1000000;
    const discountValue = 70000;
    const discountPercent = (discountValue / grossValue) * 100;
    expect(discountPercent).toBeCloseTo(7, 1);
  });

  it('should handle zero discount', () => {
    const grossValue = 200000;
    const discountValue = 0;
    const netValue = computeNetValue(grossValue, discountValue);
    expect(netValue).toBe(200000);
  });
});

describe('Monthly Data Independence', () => {
  it('each month should have independent data', () => {
    const allDeals = [
      { id: 1, stage: 'closed_won', isDeleted: 0, value: '100000', closingMonth: 4, closingYear: 2026, closedAt: new Date(2026, 3, 10), createdAt: new Date(2026, 3, 1) },
      { id: 2, stage: 'closed_won', isDeleted: 0, value: '200000', closingMonth: 5, closingYear: 2026, closedAt: new Date(2026, 4, 15), createdAt: new Date(2026, 4, 1) },
      { id: 3, stage: 'closed_won', isDeleted: 0, value: '300000', closingMonth: 6, closingYear: 2026, closedAt: new Date(2026, 5, 20), createdAt: new Date(2026, 5, 1) },
    ];

    const { closedDeals: aprilDeals } = filterDealsByMonth(allDeals, 2026, 4);
    const { closedDeals: mayDeals } = filterDealsByMonth(allDeals, 2026, 5);
    const { closedDeals: juneDeals } = filterDealsByMonth(allDeals, 2026, 6);

    expect(aprilDeals).toHaveLength(1);
    expect(mayDeals).toHaveLength(1);
    expect(juneDeals).toHaveLength(1);

    // Each month has different total
    const aprilTotal = aprilDeals.reduce((s: number, d: any) => s + parseFloat(d.value), 0);
    const mayTotal = mayDeals.reduce((s: number, d: any) => s + parseFloat(d.value), 0);
    const juneTotal = juneDeals.reduce((s: number, d: any) => s + parseFloat(d.value), 0);

    expect(aprilTotal).toBe(100000);
    expect(mayTotal).toBe(200000);
    expect(juneTotal).toBe(300000);
  });
});
