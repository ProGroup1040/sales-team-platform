# KPI Formulas — Detailed, Code-Traceable Reference

> **Important:** The platform has multiple KPI engines. They are not interchangeable. The main KPI screen uses `getEngineersKPI`; planning uses a separate 40/40/20 performance score; task planning uses activity-weighted operational score; visits and follow-up have their own scores.

## 1. Main engineer KPI shown in `/kpi`

**Frontend:** `client/src/pages/KPIModule.tsx:97-113` calls `trpc.kpi.engineers({ year, month })`.

**Backend:** `server/routers.ts` maps `kpi.engineers` to `getEngineersKPI(year, month)`.

**Source:** `server/db.ts:881-1135`.

### Period and source rows

- Tasks: `dailyTasks.taskDate` between the first and last day of the selected month.
- Visits: `visits.scheduledAt` in the selected month.
- Open pipeline deals: `deals.createdAt` in the selected month.
- Closed deals: `accountingMonth/accountingYear`, otherwise `closingMonth/closingYear`, otherwise `closedAt` in the selected month.
- Leads: `leads.createdAt` in the selected month.
- Engineer target: `engineerTargets` for the selected year/month.
- Deleted deals are excluded with `isDeleted = 0`; the task and visit base queries in this function must be checked against the deployed revision for soft-delete consistency.

### A. Tasks & execution component — 55%

For one engineer:

```text
scorableTasks = all tasks except status = client_delay and status = planned
rawExecution = (completed + 0.5 × delayed) / scorableTasks × 100
```

When there are no scorable tasks:

```text
rawExecution = 100 if planned > 0, otherwise 0
```

Efficiency is based on visits per closed-won deal:

```text
visitsPerDeal = closed visits / closed-won deals
               = 10 if visits exist but there are no closed-won deals
               = 1 if there are no visits and no closed-won deals

efficiencyScore = max(0, 100 - max(0, visitsPerDeal - 3) × 10)
```

Then:

```text
tasksScore = 70% × rawExecution + 30% × efficiencyScore
```

The component contribution to the final KPI is `tasksScore × 0.55`.

### B. Lead response component — 20%

Only leads with a non-null `responseTimeMinutes` are scored. Each response receives:

| Response time | Score |
|---|---:|
| ≤ 30 minutes | 100 |
| ≤ 60 minutes | 80 |
| ≤ 120 minutes | 60 |
| ≤ 240 minutes | 40 |
| > 240 minutes | 20 |

```text
responseScore = average(score for responded leads)
```

If there are leads but none has a response time, score is `0`. If there are no leads, score is `100`.

The contribution is `responseScore × 0.20`.

### C. CRM update component — 25%

Visits:

```text
completedVisits = status completed OR delayed
visitsWithNotes = completed visits with notes OR quality
visitCRMScore = visitsWithNotes / completedVisits × 100
               = 100 when there are no completed visits
```

Deals:

```text
openDeals = deals not closed_won and not closed_lost
dealsWithAction = open deals with nextAction
 dealCRMScore = dealsWithAction / openDeals × 100
                = 100 when there are no open deals
```

```text
crmScore = 50% × visitCRMScore + 50% × dealCRMScore
```

The contribution is `crmScore × 0.25`.

### D. Final main KPI

```text
kpiScore = round1(
  0.55 × tasksScore +
  0.20 × responseScore +
  0.25 × crmScore
)
```

The displayed rating is:

| Score | Rating |
|---:|---|
| ≥ 90 | ممتاز | 
| ≥ 75 | جيد جداً |
| ≥ 60 | جيد |
| ≥ 45 | مقبول |
| < 45 | ضعيف |

### E. Main KPI payout gates

The same function calculates payout values from closed-won deal net/value amounts:

- Progressive commission is calculated by portions of sales, not one rate over the full total.
- `commissionMultiplier = 1.0` when KPI ≥ 60%; otherwise `0.5`.
- KPI bonus is available when KPI ≥ 60% and equals `5% × commissionValue`.
- Fixed incentive amount is based on total deal value, but is paid only when KPI ≥ 75%.
- `totalPayout = commissionValue + incentiveValue + kpiBonusValue`.

### F. Progressive commission

`calcProgressiveCommission` and the main KPI breakdown use these portions:

| Portion | Rate |
|---|---:|
| 0–1,000,000 | 1% |
| 1,000,000–1,250,000 | 1.25% |
| 1,250,000–1,500,000 | 1.5% |
| 1,500,000–1,750,000 | 1.75% |
| 1,750,000–2,000,000 | 2% |
| Each additional 250,000 above 2M | rate increases by 0.25% |

Each portion is calculated separately in integer cents using `shared/money.ts`, then summed.

### G. Fixed incentive tiers

