/**
 * UNIFIED ACTIVITY TYPES
 * Single source of truth for all activity types across:
 * - Tasks Module (taskType / goalType)
 * - Goals Planning Module (operational targets)
 * - KPI Module (operational score calculation)
 *
 * DO NOT define activity types anywhere else in the system.
 */

// ─── Canonical Activity Keys ─────────────────────────────────────────────────
export const ACTIVITY_KEYS = [
  "design_2d",       // 2D Design
  "design_3d",       // 3D Modeling
  "render",          // Render
  "quotation",       // Quotation
  "meeting",         // Meeting (includes meeting_modeling, meeting_presentation)
  "presentation",    // Presentation / Meeting Presentation
  "closing",         // Closing / Meeting Closing
  "contract",        // Contract Preparation (إعداد العقد)
  "work_order",      // Work Order Preparation (إعداد أمر الشغل)
] as const;

export type ActivityKey = typeof ACTIVITY_KEYS[number];

// ─── Arabic Labels ────────────────────────────────────────────────────────────
export const ACTIVITY_LABELS: Record<ActivityKey, string> = {
  design_2d:    "2D Design",
  design_3d:    "3D Modeling",
  render:       "Render",
  quotation:    "Quotation",
  meeting:      "Meeting",
  presentation: "Presentation",
  closing:      "Closing",
  contract:     "Contract",
  work_order:   "Work Order",
};

export const ACTIVITY_LABELS_AR: Record<ActivityKey, string> = {
  design_2d:    "تصميم 2D",
  design_3d:    "نمذجة 3D",
  render:       "رندر",
  quotation:    "عرض سعر",
  meeting:      "اجتماع",
  presentation: "عرض تقديمي",
  closing:      "إغلاق",
  contract:     "إعداد العقد",
  work_order:   "أمر الشغل",
};

// ─── Operational Weights (must sum to 100) ───────────────────────────────────
/**
 * Weight distribution:
 * Meetings + Closing (meeting + presentation + closing) → 40% total (split equally ~13.3% each)
 * 3D Modeling → 15%
 * Render → 10%
 * 2D Design → 10%
 * Quotation → 10%
 * Work Order → 10%
 * Contract → 5%
 */
export const ACTIVITY_WEIGHTS: Record<ActivityKey, number> = {
  meeting:      14,   // part of Meetings+Closing 40%
  presentation: 13,   // part of Meetings+Closing 40%
  closing:      13,   // part of Meetings+Closing 40%
  design_3d:    15,
  render:       10,
  design_2d:    10,
  quotation:    10,
  work_order:   10,
  contract:     5,
};
// Total = 14+13+13+15+10+10+10+10+5 = 100 ✓

// ─── Task Type → Activity Key Mapping ────────────────────────────────────────
/**
 * Maps daily_tasks.taskType values to canonical ActivityKey.
 * Used to count completed tasks per activity.
 */
export const TASK_TYPE_TO_ACTIVITY: Record<string, ActivityKey> = {
  // New canonical types
  design_2d:            "design_2d",
  design_3d:            "design_3d",
  render:               "render",
  quotation:            "quotation",
  meeting:              "meeting",
  meeting_modeling:     "meeting",
  meeting_2d:           "meeting",
  meeting_3d:           "meeting",
  meeting_quotation:    "meeting",
  meeting_presentation: "presentation",
  presentation:         "presentation",
  meeting_closing:      "closing",
  closing:              "closing",
  contract:             "contract",
  work_order:           "work_order",
  // Legacy (negotiation → closing)
  negotiation:          "closing",
};

// ─── Goal Type → Activity Key Mapping ────────────────────────────────────────
export const GOAL_TYPE_TO_ACTIVITY: Record<string, ActivityKey> = {
  design_2d:    "design_2d",
  design_3d:    "design_3d",
  render:       "render",
  quotation:    "quotation",
  meeting:      "meeting",
  presentation: "presentation",
  closing:      "closing",
  contract:     "contract",
  work_order:   "work_order",
};

// ─── Helper: Calculate Operational Score ─────────────────────────────────────
/**
 * Calculates the weighted operational score for an engineer.
 * @param actuals - Map of ActivityKey → actual count
 * @param targets - Map of ActivityKey → target count
 * @returns score 0-100
 */
export function calcOperationalScore(
  actuals: Partial<Record<ActivityKey, number>>,
  targets: Partial<Record<ActivityKey, number>>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of ACTIVITY_KEYS) {
    const weight = ACTIVITY_WEIGHTS[key];
    const target = targets[key] ?? 0;
    const actual = actuals[key] ?? 0;

    if (target > 0) {
      const achievement = Math.min(actual / target, 1); // cap at 100%
      weightedSum += achievement * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100);
}

// ─── Icons for UI ─────────────────────────────────────────────────────────────
export const ACTIVITY_ICONS: Record<ActivityKey, string> = {
  design_2d:    "📐",
  design_3d:    "🧊",
  render:       "🎨",
  quotation:    "💰",
  meeting:      "🤝",
  presentation: "📊",
  closing:      "✅",
  contract:     "📄",
  work_order:   "🔧",
};

// ─── Colors for Charts ────────────────────────────────────────────────────────
export const ACTIVITY_COLORS: Record<ActivityKey, string> = {
  design_2d:    "#6366f1",
  design_3d:    "#8b5cf6",
  render:       "#ec4899",
  quotation:    "#f59e0b",
  meeting:      "#10b981",
  presentation: "#3b82f6",
  closing:      "#22c55e",
  contract:     "#f97316",
  work_order:   "#14b8a6",
};
