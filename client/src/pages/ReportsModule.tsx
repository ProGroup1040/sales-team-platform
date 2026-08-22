
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker, getCurrentMonthFilter, type DateFilter } from "@/components/DateRangePicker";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  LineChart, Line,
} from "recharts";
import React, { useState, useMemo, useRef } from "react";
import {
  TrendingUp, TrendingDown, Target, Users, Award, AlertTriangle,
  BarChart2, Calendar, ChevronDown, ChevronUp, Activity, Zap,
  CheckCircle2, XCircle, Clock, Star, ArrowRight, Download, GitBranch,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const QUARTERS = ["الربع الأول (يناير-مارس)","الربع الثاني (أبريل-يونيو)","الربع الثالث (يوليو-سبتمبر)","الربع الرابع (أكتوبر-ديسمبر)"];

function fmt(n: number) { return new Intl.NumberFormat("ar-EG").format(Math.round(n)); }
function pct(n: number) { return `${Math.round(n * 100)}%`; }

function ScoreBadge({ score }: { score: number }) {
  const s = Math.round(score * 100);
  const color = s >= 80 ? "bg-emerald-500" : s >= 60 ? "bg-amber-500" : "bg-red-500";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-white text-xs font-bold ${color}`}>{s}%</span>;
}

function InsightCard({ insight }: { insight: { type?: string; message: string; severity: string } }) {
  const colors: Record<string, string> = {
    critical: "border-red-500 bg-red-50 dark:bg-red-950",
    warning: "border-amber-500 bg-amber-50 dark:bg-amber-950",
    info: "border-blue-500 bg-blue-50 dark:bg-blue-950",
    success: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950",
  };
  const icons: Record<string, React.ReactElement> = {
    critical: <XCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    info: <Activity className="h-4 w-4 text-blue-500" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  };
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${colors[insight.severity] || colors.info}`}>
      {icons[insight.severity] || icons.info}
      <p className="text-sm">{insight.message}</p>
    </div>
  );
}

