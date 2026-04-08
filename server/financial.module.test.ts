import { describe, it, expect } from "vitest";

// ─── Commission Calculation Logic ───────────────────────────────────────────
function calcProgressiveCommission(totalCollected: number): number {
  if (totalCollected < 1_000_000) return 0;
  let commission = 0;
  const tiers = [
    { from: 1_000_000, to: 1_250_000, rate: 0.01 },
    { from: 1_250_000, to: 1_500_000, rate: 0.0125 },
    { from: 1_500_000, to: 1_750_000, rate: 0.015 },
    { from: 1_750_000, to: 2_000_000, rate: 0.0175 },
  ];
  for (const tier of tiers) {
    if (totalCollected <= tier.from) break;
    const applicable = Math.min(totalCollected, tier.to) - tier.from;
    commission += applicable * tier.rate;
  }
  if (totalCollected > 2_000_000) {
    commission += (totalCollected - 2_000_000) * 0.02;
    const extra250k = Math.floor((totalCollected - 2_000_000) / 250_000);
    commission += extra250k * 250_000 * 0.0025;
  }
  return Math.round(commission);
}

// ─── Stage Commission Split ──────────────────────────────────────────────────
function calcStageSplit(totalCommission: number) {
  const stage1 = Math.round(totalCommission * 0.5);
  const stage2 = totalCommission - stage1;
  return { stage1, stage2 };
}

// ─── Contract Status Logic ───────────────────────────────────────────────────
function getContractStatus(contractAmount: number, collectedAmount: number, dueDate?: Date): string {
  if (collectedAmount >= contractAmount) return "completed";
  if (!dueDate) return "on_track";
  const today = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due_soon";
  return "on_track";
}

// ─── Collection Rate ─────────────────────────────────────────────────────────
function calcCollectionRate(totalContracts: number, totalCollected: number): number {
  if (totalContracts === 0) return 0;
  return Math.round((totalCollected / totalContracts) * 100);
}

// ─── Stage 1 Trigger ─────────────────────────────────────────────────────────
function isStage1Eligible(contractAmount: number, collectedAmount: number): boolean {
  return collectedAmount >= contractAmount * 0.75;
}

function isStage2Eligible(contractAmount: number, collectedAmount: number): boolean {
  return collectedAmount >= contractAmount;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("Financial Module - Commission Calculation", () => {
  it("لا كوميشن أقل من 1,000,000", () => {
    expect(calcProgressiveCommission(500_000)).toBe(0);
    expect(calcProgressiveCommission(999_999)).toBe(0);
  });

  it("1% على الشريحة الأولى (1M → 1.25M)", () => {
    const comm = calcProgressiveCommission(1_100_000);
    expect(comm).toBe(1_000); // 100,000 × 1%
  });

  it("حساب تصاعدي صحيح عند 1.25M", () => {
    const comm = calcProgressiveCommission(1_250_000);
    expect(comm).toBe(2_500); // 250,000 × 1%
  });

  it("حساب تصاعدي صحيح عند 1.5M", () => {
    const comm = calcProgressiveCommission(1_500_000);
    // 250K×1% + 250K×1.25% = 2500 + 3125 = 5625
    expect(comm).toBe(5_625);
  });

  it("حساب تصاعدي صحيح عند 1.75M", () => {
    const comm = calcProgressiveCommission(1_750_000);
    // 250K×1% + 250K×1.25% + 250K×1.5% = 2500 + 3125 + 3750 = 9375
    expect(comm).toBe(9_375);
  });

  it("حساب تصاعدي صحيح عند 2M", () => {
    const comm = calcProgressiveCommission(2_000_000);
    // 250K×1% + 250K×1.25% + 250K×1.5% + 250K×1.75% = 2500+3125+3750+4375 = 13750
    expect(comm).toBe(13_750);
  });

  it("كوميشن إضافي بعد 2M", () => {
    const comm = calcProgressiveCommission(2_250_000);
    // base 13750 + 250K×2% + 250K×0.25% = 13750 + 5000 + 625 = 19375
    expect(comm).toBe(19_375);
  });
});

describe("Financial Module - Stage Split", () => {
  it("تقسيم الكوميشن 50/50 بين Stage 1 و Stage 2", () => {
    const { stage1, stage2 } = calcStageSplit(10_000);
    expect(stage1).toBe(5_000);
    expect(stage2).toBe(5_000);
  });

  it("تقسيم صحيح للأرقام الفردية", () => {
    const { stage1, stage2 } = calcStageSplit(9_999);
    expect(stage1 + stage2).toBe(9_999);
    expect(stage1).toBe(5_000);
    expect(stage2).toBe(4_999);
  });
});

describe("Financial Module - Contract Status", () => {
  it("مكتمل عند تحصيل كامل", () => {
    expect(getContractStatus(1_000_000, 1_000_000)).toBe("completed");
    expect(getContractStatus(1_000_000, 1_100_000)).toBe("completed");
  });

  it("في الموعد بدون تاريخ استحقاق", () => {
    expect(getContractStatus(1_000_000, 500_000)).toBe("on_track");
  });

  it("متأخر عند تجاوز تاريخ الاستحقاق", () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(getContractStatus(1_000_000, 500_000, pastDate)).toBe("overdue");
  });

  it("يستحق قريباً خلال 7 أيام", () => {
    const soonDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    expect(getContractStatus(1_000_000, 500_000, soonDate)).toBe("due_soon");
  });

  it("في الموعد إذا كان أكثر من 7 أيام", () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expect(getContractStatus(1_000_000, 500_000, futureDate)).toBe("on_track");
  });
});

describe("Financial Module - Collection Rate", () => {
  it("معدل التحصيل صحيح", () => {
    expect(calcCollectionRate(1_000_000, 750_000)).toBe(75);
    expect(calcCollectionRate(1_000_000, 1_000_000)).toBe(100);
    expect(calcCollectionRate(0, 0)).toBe(0);
  });
});

describe("Financial Module - Stage Eligibility", () => {
  it("Stage 1 مستحق عند 75% تحصيل", () => {
    expect(isStage1Eligible(1_000_000, 750_000)).toBe(true);
    expect(isStage1Eligible(1_000_000, 800_000)).toBe(true);
    expect(isStage1Eligible(1_000_000, 749_999)).toBe(false);
  });

  it("Stage 2 مستحق عند 100% تحصيل", () => {
    expect(isStage2Eligible(1_000_000, 1_000_000)).toBe(true);
    expect(isStage2Eligible(1_000_000, 999_999)).toBe(false);
  });
});
