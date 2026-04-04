import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Target, BarChart2 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from "recharts";

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function SalesModule() {
  const [selectedYear, setSelectedYear] = useState(YEAR);
  const [selectedMonth, setSelectedMonth] = useState(MONTH);

  const { data: stats } = trpc.sales.monthlyStats.useQuery({ year: selectedYear, month: selectedMonth });
  const { data: trend } = trpc.sales.trend.useQuery({ months: 12 });

  const trendChartData = trend?.map(t => ({
    name: t.label,
    الهدف: t.target,
    'المبيعات': t.actual,
    'عدد الصفقات': (t as any).count ?? 0,
  })) ?? [];

  const achievementRate = stats?.achievementRate ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">موديول المبيعات</h1>
          <p className="text-sm text-muted-foreground">تحليل المبيعات ومقارنة الأهداف</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{[YEAR - 1, YEAR].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2"><div className="p-2 rounded-xl bg-indigo-100"><Target className="w-4 h-4 text-indigo-600" /></div><p className="text-xs text-muted-foreground">الهدف الشهري</p></div>
          <p className="text-xl font-bold">{(stats?.target ?? 0).toLocaleString('ar-EG')}</p><p className="text-xs text-muted-foreground">ج.م</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2"><div className="p-2 rounded-xl bg-emerald-100"><DollarSign className="w-4 h-4 text-emerald-600" /></div><p className="text-xs text-muted-foreground">المبيعات الفعلية</p></div>
          <p className="text-xl font-bold text-emerald-600">{(stats?.actual ?? 0).toLocaleString('ar-EG')}</p><p className="text-xs text-muted-foreground">ج.م</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2"><div className="p-2 rounded-xl bg-amber-100"><TrendingUp className="w-4 h-4 text-amber-600" /></div><p className="text-xs text-muted-foreground">نسبة التحقيق</p></div>
          <p className={`text-xl font-bold ${achievementRate >= 100 ? 'text-emerald-600' : achievementRate >= 70 ? 'text-indigo-600' : 'text-amber-600'}`}>{achievementRate}%</p>
          <p className="text-xs text-muted-foreground">{achievementRate >= 100 ? 'تم تحقيق الهدف 🎉' : 'من الهدف'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2"><div className="p-2 rounded-xl bg-purple-100"><BarChart2 className="w-4 h-4 text-purple-600" /></div><p className="text-xs text-muted-foreground">عدد الصفقات</p></div>
          <p className="text-xl font-bold text-purple-600">{trend?.find(t => t.year === selectedYear && t.month === selectedMonth) ? (trend.find(t => t.year === selectedYear && t.month === selectedMonth) as any).count ?? 0 : 0}</p><p className="text-xs text-muted-foreground">صفقة هذا الشهر</p>
        </CardContent></Card>
      </div>

      {/* Achievement Progress */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">تقدم الهدف الشهري - {MONTHS[selectedMonth - 1]} {selectedYear}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">المبيعات الفعلية</span>
            <span className="font-bold text-xl">{achievementRate}%</span>
          </div>
          <Progress value={Math.min(achievementRate, 100)} className="h-4" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>الفعلي: {(stats?.actual ?? 0).toLocaleString('ar-EG')} ج.م</span>
            <span>المتبقي: {Math.max(0, (stats?.target ?? 0) - (stats?.actual ?? 0)).toLocaleString('ar-EG')} ج.م</span>
            <span>الهدف: {(stats?.target ?? 0).toLocaleString('ar-EG')} ج.م</span>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">اتجاه المبيعات (12 شهر)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="targetGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString('ar-EG')} ج.م`]} />
              <Legend />
              <Area type="monotone" dataKey="الهدف" stroke="#10b981" fill="url(#targetGrad2)" strokeWidth={2} />
              <Area type="monotone" dataKey="المبيعات" stroke="#6366f1" fill="url(#salesGrad2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Deals Count */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">عدد الصفقات الشهرية</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="عدد الصفقات" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
