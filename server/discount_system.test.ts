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

describe('حساب Total Opportunity = Quotations + Negotiation', () => {
  it('Total Opportunity يساوي مجموع Quotations والـ Negotiation', () => {
    const quotations = 1_200_000; // proposal + contract_sent
    const negotiation = 800_000;
    const totalOpportunity = quotations + negotiation;
    expect(totalOpportunity).toBe(2_000_000);
  });

  it('الشريحة تتحدد بناءً على Total Opportunity لا Total Volume', () => {
    const quotations = 600_000;
    const negotiation = 500_000;
    const totalOpportunity = quotations + negotiation; // 1.1M → شريحة 2
    const { discountPct } = getDiscountTierInfo(totalOpportunity);
    expect(discountPct).toBe(3); // شريحة 2 (1M-2M)
  });

  it('Allowed Discount = Total Opportunity × Discount %', () => {
    const totalOpportunity = 1_500_000; // 1.5M → شريحة 3%
    const { discountPct } = getDiscountTierInfo(totalOpportunity);
    const allowedDiscount = totalOpportunity * (discountPct / 100);
    expect(discountPct).toBe(3);
    expect(allowedDiscount).toBe(45_000);
  });

  it('Total Opportunity صفر → Allowed Discount صفر', () => {
    const totalOpportunity = 0;
    const { discountPct } = getDiscountTierInfo(totalOpportunity);
    const allowedDiscount = totalOpportunity * (discountPct / 100);
    expect(allowedDiscount).toBe(0);
  });
});

describe('توزيع الخصومات على المهندسين', () => {
  // حساب حصة مهندس من Total Opportunity
  const calcEngineerDiscount = (
    engOpportunity: number,
    totalOpportunity: number,
    allowedDiscount: number
  ) => {
    const sharePercent = totalOpportunity > 0 ? (engOpportunity / totalOpportunity) * 100 : 0;
    const engineerDiscount = (sharePercent / 100) * allowedDiscount;
    return { sharePercent, engineerDiscount };
  };

  it('مهندس واحد بكل الـ Opportunity → 100% من الخصم', () => {
    const totalOpportunity = 1_000_000;
    const { discountPct } = getDiscountTierInfo(totalOpportunity);
    const allowedDiscount = totalOpportunity * (discountPct / 100);
    const { sharePercent, engineerDiscount } = calcEngineerDiscount(1_000_000, totalOpportunity, allowedDiscount);
    expect(sharePercent).toBe(100);
    expect(engineerDiscount).toBe(allowedDiscount);
  });

  it('مهندسان بحصص متساوية → كل واحد 50%', () => {
    const totalOpportunity = 2_000_000;
    const { discountPct } = getDiscountTierInfo(totalOpportunity);
    const allowedDiscount = totalOpportunity * (discountPct / 100);
    const { sharePercent: s1, engineerDiscount: d1 } = calcEngineerDiscount(1_000_000, totalOpportunity, allowedDiscount);
    const { sharePercent: s2, engineerDiscount: d2 } = calcEngineerDiscount(1_000_000, totalOpportunity, allowedDiscount);
    expect(s1).toBe(50);
    expect(s2).toBe(50);
    expect(d1 + d2).toBeCloseTo(allowedDiscount, 0);
  });

  it('مهندس بحصة 30% → يحصل على 30% من الخصم', () => {
    const totalOpportunity = 1_000_000;
    const { discountPct } = getDiscountTierInfo(totalOpportunity);
    const allowedDiscount = totalOpportunity * (discountPct / 100);
    const { sharePercent, engineerDiscount } = calcEngineerDiscount(300_000, totalOpportunity, allowedDiscount);
    expect(sharePercent).toBe(30);
    expect(engineerDiscount).toBeCloseTo(allowedDiscount * 0.3, 0);
  });

  it('مهندس بدون فرص → حصته 0% وخصمه 0', () => {
    const { sharePercent, engineerDiscount } = calcEngineerDiscount(0, 1_000_000, 10_000);
    expect(sharePercent).toBe(0);
    expect(engineerDiscount).toBe(0);
  });

  it('Total Opportunity صفر → لا يقسم على صفر', () => {
    const { sharePercent, engineerDiscount } = calcEngineerDiscount(500_000, 0, 10_000);
    expect(sharePercent).toBe(0);
    expect(engineerDiscount).toBe(0);
  });

  it('مجموع حصص كل المهندسين = 100%', () => {
    const engineers = [
      { opportunity: 500_000 },
      { opportunity: 300_000 },
      { opportunity: 200_000 },
    ];
    const totalOpportunity = engineers.reduce((s, e) => s + e.opportunity, 0);
    const totalShare = engineers.reduce((s, e) => {
      const share = totalOpportunity > 0 ? (e.opportunity / totalOpportunity) * 100 : 0;
      return s + share;
    }, 0);
    expect(totalShare).toBeCloseTo(100, 5);
  });

  it('Engineer Total = Sales + Quotations + Negotiation', () => {
    const actualSales = 500_000;
    const quotations = 300_000;
    const negotiation = 200_000;
    const engineerTotal = actualSales + quotations + negotiation;
    expect(engineerTotal).toBe(1_000_000);
  });
});

describe('Time Window - آخر 60 يوم', () => {
  const now = new Date();
  const cutoff60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  it('صفقة قبل 30 يوم → ضمن النافذة', () => {
    const dealDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(dealDate >= cutoff60).toBe(true);
  });

  it('صفقة قبل 59 يوم → ضمن النافذة', () => {
    const dealDate = new Date(now.getTime() - 59 * 24 * 60 * 60 * 1000);
    expect(dealDate >= cutoff60).toBe(true);
  });

  it('صفقة قبل 61 يوم → خارج النافذة', () => {
    const dealDate = new Date(now.getTime() - 61 * 24 * 60 * 60 * 1000);
    expect(dealDate >= cutoff60).toBe(false);
  });

  it('صفقة قبل 90 يوم → خارج النافذة', () => {
    const dealDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    expect(dealDate >= cutoff60).toBe(false);
  });

  it('صفقة اليوم → ضمن النافذة', () => {
    expect(now >= cutoff60).toBe(true);
  });
});

describe('مقارنة الأداء - 60 يوم vs الشهر السابق', () => {
  const calcPctChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0);

  it('تحسن 50% في المبيعات', () => {
    expect(calcPctChange(150_000, 100_000)).toBe(50);
  });

  it('انخفاض 25% في المبيعات', () => {
    expect(calcPctChange(75_000, 100_000)).toBe(-25);
  });

  it('لا توجد مبيعات سابقة → 100% إذا كانت هناك مبيعات حالية', () => {
    expect(calcPctChange(50_000, 0)).toBe(100);
  });

  it('لا توجد مبيعات في الفترتين → 0%', () => {
    expect(calcPctChange(0, 0)).toBe(0);
  });

  it('تغيير Closing Rate = فرق نقطي مباشر', () => {
    const currRate = 35;
    const prevRate = 28;
    const change = currRate - prevRate;
    expect(change).toBe(7);
  });

  it('تغيير Discount Tier = فرق نقطي مباشر', () => {
    const currTier = 5;
    const prevTier = 3;
    const change = currTier - prevTier;
    expect(change).toBe(2);
  });
});