| Total closed-won value | Base incentive |
|---:|---:|
| < 500,000 | 0 |
| ≥ 500,000 | 2,500 |
| ≥ 1,000,000 | 5,000 |
| ≥ 1,250,000 | 6,500 |
| ≥ 1,500,000 | 7,500 |
| ≥ 1,750,000 | 8,750 |
| ≥ 2,000,000 | 10,000 |

## 2. Operational KPI: tasks → targets → activity score

**Backend:** `calcOperationalScoreFromTasks` in `server/db.ts:10991-11057`.
**Frontend route:** `planning.getOperationalBreakdown` and KPI activity tab.

Only tasks with `status = completed` are counted by `getEngineerActualCounts`. Task types are mapped to activity keys using `TASK_TYPE_TO_ACTIVITY`.

Targets come from `engineerTargets`:

- meeting → `targetMeetings`
- presentation → `targetPresentations`
- closing → `targetClosings`
- design_3d → `target3D`
- render → `targetRender`
- design_2d → `target2D`
- quotation → `targetQuotations`
- work_order → `targetWorkOrder`
- contract → `targetContract`

For every activity:

```text
achievementPct = min(round(actual / target × 100), 100) if target > 0, otherwise 0
weightedScore = achievementPct / 100 × activityWeight
```

Only activities with `target > 0` participate:

```text
operationalScore = round(weightedSum / totalActiveWeight × 100)
```

A missing target contributes neither actual performance nor negative points. This is different from the main 55/20/25 KPI.

## 3. Planning total performance score — separate engine

**Backend:** `calcTotalPerformanceScore` in `server/db.ts:10834+`.

```text
financialScore = min(round(actualSales / financialTarget × 100), 100) × 0.40
operationalScore = average(activity progress) × 0.40
personalScore = calcPersonalScore(...) × 0.20
totalScore = financialScore + operationalScore + personalScore
```

Grades: `A` ≥ 80, `B` ≥ 60, `C` ≥ 40, otherwise `D`.

This is **CONFLICTING with the main KPI weights only if the UI labels both as the same KPI**. The code exposes separate procedures and should be presented as separate scores.

## 4. Engineer visit KPI

**Backend:** `getEngineerVisitsKPI` in `server/db.ts:3150-3177`.

For selected engineer/month, deleted visits are excluded and visits are filtered by `scheduledAt`.

```text
confirmationScore = (sameDay × 100 + late × 60) / completedVisits
uploadScore       = (sameDay × 100 + late × 60) / completedVisits
executionScore    = (non-cancelled/rescheduled visits - delayed) / total × 100
overallScore      = 35% × confirmationScore
                 + 35% × uploadScore
                 + 30% × executionScore
```

If there are no completed visits, the function returns all three scores as `100`.

## 5. Admin Sales visits KPI

**Backend:** `getAdminSalesVisitsKPI` in `server/db.ts:3125-3147`.

```text
distributionScore = visits without distribution delay / total visits × 100
debtFollowupScore = followed-up debt visits / debt visits × 100
                   = 100 when there are no debt visits
dailyUpdateScore  = visits with lastUpdatedByAdminAt / total visits × 100
overallScore      = 40% dailyUpdateScore
                  + 35% debtFollowupScore
                  + 25% distributionScore
```

No visits returns all scores as `100`.

## 6. Company closing KPI

**Backend:** `getCompanyClosingKPI` in `server/db.ts:8816-8919`.

Despite receiving `year` and `month`, the current rate is computed over the **last 60 days from now**:

```text
currentRate = closed_won deals in last 60 days / all deals in last 60 days × 100
```

Previous rate uses the preceding 60-day window. The configured target is `60%`.

Funnel metrics use completed, non-deleted daily tasks from the last 60 days:

```text
meetingToQuotation = quotation tasks / meeting tasks × 100
quotationToClosing = closed-won deals / quotation tasks × 100
```

Zero denominators return `0`.

## 7. Lead follow-up KPI

Tests in `server/lead_daily_stats.test.ts` confirm these daily summary formulas:

```text
contactRate = contacted / totalLeads × 100
delayRate = delayed / totalLeads × 100
conversionRate = converted / totalLeads × 100
```

Zero denominators are handled as zero. The complete production follow-up formula is implemented in `getFollowupKPI`; consult that function for its date/status filters.

## 8. KPI source-of-truth warning

The following are separate calculations, not one universal KPI:

1. Main `/kpi` engineer KPI: 55/20/25.
2. Planning total performance: 40/40/20.
3. Activity operational score: weighted completed-task achievements.
4. Engineer visits score: 35/35/30.
5. Admin-sales visit score: 40/35/25.
6. Company closing rate: rolling 60-day deal rate.
7. Follow-up KPI: lead/deal follow-up-specific score.

Any report must name which engine produced its number.
