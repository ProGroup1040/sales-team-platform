import { describe, it, expect } from 'vitest';

// ─── استيراد منطق الـ Composite Score مباشرة ─────────────────────────────────
// نختبر المنطق الأساسي بدون قاعدة بيانات

const PERFORMANCE_DISCOUNT_TIERS = [
  { pct: 1,  minScore: 20, minSalesAchievement: 20, minPipelineRatio: 0.5,  label: 'شريحة 1%',  description: 'تحقيق 20% من الهدف + Pipeline لا يقل عن 50% من الهدف' },
  { pct: 3,  minScore: 40, minSalesAchievement: 40, minPipelineRatio: 1.0,  label: 'شريحة 3%',  description: 'تحقيق 40% من الهدف + Pipeline لا يقل عن 100% من الهدف' },
  { pct: 5,  minScore: 55, minSalesAchievement: 60, minPipelineRatio: 1.5,  label: 'شريحة 5%',  description: 'تحقيق 60% من الهدف + Pipeline لا يقل عن 150% من الهدف' },
  { pct: 7,  minScore: 70, minSalesAchievement: 80, minPipelineRatio: 2.0,  label: 'شريحة 7%',  description: 'تحقيق 80% من الهدف + Pipeline لا يقل عن 200% من الهدف' },
  { pct: 10, minScore: 85, minSalesAchievement: 100, minPipelineRatio: 2.5, label: 'شريحة 10%', description: 'تحقيق 100% من الهدف + Pipeline قوي لا يقل عن 250%' },
];

