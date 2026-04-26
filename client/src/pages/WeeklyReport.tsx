import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  TrendingUp, TrendingDown, Trophy, Target, Users,
  AlertTriangle, DollarSign, BarChart2, RefreshCw,
  CheckCircle, Activity, Star,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}م` :
  n >= 1_000     ? `${(n / 1_000).toFixed(0)}ك` :
  n.toLocaleString("ar-EG");

const fmtFull = (n: number) => `${n.toLocaleString("ar-EG")} ج.م`;

const STANDARD = { meetings: 50, design_3d: 30, design_2d: 10, quotation: 10 };

const CAT_LABELS: Record<string, string> = {
  meetings:  "الاجتماعات",
  design_3d: "3D + Render",
  design_2d: "2D",
  quotation: "عروض الأسعار",
};

const CAT_COLORS: Record<string, string> = {
  meetings:  "#6366f1",
  design_3d: "#f59e0b",
  design_2d: "#10b981",
  quotation: "#ec4899",
};

const TASK_LABELS: Record<string, string> = {
  meeting_presentation: "ميتينج عرض",
  meeting_closing:      "ميتينج إغلاق",
  meeting_2d:           "ميتينج 2D",
  meeting_3d:           "ميتينج 3D",
  meeting_quotation:    "ميتينج عرض سعر",
  design_2d:            "2D",
  design_3d:            "3D Modeling",
  render:               "Render",
  quotation:            "Quotation",
  closing:              "إغلاق بيع",
  negotiation:          "تفاوض",
  other:                "أخرى",
};

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : score >= 70 ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : score >= 50 ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30";
  const label = score >= 85 ? "ممتاز" : score >= 70 ? "جيد" : score >= 50 ? "متوسط" : "ضعيف";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      <Star className="w-3 h-3" /> {score}% — {label}
    </span>
  );
}

// ─── Achievement Badge ────────────────────────────────────────────────────────
function AchievementBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400";
  const Icon  = pct >= 80 ? TrendingUp : pct >= 50 ? Activity : TrendingDown;
  return (
    <span className={`flex items-center gap-1 font-bold text-sm ${color}`}>
      <Icon className="w-4 h-4" /> {pct}%
    </span>
  );
}

// ─── Distribution Pie Chart ───────────────────────────────────────────────────
function DistributionPie({ catPct }: { catPct: Record<string, number> }) {
  const data = Object.entries(CAT_LABELS).map(([key, label]) => ({
    name: label, value: catPct[key] ?? 0, color: CAT_COLORS[key],
  })).filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        لا توجد مهام مسجلة
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
          dataKey="value" nameKey="name">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Actual vs Target Bar ─────────────────────────────────────────────────────
function ActualVsTargetBar({ catPct }: { catPct: Record<string, number> }) {
  const data = Object.entries(CAT_LABELS).map(([key, label]) => ({
    name: label,
    "فعلي": catPct[key] ?? 0,
    "هدف": STANDARD[key as keyof typeof STANDARD],
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 60]} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
        <Bar dataKey="فعلي" fill="#6366f1" radius={[3, 3, 0, 0]} />
        <Bar dataKey="هدف"  fill="#374151" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────
function InsightCard({ insight }: { insight: { type: string; message: string; icon: string } }) {
  const bg = insight.type === "danger"  ? "bg-red-500/10 border-red-500/30 text-red-400"
           : insight.type === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
           : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${bg}`}>
      <span className="text-base leading-none mt-0.5">{insight.icon}</span>
      <span>{insight.message}</span>
    </div>
  );
}

