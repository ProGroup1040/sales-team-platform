import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Target, Calculator, TrendingUp, Calendar, Save } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const now = new Date();
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function PlanningModule() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [targetAmount, setTargetAmount] = useState('');
  const [avgDealValue, setAvgDealValue] = useState('85000');
  const [closingRate, setClosingRate] = useState('35');
  const [visitToClosingRate, setVisitToClosingRate] = useState('45');
  const [notes, setNotes] = useState('');

  const utils = trpc.useUtils();
  const { data: targetData, isLoading } = trpc.planning.getTarget.useQuery({ year, month });
  const { data: trendData } = trpc.sales.trend.useQuery({ months: 6 });
  const { data: salesStats } = trpc.sales.monthlyStats.useQuery({ year, month });
  const currentTarget = targetData;

  const setTargetMutation = trpc.planning.setTarget.useMutation({
    onSuccess: () => { toast.success('تم حفظ الهدف'); utils.planning.getTarget.invalidate(); utils.sales.trend.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });

  // Load existing target data when available
  // currentTarget is fetched above

  const calculations = useMemo(() => {
    const target = parseFloat(targetAmount || String(currentTarget?.targetAmount ?? 0));
    const avgDeal = parseFloat(avgDealValue || String(currentTarget?.avgDealValue ?? 85000));
    const closing = parseFloat(closingRate || String((currentTarget?.closingRate ?? 0.35) * 100)) / 100;
    const visitClosing = parseFloat(visitToClosingRate || String((currentTarget?.visitToClosingRate ?? 0.45) * 100)) / 100;

    if (!target || !avgDeal || !closing || !visitClosing) return null;

    const dealsNeeded = Math.ceil(target / avgDeal);
    const visitsNeeded = Math.ceil(dealsNeeded / visitClosing);
    const leadsNeeded = Math.ceil(visitsNeeded / 0.7);

    return { target, avgDeal, closing, visitClosing, dealsNeeded, visitsNeeded, leadsNeeded };
  }, [targetAmount, avgDealValue, closingRate, visitToClosingRate, currentTarget]);

  const handleSave = () => {
    if (!targetAmount) return toast.error('يرجى إدخال الهدف');
    setTargetMutation.mutate({
      year, month,
      targetAmount: parseFloat(targetAmount),
      avgDealValue: parseFloat(avgDealValue),
      closingRate: parseFloat(closingRate) / 100,
      visitToClosingRate: parseFloat(visitToClosingRate) / 100,
      notes,
    });
  };

  const historyChartData = trendData?.map(h => ({
    name: h.label,
    الهدف: h.target,
    'الفعلي': h.actual,
    'نسبة التحقيق': h.achievementRate,
  })) ?? [];

  const achievementRate = salesStats?.achievementRate ?? 0;
  const currentActual = salesStats?.actual ?? 0;
  const currentTargetAmount = parseFloat(String(currentTarget?.targetAmount ?? 0));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">موديول تخطيط الأهداف</h1>
          <p className="text-sm text-muted-foreground">تخطيط الأهداف وحساب المتطلبات</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-8 text-sm border rounded-md px-2 bg-background" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className="h-8 text-sm border rounded-md px-2 bg-background" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Current Month Status */}
      {currentTargetAmount > 0 && (
        <Card className={`border-2 ${achievementRate >= 100 ? 'border-emerald-300 bg-emerald-50/50' : achievementRate >= 70 ? 'border-indigo-300 bg-indigo-50/50' : achievementRate >= 50 ? 'border-amber-300 bg-amber-50/50' : 'border-red-300 bg-red-50/50'}`}>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">هدف {MONTHS[month - 1]} {year}</p>
                <p className="text-3xl font-bold">{currentTargetAmount.toLocaleString('ar-EG')} ج.م</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">الفعلي حتى الآن</p>
                <p className="text-2xl font-bold text-indigo-600">{currentActual.toLocaleString('ar-EG')} ج.م</p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${achievementRate >= 100 ? 'text-emerald-600' : achievementRate >= 70 ? 'text-indigo-600' : achievementRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {achievementRate}%
                </div>
                <p className="text-xs text-muted-foreground">نسبة التحقيق</p>
              </div>
            </div>
            <Progress value={Math.min(achievementRate, 100)} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>المتبقي: {Math.max(0, currentTargetAmount - currentActual).toLocaleString('ar-EG')} ج.م</span>
              <span>{achievementRate >= 100 ? '🎉 تم تحقيق الهدف!' : achievementRate >= 80 ? '💪 قريب من الهدف' : achievementRate >= 50 ? '⚡ يحتاج تسريع' : '🚨 يحتاج مراجعة'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Target Setting Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" />إدخال الهدف الشهري</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>الهدف الشهري (ج.م) *</Label>
              <Input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder={currentTarget ? String(currentTarget.targetAmount) : 'مثال: 500000'} className="text-lg font-semibold" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>متوسط قيمة الصفقة (ج.م)</Label>
                <Input type="number" value={avgDealValue} onChange={e => setAvgDealValue(e.target.value)} />
              </div>
              <div>
                <Label>نسبة الإغلاق (%)</Label>
                <Input type="number" value={closingRate} onChange={e => setClosingRate(e.target.value)} min="1" max="100" />
              </div>
            </div>
            <div>
              <Label>نسبة تحويل المعاينة لصفقة (%)</Label>
              <Input type="number" value={visitToClosingRate} onChange={e => setVisitToClosingRate(e.target.value)} min="1" max="100" />
            </div>
            <Button onClick={handleSave} disabled={setTargetMutation.isPending} className="w-full gap-2">
              <Save className="w-4 h-4" />
              {setTargetMutation.isPending ? 'جاري الحفظ...' : 'حفظ الهدف'}
            </Button>
          </CardContent>
        </Card>

        {/* Calculations */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" />المتطلبات المحسوبة</CardTitle></CardHeader>
          <CardContent>
            {calculations ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30">
                  <p className="text-xs text-indigo-600 font-medium mb-1">الهدف المطلوب تحقيقه</p>
                  <p className="text-2xl font-bold text-indigo-700">{calculations.target.toLocaleString('ar-EG')} ج.م</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{calculations.dealsNeeded}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">صفقة مطلوبة</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-center">
                    <p className="text-2xl font-bold text-amber-700">{calculations.visitsNeeded}</p>
                    <p className="text-xs text-amber-600 mt-0.5">معاينة مطلوبة</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 text-center">
                    <p className="text-2xl font-bold text-purple-700">{calculations.leadsNeeded}</p>
                    <p className="text-xs text-purple-600 mt-0.5">عميل محتمل مطلوب</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">متوسط قيمة الصفقة</span>
                    <span className="font-medium">{calculations.avgDeal.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">نسبة الإغلاق</span>
                    <span className="font-medium">{(calculations.closing * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">نسبة تحويل المعاينة</span>
                    <span className="font-medium">{(calculations.visitClosing * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                <Calculator className="w-10 h-10 opacity-30" />
                <p className="text-sm">أدخل الهدف الشهري لحساب المتطلبات</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Chart */}
      {historyChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">تاريخ الأهداف والتحقيق (6 أشهر)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={historyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString('ar-EG')} ج.م`]} />
                <Bar dataKey="الهدف" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Bar dataKey="الفعلي" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
