import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell, Legend } from "recharts";
import { Trophy, TrendingDown, Award } from "lucide-react";

const now = new Date();

export default function KPIModule() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: kpiData, isLoading } = trpc.kpi.engineers.useQuery({ year, month });

  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const sorted = kpiData ? [...kpiData].sort((a, b) => b.executionScore - a.executionScore) : [];
  const topPerformer = sorted[0];
  const lowPerformer = sorted[sorted.length - 1];

  const chartData = sorted.map(eng => ({
    name: eng.engineerName.split(' ')[0],
    'Execution Score': eng.executionScore,
    'عدد الصفقات': eng.closedWon,
    'عدد المعاينات': eng.visitsCount,
  }));

  const radarData = topPerformer ? [
    { metric: 'المهام', value: topPerformer.executionScore },
    { metric: 'المعاينات', value: Math.min(100, topPerformer.visitsCount * 5) },
    { metric: 'الصفقات', value: Math.min(100, topPerformer.closedWon * 20) },
    { metric: 'الـ Leads', value: Math.min(100, topPerformer.leadsCount * 10) },
    { metric: 'القيمة', value: Math.min(100, topPerformer.totalDealValue / 10000) },
  ] : [];

  const getRatingColor = (rating: string) => {
    if (rating === 'ممتاز') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (rating === 'جيد') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (rating === 'مقبول') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#6366f1';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">KPI Module</h1>
          <p className="text-sm text-muted-foreground">مؤشرات الأداء الرئيسية للمهندسين</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear()].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top & Low Performers */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topPerformer && (
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-100"><Trophy className="w-6 h-6 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium mb-0.5">الأعلى أداءً</p>
                  <p className="font-bold text-lg">{topPerformer.engineerName}</p>
                  <p className="text-sm text-muted-foreground">Execution Score: <span className="font-semibold text-emerald-600">{topPerformer.executionScore}%</span></p>
                </div>
              </CardContent>
            </Card>
          )}
          {lowPerformer && lowPerformer.engineerId !== topPerformer?.engineerId && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-100"><TrendingDown className="w-6 h-6 text-red-600" /></div>
                <div>
                  <p className="text-xs text-red-600 font-medium mb-0.5">يحتاج دعم</p>
                  <p className="font-bold text-lg">{lowPerformer.engineerName}</p>
                  <p className="text-sm text-muted-foreground">Execution Score: <span className="font-semibold text-red-600">{lowPerformer.executionScore}%</span></p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Comparison Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">مقارنة أداء المهندسين</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد بيانات لهذا الشهر</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}%`]} />
                <Legend />
                <Bar dataKey="Execution Score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="نسبة الإغلاق" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="إتمام المعاينات" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Individual Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((eng, rank) => (
          <Card key={eng.engineerId} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rank === 0 ? 'bg-amber-100 text-amber-700' : rank === 1 ? 'bg-slate-100 text-slate-600' : rank === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                    {rank + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{eng.engineerName}</p>
                    <p className="text-xs text-muted-foreground">{eng.department ?? 'مبيعات'}</p>
                  </div>
                </div>
                <Badge className={`text-xs border ${getRatingColor(eng.rating)}`}>{eng.rating}</Badge>
              </div>

              {/* Execution Score */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Execution Score</span>
                  <span className="font-bold" style={{ color: getScoreColor(eng.executionScore) }}>{eng.executionScore}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${eng.executionScore}%`, background: getScoreColor(eng.executionScore) }} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold text-emerald-600">{eng.tasksCompleted}</div>
                  <div className="text-xs text-muted-foreground">مهمة منجزة</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold text-indigo-600">{eng.visitsCount}</div>
                  <div className="text-xs text-muted-foreground">معاينة</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="text-lg font-bold text-amber-600">{eng.closedWon}</div>
                  <div className="text-xs text-muted-foreground">صفقة</div>
                </div>
              </div>

              {/* Additional Rates */}
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">عدد المعاينات</span>
                  <span className="font-medium">{eng.visitsCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">عدد الصفقات</span>
                  <span className="font-medium">{eng.dealsCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">قيمة الصفقات المغلقة</span>
                  <span className="font-medium">{eng.totalDealValue.toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sorted.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">لا توجد بيانات لهذا الشهر</div>
      )}
    </div>
  );
}
