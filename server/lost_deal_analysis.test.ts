import { describe, it, expect } from 'vitest';
import { LOST_REASON_LABELS } from './db';

// ─── اختبارات LOST_REASON_LABELS ─────────────────────────────────────────────

describe('LOST_REASON_LABELS - تسميات أسباب الخسارة', () => {
  it('يجب أن يحتوي على جميع الأسباب السبعة', () => {
    const keys = Object.keys(LOST_REASON_LABELS);
    expect(keys).toHaveLength(7);
    expect(keys).toContain('price_high');
    expect(keys).toContain('competitor');
    expect(keys).toContain('slow_response');
    expect(keys).toContain('wrong_product');
    expect(keys).toContain('not_serious');
    expect(keys).toContain('budget_cut');
    expect(keys).toContain('other');
  });

  it('price_high → سعر أعلى من المنافس', () => {
    expect(LOST_REASON_LABELS['price_high']).toBe('سعر أعلى من المنافس');
  });

  it('competitor → ذهب للمنافس', () => {
    expect(LOST_REASON_LABELS['competitor']).toBe('ذهب للمنافس');
  });

  it('slow_response → تأخير في الاستجابة', () => {
    expect(LOST_REASON_LABELS['slow_response']).toBe('تأخير في الاستجابة');
  });

  it('wrong_product → منتج غير مناسب', () => {
    expect(LOST_REASON_LABELS['wrong_product']).toBe('منتج غير مناسب');
  });

  it('not_serious → عميل غير جاد', () => {
    expect(LOST_REASON_LABELS['not_serious']).toBe('عميل غير جاد');
  });

  it('budget_cut → تخفيض الميزانية', () => {
    expect(LOST_REASON_LABELS['budget_cut']).toBe('تخفيض الميزانية');
  });

  it('other → أسباب أخرى', () => {
    expect(LOST_REASON_LABELS['other']).toBe('أسباب أخرى');
  });

  it('جميع القيم يجب أن تكون نصوص غير فارغة', () => {
    for (const [key, label] of Object.entries(LOST_REASON_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ─── اختبارات منطق توزيع الأسباب ─────────────────────────────────────────────

describe('منطق توزيع أسباب الخسارة', () => {
  // محاكاة منطق reasonBreakdown من getLostDealsAnalysis
  function calcReasonBreakdown(deals: Array<{ lostReason?: string; value: number }>) {
    const reasonCounts: Record<string, number> = {};
    const reasonValues: Record<string, number> = {};
    const totalLost = deals.length;

    for (const deal of deals) {
      const reason = deal.lostReason || 'other';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      reasonValues[reason] = (reasonValues[reason] || 0) + deal.value;
    }

    return Object.entries(reasonCounts).map(([reason, count]) => ({
      reason,
      label: LOST_REASON_LABELS[reason] || reason,
      count,
      value: reasonValues[reason] || 0,
      percent: totalLost > 0 ? Math.round((count / totalLost) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }

  it('صفقة واحدة بسبب price_high → 100%', () => {
    const deals = [{ lostReason: 'price_high', value: 500_000 }];
    const breakdown = calcReasonBreakdown(deals);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].reason).toBe('price_high');
    expect(breakdown[0].count).toBe(1);
    expect(breakdown[0].percent).toBe(100);
    expect(breakdown[0].value).toBe(500_000);
  });

  it('صفقتان بنفس السبب → 100%', () => {
    const deals = [
      { lostReason: 'competitor', value: 300_000 },
      { lostReason: 'competitor', value: 200_000 },
    ];
    const breakdown = calcReasonBreakdown(deals);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].count).toBe(2);
    expect(breakdown[0].percent).toBe(100);
    expect(breakdown[0].value).toBe(500_000);
  });

  it('4 صفقات: 2 price_high + 1 competitor + 1 other → ترتيب صحيح', () => {
    const deals = [
      { lostReason: 'price_high', value: 100_000 },
      { lostReason: 'price_high', value: 200_000 },
      { lostReason: 'competitor', value: 150_000 },
      { lostReason: 'other', value: 50_000 },
    ];
    const breakdown = calcReasonBreakdown(deals);
    expect(breakdown[0].reason).toBe('price_high');
    expect(breakdown[0].count).toBe(2);
    expect(breakdown[0].percent).toBe(50);
    expect(breakdown[1].count).toBe(1);
    expect(breakdown[2].count).toBe(1);
  });

  it('صفقة بدون lostReason تُحسب كـ other', () => {
    const deals = [
      { value: 100_000 }, // بدون lostReason
      { lostReason: 'price_high', value: 200_000 },
    ];
    const breakdown = calcReasonBreakdown(deals);
    const otherItem = breakdown.find(b => b.reason === 'other');
    expect(otherItem).toBeDefined();
    expect(otherItem?.count).toBe(1);
  });

  it('قائمة فارغة → نتيجة فارغة', () => {
    const breakdown = calcReasonBreakdown([]);
    expect(breakdown).toHaveLength(0);
  });

  it('النسب المئوية تُجمع إلى 100% تقريباً (مع تقريب)', () => {
    const deals = [
      { lostReason: 'price_high', value: 100_000 },
      { lostReason: 'competitor', value: 100_000 },
      { lostReason: 'slow_response', value: 100_000 },
    ];
    const breakdown = calcReasonBreakdown(deals);
    const totalPct = breakdown.reduce((s, b) => s + b.percent, 0);
    // مع تقريب Math.round قد يكون 99 أو 100 أو 101
    expect(totalPct).toBeGreaterThanOrEqual(99);
    expect(totalPct).toBeLessThanOrEqual(101);
  });
});

// ─── اختبارات منطق توزيع المهندسين ───────────────────────────────────────────

describe('منطق توزيع الصفقات الخاسرة لكل مهندس', () => {
  function calcEngineerBreakdown(
    engineers: Array<{ id: number; name: string }>,
    deals: Array<{ engineerId: number; lostReason?: string; value: number }>
  ) {
    return engineers.map(eng => {
      const engLost = deals.filter(d => d.engineerId === eng.id);
      const reasonMap: Record<string, number> = {};
      for (const d of engLost) {
        const r = d.lostReason || 'other';
        reasonMap[r] = (reasonMap[r] || 0) + 1;
      }
      const topReasonEntry = Object.entries(reasonMap).sort((a, b) => b[1] - a[1])[0];
      return {
        engineerId: eng.id,
        engineerName: eng.name,
        totalLost: engLost.length,
        totalLostValue: engLost.reduce((s, d) => s + d.value, 0),
        topReason: topReasonEntry?.[0] || null,
        topReasonLabel: topReasonEntry ? (LOST_REASON_LABELS[topReasonEntry[0]] || null) : null,
      };
    }).filter(e => e.totalLost > 0).sort((a, b) => b.totalLost - a.totalLost);
  }

  it('مهندس واحد بصفقتين خاسرتين', () => {
    const engineers = [{ id: 1, name: 'أحمد' }];
    const deals = [
      { engineerId: 1, lostReason: 'price_high', value: 100_000 },
      { engineerId: 1, lostReason: 'competitor', value: 200_000 },
    ];
    const result = calcEngineerBreakdown(engineers, deals);
    expect(result).toHaveLength(1);
    expect(result[0].totalLost).toBe(2);
    expect(result[0].totalLostValue).toBe(300_000);
  });

  it('مهندسان: الأكثر خسارة يظهر أولاً', () => {
    const engineers = [
      { id: 1, name: 'أحمد' },
      { id: 2, name: 'محمد' },
    ];
    const deals = [
      { engineerId: 1, lostReason: 'price_high', value: 100_000 },
      { engineerId: 2, lostReason: 'competitor', value: 200_000 },
      { engineerId: 2, lostReason: 'other', value: 150_000 },
      { engineerId: 2, lostReason: 'slow_response', value: 50_000 },
    ];
    const result = calcEngineerBreakdown(engineers, deals);
    expect(result[0].engineerName).toBe('محمد');
    expect(result[0].totalLost).toBe(3);
    expect(result[1].engineerName).toBe('أحمد');
    expect(result[1].totalLost).toBe(1);
  });

  it('مهندس بدون صفقات خاسرة لا يظهر في النتائج', () => {
    const engineers = [
      { id: 1, name: 'أحمد' },
      { id: 2, name: 'محمد' },
    ];
    const deals = [
      { engineerId: 1, lostReason: 'price_high', value: 100_000 },
    ];
    const result = calcEngineerBreakdown(engineers, deals);
    expect(result).toHaveLength(1);
    expect(result[0].engineerName).toBe('أحمد');
  });

  it('topReason يعكس السبب الأكثر تكراراً للمهندس', () => {
    const engineers = [{ id: 1, name: 'أحمد' }];
    const deals = [
      { engineerId: 1, lostReason: 'price_high', value: 100_000 },
      { engineerId: 1, lostReason: 'price_high', value: 100_000 },
      { engineerId: 1, lostReason: 'competitor', value: 100_000 },
    ];
    const result = calcEngineerBreakdown(engineers, deals);
    expect(result[0].topReason).toBe('price_high');
    expect(result[0].topReasonLabel).toBe('سعر أعلى من المنافس');
  });

  it('قائمة فارغة من الصفقات → لا مهندسين في النتائج', () => {
    const engineers = [{ id: 1, name: 'أحمد' }];
    const result = calcEngineerBreakdown(engineers, []);
    expect(result).toHaveLength(0);
  });
});

// ─── اختبارات حسابات الإجماليات ───────────────────────────────────────────────

describe('حسابات إجماليات الصفقات الخاسرة', () => {
  it('إجمالي القيمة = مجموع قيم جميع الصفقات الخاسرة', () => {
    const deals = [
      { value: 100_000 },
      { value: 250_000 },
      { value: 75_000 },
    ];
    const totalLostValue = deals.reduce((s, d) => s + d.value, 0);
    expect(totalLostValue).toBe(425_000);
  });

  it('إجمالي الصفقات الخاسرة = عدد الصفقات', () => {
    const deals = [
      { lostReason: 'price_high', value: 100_000 },
      { lostReason: 'competitor', value: 200_000 },
      { lostReason: 'other', value: 50_000 },
    ];
    expect(deals.length).toBe(3);
  });

  it('topReason هو الأكثر تكراراً في reasonBreakdown', () => {
    const reasonBreakdown = [
      { reason: 'price_high', count: 5, percent: 50 },
      { reason: 'competitor', count: 3, percent: 30 },
      { reason: 'other', count: 2, percent: 20 },
    ].sort((a, b) => b.count - a.count);

    expect(reasonBreakdown[0].reason).toBe('price_high');
    expect(reasonBreakdown[0].count).toBe(5);
  });
});
