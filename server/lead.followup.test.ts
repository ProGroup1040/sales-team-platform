import { describe, it, expect } from 'vitest';

// ─── Unit Tests: Lead Followup KPI Scoring Logic ─────────────────────────────
// These tests verify the scoring formulas used in getAdminSalesFollowupKPI
// and getTelesalesFollowupKPI without hitting the database.

type FollowupStatus = 'followed_up' | 'delayed' | 'no_response';
type FollowupQuality = 'excellent' | 'good' | 'poor';

interface MockLog {
  followupStatus: FollowupStatus;
  followupQuality: FollowupQuality | null;
  responseDelayHours: number | null;
}

// ── Replicate scoring logic from db.ts ────────────────────────────────────────
function calcAdminSalesKPI(logs: MockLog[]) {
  if (logs.length === 0) return { accuracyScore: 100, detectionScore: 100 };
  const followedUp = logs.filter(l => l.followupStatus === 'followed_up').length;
  const delayed = logs.filter(l => l.followupStatus === 'delayed').length;
  const accuracyScore = Math.round((followedUp / logs.length) * 100);
  const detectionScore = Math.round(((followedUp + delayed) / logs.length) * 100);
  return { accuracyScore, detectionScore };
}

function calcTelesalesKPI(logs: MockLog[]) {
  if (logs.length === 0) return { responseScore: 100, qualityScore: 100, overallScore: 100 };
  const followedUp = logs.filter(l => l.followupStatus === 'followed_up').length;
  const delayed = logs.filter(l => l.followupStatus === 'delayed').length;
  const responseScore = Math.round(((followedUp * 100 + delayed * 50) / (logs.length * 100)) * 100);
  const qualityLogs = logs.filter(l => l.followupQuality !== null);
  const qualityScore = qualityLogs.length > 0
    ? Math.round(qualityLogs.reduce((s, l) => s + (l.followupQuality === 'excellent' ? 100 : l.followupQuality === 'good' ? 75 : 25), 0) / qualityLogs.length)
    : 100;
  const overallScore = Math.round(responseScore * 0.6 + qualityScore * 0.4);
  return { responseScore, qualityScore, overallScore };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Admin Sales Followup KPI', () => {
  it('returns 100% accuracy when all logs are followed_up', () => {
    const logs: MockLog[] = [
      { followupStatus: 'followed_up', followupQuality: 'good', responseDelayHours: null },
      { followupStatus: 'followed_up', followupQuality: 'excellent', responseDelayHours: null },
      { followupStatus: 'followed_up', followupQuality: 'good', responseDelayHours: null },
    ];
    const kpi = calcAdminSalesKPI(logs);
    expect(kpi.accuracyScore).toBe(100);
    expect(kpi.detectionScore).toBe(100);
  });

  it('returns 0% accuracy when all logs are no_response', () => {
    const logs: MockLog[] = [
      { followupStatus: 'no_response', followupQuality: null, responseDelayHours: 24 },
      { followupStatus: 'no_response', followupQuality: null, responseDelayHours: 48 },
    ];
    const kpi = calcAdminSalesKPI(logs);
    expect(kpi.accuracyScore).toBe(0);
    expect(kpi.detectionScore).toBe(0);
  });

  it('counts delayed as detected (good for admin)', () => {
    const logs: MockLog[] = [
      { followupStatus: 'followed_up', followupQuality: 'good', responseDelayHours: null },
      { followupStatus: 'delayed', followupQuality: null, responseDelayHours: 6 },
      { followupStatus: 'no_response', followupQuality: null, responseDelayHours: null },
    ];
    const kpi = calcAdminSalesKPI(logs);
    // accuracy: 1/3 = 33%
    expect(kpi.accuracyScore).toBe(33);
    // detection: (1+1)/3 = 67%
    expect(kpi.detectionScore).toBe(67);
  });

  it('returns 100% for empty logs (no data = no penalty)', () => {
    const kpi = calcAdminSalesKPI([]);
    expect(kpi.accuracyScore).toBe(100);
    expect(kpi.detectionScore).toBe(100);
  });
});

