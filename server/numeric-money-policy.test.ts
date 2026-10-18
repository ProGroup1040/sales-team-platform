import { describe, expect, it } from "vitest";
import {
  calcCommission,
  calcSavedDiscountBonus,
  allocateCentsByWeights,
  splitAdvancedDiscountSaving,
  calculateDiscountBonusMoney,
  calculateDiscountBudget,
  calculateTeamDiscountShares,
  calcProgressiveCommission,
  splitCommissionStages,
} from "./db";

describe("approved two-decimal financial policy", () => {
  it("rounds tier commission calculations to integer cents", () => {
    const tiers = [{ minAchievementPct: 0, maxAchievementPct: null, commissionPct: 1 }];

    expect(calcCommission(100, 0.50, tiers)).toBe(0.01);
    expect(calcCommission(100, 100.01, tiers)).toBe(1);
  });

  it("keeps progressive commissions at two decimals on adjacent tier amounts", () => {
    expect(calcProgressiveCommission(1_000_000.50)).toBe(10_000.01);
    expect(calcProgressiveCommission(2_000_000.50)).toBe(26_250.01);
  });

  it("splits an odd-cent commission without losing or creating money", () => {
    expect(splitCommissionStages(1.01)).toEqual({ stage1: 0.51, stage2: 0.5 });
    expect(splitCommissionStages(1.01).stage1 + splitCommissionStages(1.01).stage2).toBe(1.01);
  });

  it("calculates discount budget totals and half-cent cases in cents", () => {
    const budget = calculateDiscountBudget(
      ["0.50", "100.01"],
      ["0.10"],
      ["0.01"],
      ["0.02"],
      ["0.03"],
      1,
    );

    expect(budget).toEqual({
      actualSales: 100.51,
      pipeline: 0.1,
      totalVolume: 100.61,
      allowedDiscount: 1.01,
      usedDiscount: 0.01,
      remainingDiscount: 1,
      potentialDiscount: 0.02,
      lostValue: 0.03,
    });
  });

  it("calculates discount bonuses and monthly caps to two decimals", () => {
    expect(calculateDiscountBonusMoney({
      discountUsed: "1.01",
      netValue: "100.01",
      commissionPct: 3,
      monthlyCap: "15000.00",
      earnedThisMonth: "0",
    })).toMatchObject({
      discountUsed: 1.01,
      commissionAmount: 3,
      bonusAmount: 0.51,
      bonusCase: 1,
      remainingCap: 15000,
    });

    expect(calculateDiscountBonusMoney({
      discountUsed: "10.01",
      netValue: "100.01",
      commissionPct: 10,
      monthlyCap: "10.00",
      earnedThisMonth: "9.99",
    })).toMatchObject({
      commissionAmount: 10,
      bonusAmount: 0.01,
      bonusCase: 2,
      remainingCap: 0.01,
    });
  });

  it("preserves every cent in the team discount pool before applying rank boosts", () => {
    const shares = calculateTeamDiscountShares([
      { engineerId: 1, totalScore: 1, wonDeals: 2, qualifies: true, rank: 1 },
      { engineerId: 2, totalScore: 2, wonDeals: 3, qualifies: true, rank: 2 },
      { engineerId: 3, totalScore: 100, wonDeals: 1, qualifies: false, rank: 3 },
    ], 10_100, 2);

    expect(shares.get(1)).toEqual({ baseShareCents: 3367, boostCents: 337, finalShareCents: 3704, avgPerDealCents: 1852 });
    expect(shares.get(2)).toEqual({ baseShareCents: 6733, boostCents: 673, finalShareCents: 7406, avgPerDealCents: 2469 });
    expect(shares.get(3)).toEqual({ baseShareCents: 0, boostCents: 0, finalShareCents: 0, avgPerDealCents: 0 });
    expect((shares.get(1)?.baseShareCents ?? 0) + (shares.get(2)?.baseShareCents ?? 0)).toBe(10_100);
  });

  it("splits a saved-discount bonus without losing a cent", () => {
    expect(calcSavedDiscountBonus(100.50, 1, 0)).toEqual({
      maxDiscountValue: 1.01,
      usedDiscountValue: 0,
      savedDiscountValue: 1.01,
      engineerBonus: 0.51,
      companyProfit: 0.5,
    });
  });

  it("assigns the final cent residual in weighted advanced discount allocations", () => {
    expect(allocateCentsByWeights(101, [1, 2, 0])).toEqual([34, 67, 0]);
    expect(allocateCentsByWeights(1, [1, 1, 1])).toEqual([0, 0, 1]);
  });

  it("reconciles the advanced 50/15/35 saving split to the exact cent", () => {
    expect(splitAdvancedDiscountSaving(1.01)).toEqual({
      unusedDiscount: 1.01,
      engineerBonus: 0.51,
      adminSalesBonus: 0.15,
      companySaving: 0.35,
    });
  });
});
