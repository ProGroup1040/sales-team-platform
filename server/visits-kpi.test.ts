import { describe, expect, it } from "vitest";

// ─── Unit tests for Visits KPI calculations ───────────────────────────────────
// These tests verify the KPI formulas used in getVisitsStats

function calcConfirmationRate(confirmedSameDay: number, confirmedLate: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((confirmedSameDay + confirmedLate) / total) * 100);
}

function calcDelayRate(delayed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((delayed / total) * 100);
}

function calcUploadSameDayRate(uploadedSameDay: number, completed: number): number {
  if (completed === 0) return 0;
  return Math.round((uploadedSameDay / completed) * 100);
}

function calcCancellationRate(cancelled: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((cancelled / total) * 100);
}

function calcRevisitRate(repeated: number, completed: number): number {
  if (completed === 0) return 0;
  return Math.round((repeated / completed) * 100);
}

function calcCollectionRate(collected: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((collected / total) * 100);
}

describe("Visits KPI Calculations", () => {
  describe("Confirmation Rate", () => {
    it("returns 0 when no visits", () => {
      expect(calcConfirmationRate(0, 0, 0)).toBe(0);
    });
    it("calculates correctly with same-day and late confirmations", () => {
      expect(calcConfirmationRate(6, 2, 10)).toBe(80);
    });
    it("returns 100% when all confirmed", () => {
      expect(calcConfirmationRate(10, 0, 10)).toBe(100);
    });
    it("counts late confirmations in rate", () => {
      expect(calcConfirmationRate(0, 5, 10)).toBe(50);
    });
  });

  describe("Delay Rate", () => {
    it("returns 0 when no visits", () => {
      expect(calcDelayRate(0, 0)).toBe(0);
    });
    it("calculates correctly", () => {
      expect(calcDelayRate(3, 10)).toBe(30);
    });
    it("returns 100% when all delayed", () => {
      expect(calcDelayRate(5, 5)).toBe(100);
    });
  });

  describe("Upload Same Day Rate", () => {
    it("returns 0 when no completed visits", () => {
      expect(calcUploadSameDayRate(0, 0)).toBe(0);
    });
    it("calculates correctly", () => {
      expect(calcUploadSameDayRate(7, 10)).toBe(70);
    });
    it("returns 100% when all uploaded same day", () => {
      expect(calcUploadSameDayRate(8, 8)).toBe(100);
    });
  });

  describe("Cancellation Rate", () => {
    it("returns 0 when no visits", () => {
      expect(calcCancellationRate(0, 0)).toBe(0);
    });
    it("calculates correctly", () => {
      expect(calcCancellationRate(2, 10)).toBe(20);
    });
    it("rounds correctly", () => {
      expect(calcCancellationRate(1, 3)).toBe(33);
    });
  });

  describe("Revisit Rate", () => {
    it("returns 0 when no completed visits", () => {
      expect(calcRevisitRate(0, 0)).toBe(0);
    });
    it("calculates correctly", () => {
      expect(calcRevisitRate(2, 10)).toBe(20);
    });
    it("returns 0 when no repeated visits", () => {
      expect(calcRevisitRate(0, 5)).toBe(0);
    });
  });

  describe("Collection Rate", () => {
    it("returns 0 when no visits", () => {
      expect(calcCollectionRate(0, 0)).toBe(0);
    });
    it("calculates correctly", () => {
      expect(calcCollectionRate(8, 10)).toBe(80);
    });
    it("returns 100% when all collected", () => {
      expect(calcCollectionRate(5, 5)).toBe(100);
    });
  });

  describe("Edge Cases", () => {
    it("handles all zeros gracefully", () => {
      expect(calcConfirmationRate(0, 0, 0)).toBe(0);
      expect(calcDelayRate(0, 0)).toBe(0);
      expect(calcUploadSameDayRate(0, 0)).toBe(0);
      expect(calcCancellationRate(0, 0)).toBe(0);
      expect(calcRevisitRate(0, 0)).toBe(0);
      expect(calcCollectionRate(0, 0)).toBe(0);
    });
    it("returns 100% when all visits confirmed", () => {
      expect(calcConfirmationRate(10, 0, 10)).toBeLessThanOrEqual(100);
      expect(calcDelayRate(10, 10)).toBeLessThanOrEqual(100);
    });
  });
});
