import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, Minus, Trophy, Target, CheckCircle,
  Clock, Users, AlertTriangle, DollarSign, BarChart2, Calendar,
  Zap, RefreshCw,
} from "lucide-react";

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}م` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}ك` : n.toLocaleString("ar-EG");
const fmtFull = (n: number) => `${n.toLocaleString("ar-EG")} ج.م`;

function GrowthBadge({ pct }: { pct: number }) {
  if (pct > 0) return (
    <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
      <TrendingUp className="w-4 h-4" /> +{pct}%
    </span>
  );
  if (pct < 0) return (
    <span className="flex items-center gap-1 text-red-500 font-bold text-sm">
      <TrendingDown className="w-4 h-4" /> {pct}%
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-muted-foreground font-bold text-sm">
      <Minus className="w-4 h-4" /> 0%
    </span>
  );
}

export default function WeeklyReport() {
  const { data, isLoading, refetch, isFetching } = trpc.kpi.weeklyReport.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground" dir="rtl">
        <div className="text-center space-y-2">
          <BarChart2 className="w-10 h-10 mx-auto animate-pulse text-indigo-400" />
          <p>جاري تحميل التقرير الأسبوعي...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground" dir="rtl">
        <p>لا توجد بيانات متاحة</p>
      </div>
    );
  }

  const weekStartDate = new Date(data.weekStart).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const weekEndDate   = new Date(data.weekEnd).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const generatedAt   = new Date(data.generatedAt).toLocaleString("ar-EG");

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500" />
            التقرير الأسبوعي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            الفترة: {weekStartDate} → {weekEndDate}
            <span className="mx-2">•</span>
            آخر تحديث: {generatedAt}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* ─── Summary KPIs ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-green-100"><DollarSign className="w-4 h-4 text-green-600" /></div>
              <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
            </div>
            <p className="text-xl font-bold text-green-600">{fmt(data.totalSales)}</p>
            <GrowthBadge pct={data.salesGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-indigo-100"><Zap className="w-4 h-4 text-indigo-600" /></div>
              <p className="text-xs text-muted-foreground">تنفيذ المهام</p>
            </div>
            <p className="text-xl font-bold text-indigo-600">{data.execRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{data.completedTasks} من {data.totalTasks} مهمة</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-100"><Users className="w-4 h-4 text-blue-600" /></div>
              <p className="text-xs text-muted-foreground">المعاينات</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{data.totalVisits}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.completedVisits} مكتملة</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-amber-100"><Target className="w-4 h-4 text-amber-600" /></div>
              <p className="text-xs text-muted-foreground">صفقات جديدة</p>
            </div>
            <p className="text-xl font-bold text-amber-600">{data.newDeals}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold">{data.closedWon} مغلقة ✓</span>
              {data.closedLost > 0 && <span className="text-red-500 mr-2 font-semibold">{data.closedLost} خاسرة</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Highlights ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Sales vs Previous Week */}
        <Card className={data.salesGrowth >= 0 ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-red-200 bg-red-50/40 dark:bg-red-950/10"}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-3 rounded-xl ${data.salesGrowth >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
              {data.salesGrowth >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">مقارنة بالأسبوع السابق</p>
              <p className={`text-lg font-bold ${data.salesGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {data.salesGrowth >= 0 ? "+" : ""}{data.salesGrowth}%
              </p>
              <p className="text-xs text-muted-foreground">السابق: {fmt(data.prevTotalSales)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Execution */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              <p className="text-sm font-semibold">معدل تنفيذ المهام</p>
            </div>
            <Progress
              value={data.execRate}
              className={`h-3 mb-1 ${
                data.execRate >= 80 ? "[&>div]:bg-emerald-500" :
                data.execRate >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
              }`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{data.completedTasks} منجزة</span>
              {data.delayedTasks > 0 && <span className="text-amber-600">{data.delayedTasks} متأخرة</span>}
              <span>{data.execRate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Performer */}
        {data.topPerformer && (
          <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium">🥇 الأعلى مبيعاً هذا الأسبوع</p>
                <p className="font-bold">{data.topPerformer.engineerName}</p>
                <p className="text-sm text-emerald-600 font-semibold">{fmtFull(data.topPerformer.sales)}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Engineers Breakdown ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            أداء المهندسين هذا الأسبوع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-right py-2 px-3">المهندس</th>
                  <th className="text-right py-2 px-3">المبيعات</th>
                  <th className="text-right py-2 px-3">صفقات مغلقة</th>
                  <th className="text-right py-2 px-3">المعاينات</th>
                  <th className="text-right py-2 px-3">المهام</th>
                  <th className="text-right py-2 px-3">تنفيذ المهام</th>
                  <th className="text-right py-2 px-3">متأخرة</th>
                </tr>
              </thead>
              <tbody>
                {data.engineerSummary.map((eng, i) => (
                  <tr key={eng.engineerId} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-amber-100 text-amber-700" :
                          i === 1 ? "bg-slate-100 text-slate-600" :
                          i === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </span>
                        <span className="font-semibold">{eng.engineerName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`font-bold ${eng.sales > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {eng.sales > 0 ? fmtFull(eng.sales) : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {eng.closedWon > 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                          {eng.closedWon} صفقة
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{eng.visits}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{eng.tasks}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={eng.execRate}
                          className={`h-2 w-16 ${
                            eng.execRate >= 80 ? "[&>div]:bg-emerald-500" :
                            eng.execRate >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
                          }`}
                        />
                        <span className="text-xs font-bold">{eng.execRate}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {eng.tasksDelayed > 0 ? (
                        <span className="flex items-center gap-1 text-amber-600 text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" /> {eng.tasksDelayed}
                        </span>
                      ) : <span className="text-emerald-600 text-xs">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Leads & Pipeline ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> ملخص الأسبوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">عملاء محتملون جدد (Leads)</span>
                <span className="font-bold text-blue-600">{data.newLeads}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">صفقات في Pipeline</span>
                <span className="font-bold text-amber-600">{data.newDeals}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">صفقات مغلقة (Won)</span>
                <span className="font-bold text-emerald-600">{data.closedWon}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">صفقات خاسرة</span>
                <span className={`font-bold ${data.closedLost > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  {data.closedLost}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">معاينات مكتملة</span>
                <span className="font-bold">{data.completedVisits} / {data.totalVisits}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" /> ملخص المهام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">إجمالي المهام</span>
                <span className="font-bold">{data.totalTasks}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">منجزة</span>
                <span className="font-bold text-emerald-600">{data.completedTasks}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">متأخرة</span>
                <span className={`font-bold ${data.delayedTasks > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {data.delayedTasks}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">معدل التنفيذ</span>
                <span className={`font-bold ${
                  data.execRate >= 80 ? "text-emerald-600" :
                  data.execRate >= 60 ? "text-amber-600" : "text-red-500"
                }`}>{data.execRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
