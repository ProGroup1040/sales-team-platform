import { describe, it, expect } from "vitest";

// ─── Inline helpers (same logic as db.ts) ─────────────────────────────────────
function calcDurationMinutes(startTime?: string | null, endTime?: string | null): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end   = eh * 60 + em;
  return end > start ? end - start : 0;
}

function doTimesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const [sh1, sm1] = s1.split(":").map(Number);
  const [eh1, em1] = e1.split(":").map(Number);
  const [sh2, sm2] = s2.split(":").map(Number);
  const [eh2, em2] = e2.split(":").map(Number);
  const start1 = sh1 * 60 + sm1, end1 = eh1 * 60 + em1;
  const start2 = sh2 * 60 + sm2, end2 = eh2 * 60 + em2;
  return start1 < end2 && start2 < end1;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Time Calendar - Duration Calculation", () => {
  it("calculates 60 minutes for 09:00-10:00", () => {
    expect(calcDurationMinutes("09:00", "10:00")).toBe(60);
  });
  it("calculates 90 minutes for 09:00-10:30", () => {
    expect(calcDurationMinutes("09:00", "10:30")).toBe(90);
  });
  it("calculates 30 minutes for 14:30-15:00", () => {
    expect(calcDurationMinutes("14:30", "15:00")).toBe(30);
  });
  it("returns 0 when end is before start", () => {
    expect(calcDurationMinutes("10:00", "09:00")).toBe(0);
  });
  it("returns 0 when same time", () => {
    expect(calcDurationMinutes("09:00", "09:00")).toBe(0);
  });
  it("returns 0 when times are null", () => {
    expect(calcDurationMinutes(null, null)).toBe(0);
    expect(calcDurationMinutes("09:00", null)).toBe(0);
    expect(calcDurationMinutes(null, "10:00")).toBe(0);
  });
  it("handles midnight boundary: 23:00-23:59 = 59 min", () => {
    expect(calcDurationMinutes("23:00", "23:59")).toBe(59);
  });
  it("calculates 8 hours for 08:00-16:00", () => {
    expect(calcDurationMinutes("08:00", "16:00")).toBe(480);
  });
});

describe("Time Calendar - Overlap Detection", () => {
  it("detects overlap: [09:00-10:00] vs [09:30-10:30]", () => {
    expect(doTimesOverlap("09:00", "10:00", "09:30", "10:30")).toBe(true);
  });
  it("detects overlap: [09:00-11:00] vs [10:00-10:30] (contained)", () => {
    expect(doTimesOverlap("09:00", "11:00", "10:00", "10:30")).toBe(true);
  });
  it("detects overlap: exact same time", () => {
    expect(doTimesOverlap("09:00", "10:00", "09:00", "10:00")).toBe(true);
  });
  it("no overlap: [09:00-10:00] vs [10:00-11:00] (adjacent)", () => {
    expect(doTimesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
  });
  it("no overlap: [09:00-10:00] vs [11:00-12:00] (gap)", () => {
    expect(doTimesOverlap("09:00", "10:00", "11:00", "12:00")).toBe(false);
  });
  it("no overlap: [11:00-12:00] vs [09:00-10:00] (reversed order)", () => {
    expect(doTimesOverlap("11:00", "12:00", "09:00", "10:00")).toBe(false);
  });
  it("detects overlap: [08:00-17:00] vs [09:00-10:00] (fully contained)", () => {
    expect(doTimesOverlap("08:00", "17:00", "09:00", "10:00")).toBe(true);
  });
  it("no overlap: [09:00-09:30] vs [09:30-10:00] (touching at boundary)", () => {
    expect(doTimesOverlap("09:00", "09:30", "09:30", "10:00")).toBe(false);
  });
});

describe("Time Calendar - Distribution Percentage", () => {
  it("calculates correct percentages for mixed activities", () => {
    const tasks = [
      { startTime: "09:00", endTime: "10:00", category: "meetings" },  // 60 min
      { startTime: "10:00", endTime: "13:00", category: "design_3d" }, // 180 min
      { startTime: "14:00", endTime: "15:00", category: "quotation" }, // 60 min
      { startTime: "15:00", endTime: "15:30", category: "design_2d" }, // 30 min
    ];
    const totalMinutes = tasks.reduce((s, t) => s + calcDurationMinutes(t.startTime, t.endTime), 0);
    expect(totalMinutes).toBe(330);
    const meetingsPct = Math.round((60 / 330) * 100);
    const design3dPct = Math.round((180 / 330) * 100);
    expect(meetingsPct).toBe(18);
    expect(design3dPct).toBe(55);
  });

  it("returns 0% for all categories when no timed tasks", () => {
    const tasks: any[] = [];
    const totalMinutes = tasks.reduce((s: number, t: any) => s + calcDurationMinutes(t.startTime, t.endTime), 0);
    expect(totalMinutes).toBe(0);
    const pct = (min: number) => totalMinutes > 0 ? Math.round((min / totalMinutes) * 100) : 0;
    expect(pct(0)).toBe(0);
  });
});
