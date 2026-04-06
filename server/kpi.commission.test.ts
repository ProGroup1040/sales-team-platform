import { describe, it, expect } from 'vitest';

// ─── Commission Tiers Logic ────────────────────────────────────────────────────
function calcCommissionPct(totalDealValue: number): number {
  if (totalDealValue >= 2_000_000) {
    const extraSlabs = Math.floor((totalDealValue - 2_000_000) / 250_000);
    return 2 + extraSlabs * 0.25;
  } else if (totalDealValue >= 1_750_000) return 1.75;
  else if (totalDealValue >= 1_500_000) return 1.5;
  else if (totalDealValue >= 1_250_000) return 1.25;
  else if (totalDealValue >= 1_000_000) return 1.0;
  else return 0;
}

// ─── Incentive Tiers Logic ─────────────────────────────────────────────────────
function calcIncentiveAmount(totalDealValue: number): number {
  if (totalDealValue >= 2_000_000)      return 10_000;
  if (totalDealValue >= 1_750_000)      return 8_750;
  if (totalDealValue >= 1_500_000)      return 7_500;
  if (totalDealValue >= 1_250_000)      return 6_500;
  if (totalDealValue >= 1_000_000)      return 5_000;
  if (totalDealValue >= 500_000)        return 2_500;
  return 0;
}

// ─── KPI Rules Logic ───────────────────────────────────────────────────────────
function calcKpiRules(kpiScore: number) {
  if (kpiScore >= 90) return { kpiStatus: 'available', commissionMultiplier: 1.0, incentiveStatus: 'available', commissionStatus: 'full' };
  if (kpiScore >= 75) return { kpiStatus: 'available', commissionMultiplier: 1.0, incentiveStatus: 'available', commissionStatus: 'full' };
  if (kpiScore >= 60) return { kpiStatus: 'available', commissionMultiplier: 1.0, incentiveStatus: 'blocked', commissionStatus: 'full' };
  return { kpiStatus: 'blocked', commissionMultiplier: 0.5, incentiveStatus: 'blocked', commissionStatus: 'partial' };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Commission Tiers', () => {
  it('أقل من 1M → لا كوميشن', () => {
    expect(calcCommissionPct(800_000)).toBe(0);
    expect(calcCommissionPct(0)).toBe(0);
    expect(calcCommissionPct(999_999)).toBe(0);
  });

  it('1M → 1.25M = 1%', () => {
    expect(calcCommissionPct(1_000_000)).toBe(1.0);
    expect(calcCommissionPct(1_100_000)).toBe(1.0);
    expect(calcCommissionPct(1_249_999)).toBe(1.0);
  });

  it('1.25M → 1.5M = 1.25%', () => {
    expect(calcCommissionPct(1_250_000)).toBe(1.25);
    expect(calcCommissionPct(1_400_000)).toBe(1.25);
  });

  it('1.5M → 1.75M = 1.5%', () => {
    expect(calcCommissionPct(1_500_000)).toBe(1.5);
    expect(calcCommissionPct(1_600_000)).toBe(1.5);
  });

  it('1.75M → 2M = 1.75%', () => {
    expect(calcCommissionPct(1_750_000)).toBe(1.75);
    expect(calcCommissionPct(1_900_000)).toBe(1.75);
  });

  it('2M = 2%', () => {
    expect(calcCommissionPct(2_000_000)).toBe(2);
  });

  it('2.25M = 2.25% (+0.25% لكل 250K)', () => {
    expect(calcCommissionPct(2_250_000)).toBe(2.25);
  });

  it('2.5M = 2.5%', () => {
    expect(calcCommissionPct(2_500_000)).toBe(2.5);
  });
});