// ─── Operational Target Row ───────────────────────────────────────────────────
function OpTargetRow({ label, actual, target, pct }: {
  label: string; actual: number; target: number; pct: number;
}) {
  if (target === 0) return null;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{actual} / {target} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

// ─── Engineer Card ────────────────────────────────────────────────────────────
function EngineerCard({ eng, rank }: { eng: any; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
  const rankIcons  = ["🥇", "🥈", "🥉"];

  return (
    <Card className="border border-border/50 hover:border-border transition-colors">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-black ${rankColors[rank] ?? "text-muted-foreground"}`}>
              {rankIcons[rank] ?? `#${rank + 1}`}
            </div>
            <div>
              <h3 className="font-bold text-base">{eng.engineerName}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <ScoreBadge score={eng.distributionScore} />
                {eng.targetAmount > 0 && (
                  <AchievementBadge pct={eng.achievementPct} />
                )}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-lg font-bold text-emerald-400">{fmt(eng.sales)}</div>
            <div className="text-xs text-muted-foreground">مبيعات</div>
          </div>
        </div>

        {/* Smart Summary */}
        {eng.smartSummary && (
          <div className="mt-2 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground border border-border/30">
            💡 {eng.smartSummary}
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Distribution Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">توزيع الوقت الفعلي</p>
              <DistributionPie catPct={eng.catPct} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">فعلي مقابل الهدف</p>
              <ActualVsTargetBar catPct={eng.catPct} />
            </div>
          </div>

          {/* Distribution % Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(CAT_LABELS).map(([key, label]) => {
              const actual = eng.catPct[key] ?? 0;
              const target = STANDARD[key as keyof typeof STANDARD];
              const diff   = actual - target;
              const diffColor = Math.abs(diff) <= 5 ? "text-emerald-400"
                             : Math.abs(diff) <= 15 ? "text-amber-400" : "text-red-400";
              return (
                <div key={key} className="p-2 rounded-lg bg-muted/30 text-center border border-border/30">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-lg font-bold" style={{ color: CAT_COLORS[key] }}>{actual}%</div>
                  <div className={`text-xs font-medium ${diffColor}`}>
                    هدف: {target}% {diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : "✓"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity Breakdown */}
          {Object.keys(eng.activityCounts ?? {}).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">تفصيل الأنشطة</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(eng.activityCounts as Record<string, number>)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-1.5 rounded bg-muted/20 text-xs">
                      <span className="text-muted-foreground">{TASK_LABELS[type] ?? type}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Target Achievement */}
          {eng.targetAmount > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">تحقيق الهدف المالي</p>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الهدف</span>
                  <span className="font-bold">{fmtFull(eng.targetAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المحقق</span>
                  <span className="font-bold text-emerald-400">{fmtFull(eng.sales)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${eng.achievementPct >= 80 ? "bg-emerald-500" : eng.achievementPct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(100, eng.achievementPct)}%` }}
                  />
                </div>
                <div className="flex justify-center">
                  <AchievementBadge pct={eng.achievementPct} />
                </div>
              </div>
            </div>
          )}

          {/* Operational Targets */}
          {eng.opTargets && Object.values(eng.opTargets as Record<string, { target: number }>).some(v => v.target > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">الأهداف التشغيلية</p>
              <div className="space-y-2">
                <OpTargetRow label="الاجتماعات"    actual={eng.opTargets.meetings.actual}   target={eng.opTargets.meetings.target}   pct={eng.opTargets.meetings.pct} />
                <OpTargetRow label="التصاميم"      actual={eng.opTargets.designs.actual}    target={eng.opTargets.designs.target}    pct={eng.opTargets.designs.pct} />
                <OpTargetRow label="الإغلاقات"     actual={eng.opTargets.closings.actual}   target={eng.opTargets.closings.target}   pct={eng.opTargets.closings.pct} />
                <OpTargetRow label="عروض الأسعار"  actual={eng.opTargets.quotations.actual} target={eng.opTargets.quotations.target} pct={eng.opTargets.quotations.pct} />
              </div>
            </div>
          )}

          {/* Insights */}
          {eng.insights && eng.insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">التحليل الذكي</p>
              <div className="space-y-1.5">
                {eng.insights.map((ins: any, i: number) => (
                  <InsightCard key={i} insight={ins} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Team Radar ───────────────────────────────────────────────────────────────
function TeamRadar({ reports }: { reports: any[] }) {
  if (reports.length === 0) return null;
  const data = Object.entries(CAT_LABELS).map(([key, label]) => {
    const entry: Record<string, number | string> = {
      subject: label,
      "الهدف": STANDARD[key as keyof typeof STANDARD],
    };
    reports.slice(0, 3).forEach(r => {
      const shortName = r.engineerName.split(" ")[0];
      entry[shortName] = r.catPct[key] ?? 0;
    });
    return entry;
  });

  const colors = ["#6366f1", "#f59e0b", "#10b981"];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 60]} tick={{ fontSize: 9 }} />
        <Radar name="الهدف" dataKey="الهدف" stroke="#6b7280" fill="#6b7280" fillOpacity={0.1} strokeDasharray="4 2" />
        {reports.slice(0, 3).map((r, i) => {
          const shortName = r.engineerName.split(" ")[0];
          return (
            <Radar
              key={r.engineerId}
              name={shortName}
              dataKey={shortName}
              stroke={colors[i]}
              fill={colors[i]}
              fillOpacity={0.15}
            />
          );
        })}
        <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
        <Tooltip formatter={(v: number) => `${v}%`} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WeeklyReport() {
  const now = new Date();
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear]  = useState(now.getFullYear());

  const weeklyQ = trpc.kpi.weeklyPerformance.useQuery(undefined, {
    refetchInterval: 60_000,
    enabled: viewMode === "weekly",
  });

  const monthlyQ = trpc.kpi.engineerPerformance.useQuery(
    { year: selectedYear, month: selectedMonth },
    { enabled: viewMode === "monthly" }
  );

  const isLoading = viewMode === "weekly" ? weeklyQ.isLoading : monthlyQ.isLoading;
  const refetch   = viewMode === "weekly" ? weeklyQ.refetch   : monthlyQ.refetch;

  const reports = useMemo(() => {
    if (viewMode === "weekly") {
      const d = weeklyQ.data as any;
      return d?.engineerReports ?? [];
    }
    const d = monthlyQ.data;
    return Array.isArray(d) ? d : [];
  }, [viewMode, weeklyQ.data, monthlyQ.data]);

  const teamSummary = useMemo(() => {
    if (viewMode !== "weekly") return null;
    return (weeklyQ.data as any)?.teamSummary ?? null;
  }, [viewMode, weeklyQ.data]);

  const weekStart = useMemo(() => {
    if (viewMode !== "weekly") return null;
    const d = (weeklyQ.data as any)?.weekStart;
    return d ? new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long" }) : null;
  }, [viewMode, weeklyQ.data]);

  const weekEnd = useMemo(() => {
    if (viewMode !== "weekly") return null;
    const d = (weeklyQ.data as any)?.weekEnd;
    return d ? new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long" }) : null;
  }, [viewMode, weeklyQ.data]);

  const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground" dir="rtl">
        <div className="text-center space-y-2">
          <BarChart2 className="w-10 h-10 mx-auto animate-pulse text-indigo-400" />
          <p>جاري تحليل الأداء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-500" />
            نظام تحليل الأداء
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === "weekly" && weekStart && weekEnd
              ? `الأسبوع: ${weekStart} → ${weekEnd}`
              : `${MONTHS[selectedMonth - 1]} ${selectedYear} — من بداية الشهر حتى اليوم`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-3 py-1.5 transition-colors ${viewMode === "weekly" ? "bg-indigo-600 text-white" : "hover:bg-muted"}`}
            >أسبوعي</button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1.5 transition-colors ${viewMode === "monthly" ? "bg-indigo-600 text-white" : "hover:bg-muted"}`}
            >شهري (MTD)</button>
          </div>
          {viewMode === "monthly" && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> تحديث
          </button>
        </div>
      </div>

      {/* ── Standard Distribution Reference ────────────────────────────────── */}
      <Card className="border border-indigo-500/20 bg-indigo-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-indigo-400 flex items-center gap-2">
            <Target className="w-4 h-4" /> التوزيع المثالي للوقت (المرجعي)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(CAT_LABELS).map(([key, label]) => (
              <div key={key} className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-black" style={{ color: CAT_COLORS[key] }}>
                  {STANDARD[key as keyof typeof STANDARD]}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Team Summary ───────────────────────────────────────────────────── */}
      {teamSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border/50">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-emerald-400">{fmt(teamSummary.totalSales)}</div>
              <div className="text-xs text-muted-foreground">إجمالي المبيعات</div>
            </CardContent>
          </Card>
          <Card className="border border-border/50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-indigo-400">{teamSummary.totalClosedDeals}</div>
              <div className="text-xs text-muted-foreground">صفقات مغلقة</div>
            </CardContent>
          </Card>
          <Card className="border border-border/50">
            <CardContent className="p-4 text-center">
              <Activity className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-amber-400">{teamSummary.avgDistributionScore}%</div>
              <div className="text-xs text-muted-foreground">متوسط توزيع الوقت</div>
            </CardContent>
          </Card>
          <Card className="border border-border/50">
            <CardContent className="p-4 text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-sm font-bold text-yellow-400 truncate">
                {teamSummary.topPerformer?.engineerName?.split(" ").slice(0, 2).join(" ") ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground">الأفضل أداءً</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Team Radar ─────────────────────────────────────────────────────── */}
      {reports.length > 1 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              مقارنة توزيع الوقت (أفضل 3 مهندسين)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamRadar reports={reports} />
          </CardContent>
        </Card>
      )}

      {/* ── Engineers List ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          تحليل أداء المهندسين
          <Badge variant="secondary" className="text-xs">{reports.length} مهندس</Badge>
        </h2>

        {reports.length === 0 ? (
          <Card className="border border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>لا توجد بيانات للفترة المحددة</p>
              <p className="text-xs mt-1">تأكد من إضافة مهام للمهندسين</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((eng: any, i: number) => (
              <EngineerCard key={eng.engineerId} eng={eng} rank={i} />
            ))}
          </div>
        )}
      </div>

      {/* ── Behavior Alerts Summary ─────────────────────────────────────────── */}
      {reports.length > 0 && (() => {
        const allDangers = reports.flatMap((r: any) =>
          (r.insights ?? [])
            .filter((ins: any) => ins.type === "danger")
            .map((ins: any) => ({ ...ins, engineerName: r.engineerName }))
        );
        if (allDangers.length === 0) return null;
        return (
          <Card className="border border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                تنبيهات سلوكية تحتاج متابعة فورية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allDangers.map((alert: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-red-400 font-bold shrink-0">
                    {alert.engineerName.split(" ").slice(0, 2).join(" ")}:
                  </span>
                  <span className="text-muted-foreground">{alert.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