// ─── Weekly Report Card ──────────────────────────────────────────────────────
function WeeklyEngineerCard({ eng }: { eng: any }) {
  const [expanded, setExpanded] = useState(false);
  const distScore = Math.round((eng.distributionScore ?? 0) * 100);
  const salesPct = Math.round((eng.salesAchievement ?? 0) * 100);

  const radarData = [
    { subject: "Meetings", actual: Math.round((eng.distribution?.actualPct?.meetings ?? 0) * 100), target: 50 },
    { subject: "3D/Render", actual: Math.round((eng.distribution?.actualPct?.design3d ?? 0) * 100), target: 30 },
    { subject: "2D", actual: Math.round((eng.distribution?.actualPct?.design2d ?? 0) * 100), target: 10 },
    { subject: "Quotations", actual: Math.round((eng.distribution?.actualPct?.quotation ?? 0) * 100), target: 10 },
  ];

  return (
    <Card className="border-l-4" style={{ borderLeftColor: distScore >= 80 ? "#10b981" : distScore >= 60 ? "#f59e0b" : "#ef4444" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {(eng.name || "?")[0]}
            </div>
            <div>
              <CardTitle className="text-base">{eng.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{eng.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">KPI</p>
              <ScoreBadge score={eng.kpiScore ?? 0} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-lg font-bold text-primary">{salesPct}%</p>
            <p className="text-xs text-muted-foreground">Target</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{eng.closedDeals ?? 0}</p>
            <p className="text-xs text-muted-foreground">Closing</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{distScore}%</p>
            <p className="text-xs text-muted-foreground">Dist. Score</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{eng.totalTasks ?? 0}</p>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </div>
        </div>

        {/* Sales Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>تحقيق الهدف</span>
            <span>{fmt(eng.totalSales ?? 0)} / {fmt(eng.targetAmount ?? 0)}</span>
          </div>
          <Progress value={Math.min(salesPct, 100)} className="h-2" />
        </div>

        {/* Behavior Alerts */}
        {eng.behaviorAlerts?.length > 0 && (
          <div className="space-y-1 mb-3">
            {eng.behaviorAlerts.slice(0, 2).map((alert: any, i: number) => (
              <InsightCard key={i} insight={alert} />
            ))}
          </div>
        )}

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 space-y-4 border-t pt-3">
            {/* Activity Breakdown */}
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground">Activity Breakdown (هذا الأسبوع)</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Meetings", count: eng.activityCount?.meetings ?? 0, hours: eng.activityHours?.meetings ?? 0, color: "bg-blue-500" },
                  { label: "3D/Render", count: eng.activityCount?.design3d ?? 0, hours: eng.activityHours?.design3d ?? 0, color: "bg-amber-500" },
                  { label: "2D", count: eng.activityCount?.design2d ?? 0, hours: eng.activityHours?.design2d ?? 0, color: "bg-orange-500" },
                  { label: "Quotations", count: eng.activityCount?.quotation ?? 0, hours: eng.activityHours?.quotation ?? 0, color: "bg-pink-500" },
                ].map(a => (
                  <div key={a.label} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <div className={`w-2 h-2 rounded-full ${a.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.count} مهمة · {a.hours.toFixed(1)}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribution Radar */}
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground">توزيع الوقت: Actual vs Target</p>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Actual" dataKey="actual" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                  <Radar name="Target" dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* All Insights */}
            {eng.insights?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground">Critical Insights</p>
                <div className="space-y-1">
                  {eng.insights.map((ins: any, i: number) => (
                    <InsightCard key={i} insight={ins} />
                  ))}
                </div>
              </div>
            )}

            {/* Smart Summary */}
            {eng.smartSummary && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-1">ملخص ذكي</p>
                <p className="text-sm">{eng.smartSummary}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Weekly Report Tab ───────────────────────────────────────────────────────
function WeeklyReportTab() {
  const { data, isLoading } = trpc.reports.weeklyFull.useQuery();

  if (isLoading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!data || !Array.isArray(data) || data.length === 0) return <div className="text-center text-muted-foreground py-12">لا توجد بيانات للأسبوع الحالي</div>;

  const sorted = [...data].sort((a: any, b: any) => (b.kpiScore ?? 0) - (a.kpiScore ?? 0));

  // Team Summary
  const teamAvgKPI = data.reduce((s: number, e: any) => s + (e.kpiScore ?? 0), 0) / data.length;
  const teamAvgSales = data.reduce((s: number, e: any) => s + (e.salesAchievement ?? 0), 0) / data.length;
  const totalClosed = data.reduce((s: number, e: any) => s + (e.closedDeals ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Team Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{Math.round(teamAvgKPI * 100)}%</p>
            <p className="text-sm text-muted-foreground">متوسط KPI الفريق</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{Math.round(teamAvgSales * 100)}%</p>
            <p className="text-sm text-muted-foreground">متوسط تحقيق الهدف</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{totalClosed}</p>
            <p className="text-sm text-muted-foreground">صفقات مغلقة هذا الأسبوع</p>
          </CardContent>
        </Card>
      </div>

      {/* Engineers Cards */}
      <div className="space-y-4">
        {sorted.map((eng: any) => (
          <WeeklyEngineerCard key={eng.engineerId} eng={eng} />
        ))}
      </div>
    </div>
  );
}

// ─── Monthly Report Tab ────────────────────────────────────────────
function MonthlyReportTab() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>(getCurrentMonthFilter());
  const year = dateFilter.mode === 'month' ? dateFilter.year : dateFilter.startDate.getFullYear();
  const month = dateFilter.mode === 'month' ? dateFilter.month : dateFilter.startDate.getMonth() + 1;

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      if (pdfHeight <= pdf.internal.pageSize.getHeight()) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        let yOffset = 0;
        const pageH = pdf.internal.pageSize.getHeight();
        while (yOffset < pdfHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, pdfHeight);
          yOffset += pageH;
        }
      }
      pdf.save(`تقرير-شهري-${month}-${year}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
    }
  };
  const { data, isLoading } = trpc.reports.monthlyKPI.useQuery({ year, month });

  if (isLoading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!data || !Array.isArray(data) || data.length === 0) return <div className="text-center text-muted-foreground py-12">لا توجد بيانات لهذا الشهر</div>;

  const sorted = [...data].sort((a: any, b: any) => (b.kpiScore ?? 0) - (a.kpiScore ?? 0));

  // Bar chart data
  const barData = sorted.map((e: any) => ({
    name: (e.name || "").split(" ")[0],
    "تحقيق الهدف %": Math.round((e.salesAchievement ?? 0) * 100),
    "Distribution Score": Math.round((e.distributionScore ?? 0) * 100),
    "Closing Rate %": Math.round((e.closingRate ?? 0) * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateFilter} onChange={setDateFilter} />
          <Badge variant="outline">{MONTHS_AR[month - 1]} {year}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          تصدير PDF
        </Button>
      </div>
      <div ref={reportRef}>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">مقارنة أداء المهندسين</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="تحقيق الهدف %" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Distribution Score" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Closing Rate %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engineers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">تفاصيل الأداء الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">#</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">المهندس</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">المبيعات</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">الهدف %</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Closing</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Dist. Score</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">KPI</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Insights</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((eng: any, i: number) => (
                  <tr key={eng.engineerId} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3">
                      {i === 0 ? <Star className="h-4 w-4 text-amber-500" /> : <span className="text-muted-foreground">{i + 1}</span>}
                    </td>
                    <td className="py-2 px-3 font-medium">{eng.name}</td>
                    <td className="py-2 px-3">{fmt(eng.totalSales ?? 0)}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(Math.round((eng.salesAchievement ?? 0) * 100), 100)} className="h-1.5 w-16" />
                        <span>{Math.round((eng.salesAchievement ?? 0) * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">{eng.closedDeals ?? 0} صفقة</td>
                    <td className="py-2 px-3"><ScoreBadge score={eng.distributionScore ?? 0} /></td>
                    <td className="py-2 px-3"><ScoreBadge score={eng.kpiScore ?? 0} /></td>
                    <td className="py-2 px-3">
                      {(eng.insights ?? []).length > 0 && (
                        <Badge variant="destructive" className="text-xs">{(eng.insights ?? []).length} تنبيه</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {sorted.some((e: any) => (e.insights ?? []).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              تنبيهات الأداء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sorted.filter((e: any) => (e.insights ?? []).length > 0).map((eng: any) => (
              <div key={eng.engineerId}>
                <p className="text-xs font-semibold mb-1">{eng.name}</p>
                <div className="space-y-1">
                  {(eng.insights ?? []).map((ins: any, i: number) => (
                    <InsightCard key={i} insight={ins} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
       )}
      </div>{/* end reportRef */}
    </div>
  );
}
// ─── Quarterly Report Tab ────────────────────────────────────────────────────
function QuarterlyReportTab() {
  const now = new Date();
  const currentQ = Math.ceil((now.getMonth() + 1) / 3);
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(currentQ);

  const { data, isLoading } = trpc.reports.quarterly.useQuery({ year, quarter });

  if (isLoading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const months = data?.months ?? [];
  const monthNames = [
    MONTHS_AR[(quarter - 1) * 3],
    MONTHS_AR[(quarter - 1) * 3 + 1],
    MONTHS_AR[(quarter - 1) * 3 + 2],
  ];

  // Build trend data per engineer
  const engineerNames: string[] = [];
  months.forEach((m: any[]) => {
    m.forEach((e: any) => {
      if (!engineerNames.includes(e.name)) engineerNames.push(e.name);
    });
  });

  const trendData = monthNames.map((mName, mi) => {
    const row: any = { month: mName };
    engineerNames.forEach(name => {
      const eng = (months[mi] ?? []).find((e: any) => e.name === name);
      row[name] = eng ? (eng.rankingScore ?? 0) : 0;
    });
    return row;
  });

  const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

  // Top performers across quarter
  const allEngScores: Record<string, number[]> = {};
  months.forEach((m: any[]) => {
    m.forEach((e: any) => {
      if (!allEngScores[e.name]) allEngScores[e.name] = [];
      allEngScores[e.name].push(e.kpiScore ?? 0);
    });
  });
  const avgScores = Object.entries(allEngScores).map(([name, scores]) => ({
    name,
    avg: scores.reduce((s: number, v: number) => s + v, 0) / scores.length,
  })).sort((a, b) => b.avg - a.avg);

  return (
    <div className="space-y-6">
      {/* Quarter Selector */}
      <div className="flex items-center gap-3">
        <Select value={String(quarter)} onValueChange={v => setQuarter(Number(v))}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUARTERS.map((q, i) => (
              <SelectItem key={i} value={String(i + 1)}>{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear()].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">تطور KPI Score خلال الربع</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {engineerNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top / Bottom Performers */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              أفضل أداء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {avgScores.slice(0, 3).map((e, i) => (
              <div key={e.name} className="flex items-center justify-between p-2 rounded bg-emerald-50 dark:bg-emerald-950">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600">#{i + 1}</span>
                  <span className="text-sm font-medium">{e.name}</span>
                </div>
                <ScoreBadge score={e.avg} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              يحتاج تحسين
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {avgScores.slice(-3).reverse().map((e, i) => (
              <div key={e.name} className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-sm font-medium">{e.name}</span>
                </div>
                <ScoreBadge score={e.avg} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">تفصيل شهري للربع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">المهندس</th>
                  {monthNames.map(m => (
                    <th key={m} className="text-center py-2 px-3 font-semibold text-muted-foreground">{m}</th>
                  ))}
                  <th className="text-center py-2 px-3 font-semibold text-muted-foreground">متوسط</th>
                  <th className="text-center py-2 px-3 font-semibold text-muted-foreground">اتجاه</th>
                </tr>
              </thead>
              <tbody>
                {engineerNames.map(name => {
                  const scores = months.map((m: any[]) => {
                    const e = m.find((x: any) => x.name === name);
                    return e ? Math.round((e.kpiScore ?? 0) * 100) : 0;
                  });
                  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
                  const trend = scores[2] - scores[0];
                  return (
                    <tr key={name} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{name}</td>
                      {scores.map((s, i) => (
                      <td key={i} className="py-2 px-3 text-center"><ScoreBadge score={s / 100} /></td>
                    ))}
                      <td className="py-2 px-3 text-center font-bold">{Math.round(avg)}%</td>
                      <td className="py-2 px-3 text-center">
                        {trend > 5 ? <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto" /> :
                         trend < -5 ? <TrendingDown className="h-4 w-4 text-red-500 mx-auto" /> :
                         <ArrowRight className="h-4 w-4 text-amber-500 mx-auto" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
function ProjectTimelineReportSnapshot() {
  const { data } = trpc.projectTimeline.dashboard.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  if (!data) return null;
  const totals = (data as any).totals;
  return (
    <Card className="border-primary/20 bg-gradient-to-l from-primary/10 via-card to-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><GitBranch className="h-4 w-4 text-primary" />مؤشرات تنفيذ المشاريع</CardTitle></CardHeader>
      <CardContent><div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "مشاريع نشطة", value: totals.activeProjects ?? 0, cls: "text-primary" },
          { label: "في الموعد", value: totals.onTime ?? 0, cls: "text-emerald-500" },
          { label: "متأخرة", value: totals.delayed ?? 0, cls: "text-amber-500" },
          { label: "حرجة", value: totals.critical ?? 0, cls: "text-red-500" },
          { label: "تحديثات مفقودة", value: totals.missingUpdates ?? 0, cls: "text-violet-500" },
        ].map((metric) => <div key={metric.label} className="rounded-lg border bg-background/60 p-3 text-center"><p className={`text-xl font-bold ${metric.cls}`}>{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.label}</p></div>)}
      </div></CardContent>
    </Card>
  );
}

export default function ReportsModule() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-primary" />
            نظام التقارير
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            تحليل الأداء الأسبوعي والشهري والربعي — مبني على Output الفعلي
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-amber-500" />
          Output-Based KPI
        </Badge>
      </div>

      <ProjectTimelineReportSnapshot />

      {/* Tabs */}
      <Tabs defaultValue="weekly">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="weekly" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            أسبوعي
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            شهري
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            ربعي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-4">
          <WeeklyReportTab />
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <MonthlyReportTab />
        </TabsContent>
        <TabsContent value="quarterly" className="mt-4">
          <QuarterlyReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