describe('Incentive Tiers', () => {
  it('أقل من 500K → لا حافز', () => {
    expect(calcIncentiveAmount(0)).toBe(0);
    expect(calcIncentiveAmount(499_999)).toBe(0);
  });

  it('500K = 2,500', () => {
    expect(calcIncentiveAmount(500_000)).toBe(2_500);
    expect(calcIncentiveAmount(999_999)).toBe(2_500);
  });

  it('1M = 5,000', () => {
    expect(calcIncentiveAmount(1_000_000)).toBe(5_000);
    expect(calcIncentiveAmount(1_249_999)).toBe(5_000);
  });

  it('1.25M = 6,500', () => {
    expect(calcIncentiveAmount(1_250_000)).toBe(6_500);
  });

  it('1.5M = 7,500', () => {
    expect(calcIncentiveAmount(1_500_000)).toBe(7_500);
  });

  it('1.75M = 8,750', () => {
    expect(calcIncentiveAmount(1_750_000)).toBe(8_750);
  });

  it('2M+ = 10,000', () => {
    expect(calcIncentiveAmount(2_000_000)).toBe(10_000);
    expect(calcIncentiveAmount(5_000_000)).toBe(10_000);
  });
});

describe('KPI Rules', () => {
  it('KPI < 60% → محجوب + 50% كوميشن + لا حافز', () => {
    const r = calcKpiRules(55);
    expect(r.kpiStatus).toBe('blocked');
    expect(r.commissionMultiplier).toBe(0.5);
    expect(r.incentiveStatus).toBe('blocked');
    expect(r.commissionStatus).toBe('partial');
  });

  it('KPI 60% → 75% → KPI متاح + كوميشن كامل + لا حافز', () => {
    const r = calcKpiRules(65);
    expect(r.kpiStatus).toBe('available');
    expect(r.commissionMultiplier).toBe(1.0);
    expect(r.incentiveStatus).toBe('blocked');
    expect(r.commissionStatus).toBe('full');
  });

  it('KPI 75% → 90% → KPI + كوميشن + حافز', () => {
    const r = calcKpiRules(80);
    expect(r.kpiStatus).toBe('available');
    expect(r.commissionMultiplier).toBe(1.0);
    expect(r.incentiveStatus).toBe('available');
    expect(r.commissionStatus).toBe('full');
  });

  it('KPI ≥ 90% → كل المستحقات كاملة', () => {
    const r = calcKpiRules(95);
    expect(r.kpiStatus).toBe('available');
    expect(r.commissionMultiplier).toBe(1.0);
    expect(r.incentiveStatus).toBe('available');
    expect(r.commissionStatus).toBe('full');
  });

  it('حدود الشرائح: KPI = 60 يدخل شريحة 60-75', () => {
    const r = calcKpiRules(60);
    expect(r.kpiStatus).toBe('available');
    expect(r.incentiveStatus).toBe('blocked');
  });

  it('حدود الشرائح: KPI = 75 يدخل شريحة 75-90', () => {
    const r = calcKpiRules(75);
    expect(r.incentiveStatus).toBe('available');
  });

  it('حدود الشرائح: KPI = 90 يدخل شريحة ≥90', () => {
    const r = calcKpiRules(90);
    expect(r.kpiStatus).toBe('available');
    expect(r.incentiveStatus).toBe('available');
  });
});

describe('Total Payout Calculation', () => {
  it('مهندس بـ KPI 80% ومبيعات 1.5M', () => {
    const sales = 1_500_000;
    const kpi = 80;
    const commPct = calcCommissionPct(sales);
    const incentive = calcIncentiveAmount(sales);
    const rules = calcKpiRules(kpi);
    const commission = Math.round(sales * (commPct * rules.commissionMultiplier / 100));
    const incentiveValue = rules.incentiveStatus === 'available' ? incentive : 0;
    expect(commPct).toBe(1.5);
    expect(incentive).toBe(7_500);
    expect(commission).toBe(22_500);
    expect(incentiveValue).toBe(7_500);
    expect(commission + incentiveValue).toBe(30_000);
  });

  it('مهندس بـ KPI 50% ومبيعات 1.5M → 50% كوميشن فقط', () => {
    const sales = 1_500_000;
    const kpi = 50;
    const commPct = calcCommissionPct(sales);
    const rules = calcKpiRules(kpi);
    const commission = Math.round(sales * (commPct * rules.commissionMultiplier / 100));
    const incentiveValue = rules.incentiveStatus === 'available' ? calcIncentiveAmount(sales) : 0;
    expect(commission).toBe(11_250); // 1.5% × 50% = 0.75%
    expect(incentiveValue).toBe(0);
  });
});