function calcCompositeDiscountScore(params: {
  actualSales: number;
  targetAmount: number;
  pipelineValue: number;
  closingRatePct: number;
  kpiScore: number;
}) {
  const { actualSales, targetAmount, pipelineValue, closingRatePct, kpiScore } = params;

  // 1. نسبة تحقيق المبيعات الفعلية (0-100%)
  const salesAchievementPct = targetAmount > 0 ? Math.min(100, (actualSales / targetAmount) * 100) : 0;

  // 2. قوة الـ Pipeline (نسبة Pipeline إلى الهدف)
  const pipelineRatio = targetAmount > 0 ? pipelineValue / targetAmount : 0;
  const pipelineScore = Math.min(100, pipelineRatio * 50); // 200% pipeline = 100 score

  // 3. Company Closing Rate (0-100%)
  const closingScore = Math.min(100, closingRatePct);

  // 4. KPI التشغيلي (0-100%)
  const kpiComponent = Math.min(100, kpiScore);

  // ─── Composite Score ───────────────────────────────────────────────────────
  const salesScore = salesAchievementPct * 0.40;  // 40%
  const pipelineComponent = pipelineScore * 0.30;  // 30%
  const closingComponent = closingScore * 0.20;    // 20%
  const kpiComponentWeighted = kpiComponent * 0.10; // 10%

  const compositeScore = Math.round(salesScore + pipelineComponent + closingComponent + kpiComponentWeighted);

  // ─── Tier Breakdown ────────────────────────────────────────────────────────
  const tierBreakdown = PERFORMANCE_DISCOUNT_TIERS.map(tier => {
    const scoreMet = compositeScore >= tier.minScore;
    const salesMet = salesAchievementPct >= tier.minSalesAchievement;
    const pipelineMet = pipelineRatio >= tier.minPipelineRatio;
    const isActive = scoreMet && salesMet && pipelineMet;
    const isLocked = !isActive;

    let lockReason: string | null = null;
    if (!salesMet) {
      lockReason = `تحقيق المبيعات الفعلية ${salesAchievementPct.toFixed(0)}% أقل من المطلوب ${tier.minSalesAchievement}%`;
    } else if (!pipelineMet) {
      lockReason = `Pipeline ${(pipelineRatio * 100).toFixed(0)}% من الهدف أقل من المطلوب ${tier.minPipelineRatio * 100}%`;
    } else if (!scoreMet) {
      lockReason = `Composite Score ${compositeScore} أقل من المطلوب ${tier.minScore}`;
    }

    return {
      pct: tier.pct,
      label: tier.label,
      description: tier.description,
      isActive,
      isLocked,
      lockReason,
      requirements: {
        minScore: tier.minScore,
        currentScore: compositeScore,
        scoreMet,
        minSalesAchievement: tier.minSalesAchievement,
        currentSalesAchievement: salesAchievementPct,
        salesMet,
        minPipelineRatio: tier.minPipelineRatio,
        currentPipelineRatio: pipelineRatio,
        pipelineMet,
      },
    };
  });

  // أعلى شريحة مفعّلة
  const activeTiers = tierBreakdown.filter(t => t.isActive);
  const activeTier = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1] : null;
  const activeDiscountPct = activeTier?.pct ?? 0;

  return {
    compositeScore,
    salesAchievementPct,
    pipelineRatio,
    closingRatePct,
    kpiScore,
    salesScore,
    pipelineScore: pipelineComponent,
    closingScore: closingComponent,
    kpiComponent: kpiComponentWeighted,
    activeTier: activeTier?.label ?? null,
    activeDiscountPct,
    tierBreakdown,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Performance-Based Discount Score', () => {

  describe('قاعدة الأمان: Pipeline وحده لا يفتح شريحة عالية', () => {
    it('Pipeline كبير + مبيعات فعلية ضعيفة → لا توجد شريحة مفعّلة', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 1_000_000,     // مبيعات فعلية ضعيفة
        targetAmount: 10_000_000,   // هدف كبير → 10% تحقيق فقط
        pipelineValue: 6_000_000,   // Pipeline كبير (60% من الهدف)
        closingRatePct: 67,
        kpiScore: 50,
      });

      // المشكلة الأصلية: كان يفتح 10% بسبب Pipeline
      expect(result.activeDiscountPct).toBe(0);
      expect(result.activeTier).toBeNull();
      expect(result.salesAchievementPct).toBe(10); // 10% فقط
    });

    it('Pipeline = 6M + مبيعات = 1M → جميع الشرائح مقفلة بسبب ضعف المبيعات', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 1_000_000,
        targetAmount: 10_000_000,
        pipelineValue: 6_000_000,
        closingRatePct: 70,
        kpiScore: 80,
      });

      result.tierBreakdown.forEach(tier => {
        expect(tier.isActive).toBe(false);
        expect(tier.isLocked).toBe(true);
        expect(tier.lockReason).toContain('تحقيق المبيعات الفعلية');
      });
    });
  });

  describe('شرط Gate: لا خصم بدون تحقيق فعلي', () => {
    it('مبيعات = 0 → جميع الشرائح مقفلة', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 0,
        targetAmount: 5_000_000,
        pipelineValue: 20_000_000, // Pipeline ضخم جداً
        closingRatePct: 90,
        kpiScore: 100,
      });

      expect(result.activeDiscountPct).toBe(0);
      expect(result.salesAchievementPct).toBe(0);
      result.tierBreakdown.forEach(tier => {
        expect(tier.isActive).toBe(false);
        expect(tier.lockReason).toContain('تحقيق المبيعات الفعلية');
      });
    });

    it('مبيعات = 15% من الهدف → جميع الشرائح مقفلة (أقل من 20%)', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 750_000,
        targetAmount: 5_000_000,
        pipelineValue: 10_000_000,
        closingRatePct: 60,
        kpiScore: 70,
      });

      expect(result.activeDiscountPct).toBe(0);
      expect(result.salesAchievementPct).toBeCloseTo(15, 0);
    });
  });

  describe('تفعيل الشرائح بشروط صحيحة', () => {
    it('مبيعات 25% + Pipeline 60% → شريحة 1% مفعّلة', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 1_250_000,
        targetAmount: 5_000_000,
        pipelineValue: 3_000_000, // 60% من الهدف
        closingRatePct: 60,
        kpiScore: 60,
      });

      expect(result.salesAchievementPct).toBeCloseTo(25, 0);
      expect(result.activeDiscountPct).toBeGreaterThanOrEqual(1);
    });

    it('مبيعات 100% + Pipeline قوي → شريحة 10% مفعّلة', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 5_000_000,
        targetAmount: 5_000_000,
        pipelineValue: 15_000_000, // 300% من الهدف
        closingRatePct: 80,
        kpiScore: 90,
      });

      expect(result.salesAchievementPct).toBe(100);
      expect(result.activeDiscountPct).toBe(10);
      expect(result.activeTier).toBe('شريحة 10%');
    });

    it('مبيعات 60% + Pipeline 150% → شريحة 5% مفعّلة', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 3_000_000,
        targetAmount: 5_000_000,
        pipelineValue: 7_500_000, // 150% من الهدف
        closingRatePct: 70,
        kpiScore: 75,
      });

      expect(result.salesAchievementPct).toBeCloseTo(60, 0);
      expect(result.activeDiscountPct).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Composite Score الصحيح', () => {
    it('يحسب الـ Score بشكل صحيح: 40% مبيعات + 30% pipeline + 20% closing + 10% KPI', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 5_000_000,
        targetAmount: 5_000_000,  // 100% تحقيق
        pipelineValue: 10_000_000, // 200% من الهدف → pipelineScore = 100
        closingRatePct: 100,
        kpiScore: 100,
      });

      // salesScore = 100 * 0.4 = 40
      // pipelineScore = min(100, 200*50/100) = 100 * 0.3 = 30
      // closingScore = 100 * 0.2 = 20
      // kpiComponent = 100 * 0.1 = 10
      // total = 100
      expect(result.compositeScore).toBe(100);
    });

    it('يحسب الـ Score بشكل صحيح لأداء متوسط', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 2_500_000,
        targetAmount: 5_000_000,  // 50% تحقيق
        pipelineValue: 5_000_000, // 100% من الهدف → pipelineRatio=1 → pipelineScore=50
        closingRatePct: 60,
        kpiScore: 70,
      });

      // salesScore = 50 * 0.4 = 20
      // pipelineScore = min(100, 1*50) = 50 * 0.3 = 15
      // closingScore = 60 * 0.2 = 12
      // kpiComponent = 70 * 0.1 = 7
      // total = 54
      expect(result.compositeScore).toBe(54);
    });
  });

  describe('سبب الرفض واضح', () => {
    it('يُظهر سبب الرفض بسبب ضعف المبيعات', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 500_000,
        targetAmount: 5_000_000,
        pipelineValue: 8_000_000,
        closingRatePct: 70,
        kpiScore: 80,
      });

      const tier1 = result.tierBreakdown.find(t => t.pct === 1);
      expect(tier1?.lockReason).toContain('تحقيق المبيعات الفعلية');
      expect(tier1?.lockReason).toContain('10%');
      expect(tier1?.lockReason).toContain('20%');
    });

    it('يُظهر سبب الرفض بسبب ضعف Pipeline', () => {
      const result = calcCompositeDiscountScore({
        actualSales: 3_000_000,
        targetAmount: 5_000_000, // 60% تحقيق
        pipelineValue: 1_000_000, // 20% فقط من الهدف - أقل من 50%
        closingRatePct: 70,
        kpiScore: 80,
      });

      const tier1 = result.tierBreakdown.find(t => t.pct === 1);
      // المبيعات 60% ≥ 20% (met) لكن pipeline 20% < 50% (not met)
      expect(tier1?.requirements.salesMet).toBe(true);
      expect(tier1?.requirements.pipelineMet).toBe(false);
      expect(tier1?.lockReason).toContain('Pipeline');
    });
  });

  describe('التأثير على المهندسين: الخصم المسموح = actualSales × discountPct', () => {
    it('الخصم المسموح يُحسب على المبيعات الفعلية وليس totalVolume', () => {
      const actualSales = 3_000_000;
      const pipelineValue = 10_000_000;
      const targetAmount = 5_000_000;

      const result = calcCompositeDiscountScore({
        actualSales,
        targetAmount,
        pipelineValue,
        closingRatePct: 70,
        kpiScore: 80,
      });

      // الخصم المسموح يجب أن يكون على المبيعات الفعلية فقط
      const allowedDiscount = actualSales * (result.activeDiscountPct / 100);
      const wrongAllowedDiscount = (actualSales + pipelineValue) * (result.activeDiscountPct / 100);

      // الطريقة الصحيحة أصغر بكثير من الطريقة الخاطئة القديمة
      if (result.activeDiscountPct > 0) {
        expect(allowedDiscount).toBeLessThan(wrongAllowedDiscount);
      }
    });
  });
});