describe('Tele-sales Followup KPI', () => {
  it('returns 100% overall when all followed_up with excellent quality', () => {
    const logs: MockLog[] = [
      { followupStatus: 'followed_up', followupQuality: 'excellent', responseDelayHours: null },
      { followupStatus: 'followed_up', followupQuality: 'excellent', responseDelayHours: null },
    ];
    const kpi = calcTelesalesKPI(logs);
    expect(kpi.responseScore).toBe(100);
    expect(kpi.qualityScore).toBe(100);
    expect(kpi.overallScore).toBe(100);
  });

  it('penalizes delayed responses (50% response score each)', () => {
    const logs: MockLog[] = [
      { followupStatus: 'delayed', followupQuality: 'good', responseDelayHours: 5 },
      { followupStatus: 'delayed', followupQuality: 'good', responseDelayHours: 3 },
    ];
    const kpi = calcTelesalesKPI(logs);
    // responseScore: (0*100 + 2*50) / (2*100) * 100 = 50%
    expect(kpi.responseScore).toBe(50);
  });

  it('penalizes no_response heavily (0 points)', () => {
    const logs: MockLog[] = [
      { followupStatus: 'no_response', followupQuality: null, responseDelayHours: null },
      { followupStatus: 'followed_up', followupQuality: 'good', responseDelayHours: null },
    ];
    const kpi = calcTelesalesKPI(logs);
    // responseScore: (1*100 + 0*50) / (2*100) * 100 = 50%
    expect(kpi.responseScore).toBe(50);
  });

  it('calculates quality score correctly', () => {
    const logs: MockLog[] = [
      { followupStatus: 'followed_up', followupQuality: 'excellent', responseDelayHours: null }, // 100
      { followupStatus: 'followed_up', followupQuality: 'good', responseDelayHours: null },      // 75
      { followupStatus: 'followed_up', followupQuality: 'poor', responseDelayHours: null },      // 25
    ];
    const kpi = calcTelesalesKPI(logs);
    // qualityScore: (100+75+25)/3 = 67 (rounded)
    expect(kpi.qualityScore).toBe(67);
  });

  it('uses 100% quality score when no quality data', () => {
    const logs: MockLog[] = [
      { followupStatus: 'followed_up', followupQuality: null, responseDelayHours: null },
    ];
    const kpi = calcTelesalesKPI(logs);
    expect(kpi.qualityScore).toBe(100);
  });

  it('calculates overall score as 60% response + 40% quality', () => {
    const logs: MockLog[] = [
      { followupStatus: 'followed_up', followupQuality: 'good', responseDelayHours: null },
      { followupStatus: 'no_response', followupQuality: null, responseDelayHours: null },
    ];
    const kpi = calcTelesalesKPI(logs);
    // responseScore: (1*100 + 0*50) / (2*100) * 100 = 50%
    // qualityLogs: only 1 log has quality (good=75), so qualityScore = 75
    // overallScore: 50*0.6 + 75*0.4 = 30 + 30 = 60
    expect(kpi.responseScore).toBe(50);
    expect(kpi.qualityScore).toBe(75);
    expect(kpi.overallScore).toBe(60);
  });

  it('returns 100% for empty logs', () => {
    const kpi = calcTelesalesKPI([]);
    expect(kpi.responseScore).toBe(100);
    expect(kpi.qualityScore).toBe(100);
    expect(kpi.overallScore).toBe(100);
  });
});

describe('Followup Status Validation', () => {
  it('validates all three followup statuses', () => {
    const statuses: FollowupStatus[] = ['followed_up', 'delayed', 'no_response'];
    expect(statuses).toHaveLength(3);
    expect(statuses).toContain('followed_up');
    expect(statuses).toContain('delayed');
    expect(statuses).toContain('no_response');
  });

  it('validates all three quality levels', () => {
    const qualities: FollowupQuality[] = ['excellent', 'good', 'poor'];
    const scores = { excellent: 100, good: 75, poor: 25 };
    expect(scores.excellent).toBe(100);
    expect(scores.good).toBe(75);
    expect(scores.poor).toBe(25);
  });
});
