import { describe, it, expect } from 'vitest';
import { getDiscountTierInfo } from './db';

describe('getDiscountTierInfo - شرائح الخصم', () => {
  it('أقل من 1M → 1%', () => {
    expect(getDiscountTierInfo(0)).toMatchObject({ discountPct: 1, tierLabel: 'أقل من 1M' });
    expect(getDiscountTierInfo(500_000)).toMatchObject({ discountPct: 1 });
    expect(getDiscountTierInfo(999_999)).toMatchObject({ discountPct: 1 });
  });

  it('1M إلى 2M → 3%', () => {
    expect(getDiscountTierInfo(1_000_000)).toMatchObject({ discountPct: 3, tierLabel: '1M - 2M' });
    expect(getDiscountTierInfo(1_500_000)).toMatchObject({ discountPct: 3 });
    expect(getDiscountTierInfo(1_999_999)).toMatchObject({ discountPct: 3 });
  });

  it('2M إلى 3M → 5%', () => {
    expect(getDiscountTierInfo(2_000_000)).toMatchObject({ discountPct: 5, tierLabel: '2M - 3M' });
    expect(getDiscountTierInfo(2_500_000)).toMatchObject({ discountPct: 5 });
    expect(getDiscountTierInfo(2_999_999)).toMatchObject({ discountPct: 5 });
  });

  it('3M إلى 5M → 7%', () => {
    expect(getDiscountTierInfo(3_000_000)).toMatchObject({ discountPct: 7, tierLabel: '3M - 5M' });
    expect(getDiscountTierInfo(4_000_000)).toMatchObject({ discountPct: 7 });
    expect(getDiscountTierInfo(4_999_999)).toMatchObject({ discountPct: 7 });
  });

  it('أكثر من 5M → 10%', () => {
    expect(getDiscountTierInfo(5_000_000)).toMatchObject({ discountPct: 10, tierLabel: 'أكثر من 5M' });
    expect(getDiscountTierInfo(10_000_000)).toMatchObject({ discountPct: 10 });
  });
});

describe('حساب Allowed Discount', () => {
  it('Total Volume 500k → Allowed = 5,000 (1%)', () => {
    const { discountPct } = getDiscountTierInfo(500_000);
    expect(500_000 * (discountPct / 100)).toBe(5_000);
  });

  it('Total Volume 1.5M → Allowed = 45,000 (3%)', () => {
    const { discountPct } = getDiscountTierInfo(1_500_000);
    expect(1_500_000 * (discountPct / 100)).toBe(45_000);
  });

  it('Total Volume 2.5M → Allowed = 125,000 (5%)', () => {
    const { discountPct } = getDiscountTierInfo(2_500_000);
    expect(2_500_000 * (discountPct / 100)).toBe(125_000);
  });

  it('Total Volume 4M → Allowed = 280,000 (7%)', () => {
    const { discountPct } = getDiscountTierInfo(4_000_000);
    expect(4_000_000 * (discountPct / 100)).toBe(280_000);
  });

  it('Total Volume 6M → Allowed = 600,000 (10%)', () => {
    const { discountPct } = getDiscountTierInfo(6_000_000);
    expect(6_000_000 * (discountPct / 100)).toBe(600_000);
  });
});

describe('حساب Remaining Discount', () => {
  it('Remaining = Allowed - Used', () => {
    const totalVolume = 2_000_000;
    const { discountPct } = getDiscountTierInfo(totalVolume);
    const allowed = totalVolume * (discountPct / 100);
    const used = 30_000;
    const remaining = Math.max(0, allowed - used);
    expect(remaining).toBe(allowed - used);
  });

  it('Remaining لا يقل عن صفر', () => {
    const totalVolume = 1_000_000;
    const { discountPct } = getDiscountTierInfo(totalVolume);
    const allowed = totalVolume * (discountPct / 100);
    const used = allowed + 10_000; // تجاوز الحد
    const remaining = Math.max(0, allowed - used);
    expect(remaining).toBe(0);
  });
});

describe('التحقق من تجاوز الحد', () => {
  it('خصم أقل من المتبقي → مسموح', () => {
    const remaining = 50_000;
    const requestedDiscount = 30_000;
    expect(requestedDiscount <= remaining).toBe(true);
  });

  it('خصم مساوٍ للمتبقي → مسموح', () => {
    const remaining = 50_000;
    const requestedDiscount = 50_000;
    expect(requestedDiscount <= remaining).toBe(true);
  });

  it('خصم أكبر من المتبقي → مرفوض', () => {
    const remaining = 50_000;
    const requestedDiscount = 60_000;
    expect(requestedDiscount > remaining).toBe(true);
  });
});

describe('حساب Total Volume = Actual Sales + Pipeline', () => {
  it('Total Volume يساوي مجموع المبيعات الفعلية والـ Pipeline', () => {
    const actualSales = 1_200_000;
    const pipeline = 800_000;
    const totalVolume = actualSales + pipeline;
    expect(totalVolume).toBe(2_000_000);
  });

  it('الشريحة تتحدد بناءً على Total Volume لا Actual Sales فقط', () => {
    const actualSales = 500_000; // شريحة 1 لو حسبناها لوحدها
    const pipeline = 700_000;
    const totalVolume = actualSales + pipeline; // 1.2M → شريحة 2
    const { discountPct } = getDiscountTierInfo(totalVolume);
    expect(discountPct).toBe(3); // شريحة 2 (1M-2M)
  });
});
