import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSectionPermission } from "@/hooks/useSectionPermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Target, Calculator, TrendingUp, Calendar, Save, Users, User,
  BookOpen, CheckCircle2, AlertCircle, Edit3, Plus, Zap, RefreshCw,
  Wand2, AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const now = new Date();
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const DEVELOPMENT_AREAS: Record<string, string> = {
  closing: 'مهارة الإغلاق',
  negotiation: 'التفاوض',
  render_quality: 'جودة الرندر',
  presentation: 'العرض التقديمي',
  design_quality: 'جودة التصميم',
  client_communication: 'التواصل مع العميل',
  time_management: 'إدارة الوقت',
  other: 'أخرى',
};

const EVALUATION_METHODS: Record<string, string> = {
  meeting_review: 'مراجعة اجتماع',
  design_review: 'مراجعة تصميم',
  render_review: 'مراجعة رندر',
  manager_review: 'مراجعة المدير',
  self_review: 'تقييم ذاتي',
};

const OPERATIONAL_ITEMS = [
  { key: 'meetings',       label: 'الاجتماعات',          targetKey: 'targetMeetings',      icon: '🤝' },
  { key: 'design2D',      label: '2D Design',            targetKey: 'target2D',            icon: '📐' },
  { key: 'design3D',      label: '3D Modeling',          targetKey: 'target3D',            icon: '🏗️' },
  { key: 'render',        label: 'Render',               targetKey: 'targetRender',        icon: '🎨' },
  { key: 'quotations',    label: 'عروض الأسعار',         targetKey: 'targetQuotations',    icon: '📋' },
  { key: 'presentations', label: 'العروض التقديمية',     targetKey: 'targetPresentations', icon: '📊' },
  { key: 'closings',      label: 'الإغلاقات',            targetKey: 'targetClosings',      icon: '🔒' },
  { key: 'contract',      label: 'Contract (عقد)',      targetKey: 'targetContract',      icon: '📝' },
  { key: 'work_order',    label: 'Work Order (أمر شغل)', targetKey: 'targetWorkOrder',     icon: '🔧' },
];

// ─── Tab 1: Company Goals ──────────────────────────────────────────────────────
function CompanyGoalsTab({ year, month }: { year: number; month: number }) {
  const utils = trpc.useUtils();
  const { data: goalData, isLoading: goalLoading } = trpc.planning.getCompanyGoal.useQuery({ year, month });
  const { data: progressData } = trpc.planning.getCompanyGoalProgress.useQuery({ year, month });
  const { data: trendData } = trpc.sales.trend.useQuery({ months: 6 });

  const [revenueTarget, setRevenueTarget] = useState('');
  const [avgDealValue, setAvgDealValue] = useState('85000');
  const [closingRateTarget, setClosingRateTarget] = useState('35');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState(false);

  // تحميل البيانات المحفوظة عند فتح الصفحة أو تغيير الشهر
  useEffect(() => {
    if (!goalLoading) {
      if (goalData) {
        setRevenueTarget(String(parseFloat(goalData.revenueTarget as string)));
        setAvgDealValue(String(parseFloat(goalData.avgDealValue as string)));
        setClosingRateTarget(String(parseFloat(goalData.closingRateTarget as string)));
        // تحويل التواريخ إلى صيغة YYYY-MM-DD
        if (goalData.periodFrom) {
          const d = new Date(goalData.periodFrom as unknown as string);
          if (!isNaN(d.getTime())) setPeriodFrom(d.toISOString().split('T')[0]);
        } else {
          // افتراضي: أول يوم في الشهر
          setPeriodFrom(`${year}-${String(month).padStart(2, '0')}-01`);
        }
        if (goalData.periodTo) {
          const d = new Date(goalData.periodTo as unknown as string);
          if (!isNaN(d.getTime())) setPeriodTo(d.toISOString().split('T')[0]);
        } else {
          // افتراضي: آخر يوم في الشهر
          const lastDay = new Date(year, month, 0).getDate();
          setPeriodTo(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
        }
        setNotes(goalData.notes ?? '');
      } else {
        // لا يوجد هدف محفوظ - استخدام القيم الافتراضية
        setRevenueTarget('');
        setAvgDealValue('85000');
        setClosingRateTarget('35');
        setPeriodFrom(`${year}-${String(month).padStart(2, '0')}-01`);
        const lastDay = new Date(year, month, 0).getDate();
        setPeriodTo(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
        setNotes('');
      }
      setInitialized(true);
    }
  }, [goalData, goalLoading, year, month]);

  const setGoalMut = trpc.planning.setCompanyGoal.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ هدف الشركة بنجاح ✔️');
      utils.planning.getCompanyGoal.invalidate();
      utils.planning.getCompanyGoalProgress.invalidate();
      utils.invalidate(); // تحديث جميع الموديولات المرتبطة
    },
    onError: (err: any) => {
      const msg = err?.message || err?.data?.message || '';
      if (msg.includes('UNAUTHORIZED') || msg.includes('تسجيل')) {
        toast.error('يجب تسجيل الدخول أولاً لحفظ الهدف');
      } else {
        toast.error(`حدث خطأ في الحفظ: ${msg || 'خطأ غير معروف'}`);
      }
    },
  });

  const calc = useMemo(() => {
    const rev = parseFloat(revenueTarget || String(goalData?.revenueTarget ?? 0));
    const avg = parseFloat(avgDealValue || String(goalData?.avgDealValue ?? 85000));
    const rate = parseFloat(closingRateTarget || String(goalData?.closingRateTarget ?? 35)) / 100;
    if (!rev || !avg || !rate) return null;
    const dealsNeeded = Math.ceil(rev / avg);
    const visitsNeeded = Math.ceil(dealsNeeded / rate);
    const leadsNeeded = Math.ceil(visitsNeeded / 0.7);
    const pipelineValue = dealsNeeded * avg * (1 / rate);
    return { rev, avg, rate, dealsNeeded, visitsNeeded, leadsNeeded, pipelineValue };
  }, [revenueTarget, avgDealValue, closingRateTarget, goalData]);

  const historyData = trendData?.map((h: any) => ({
    name: h.label,
    الهدف: h.target,
    'الفعلي': h.actual,
  })) ?? [];

  const prog = progressData;
  const goal = goalData;

  return (
    <div className="space-y-6">
      {/* Current Progress */}
      {goal && prog && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'الإيراد الفعلي',
              value: `${prog.actual.revenue.toLocaleString('ar-EG')} ج.م`,
              target: `من ${parseFloat(goal.revenueTarget).toLocaleString('ar-EG')} ج.م`,
              pct: prog.progress.revenueProgress,
            },
            {
              label: 'الصفقات المغلقة',
              value: String(prog.actual.deals),
              target: `من ${goal.requiredDeals ?? 0} صفقة`,
              pct: prog.progress.dealsProgress,
            },
            {
              label: 'المعاينات',
              value: String(prog.actual.visits),
              target: `من ${goal.requiredVisits ?? 0} معاينة`,
              pct: prog.progress.visitsProgress,
            },
            {
              label: 'نسبة الإغلاق الفعلية',
              value: `${prog.actual.closingRate}%`,
              target: `هدف: ${goal.closingRateTarget}%`,
              pct: prog.progress.closingRateProgress,
            },
          ].map((item, i) => {
            const color = item.pct >= 100 ? 'emerald' : item.pct >= 70 ? 'indigo' : item.pct >= 50 ? 'amber' : 'red';
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-xl font-bold text-${color}-600`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.target}</p>
                  <Progress value={Math.min(item.pct, 100)} className="h-1.5 mt-2" />
                  <p className="text-xs font-medium mt-1">{item.pct}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Goal Setting + Calculations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              تحديد هدف الشركة الشهري
              {goal && (
                <Badge variant="outline" className="mr-auto text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30">
                  ✔ محفوظ لشهر {MONTHS[month - 1]} {year}
                </Badge>
              )}
              {!goal && !goalLoading && (
                <Badge variant="outline" className="mr-auto text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30">
                  ⚠ لا يوجد هدف محفوظ لهذا الشهر
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* عرض الهدف المحفوظ الحالي */}
            {goal && (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">الهدف الحالي لشهر {MONTHS[month - 1]}</p>
                  <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{parseFloat(goal.revenueTarget as string).toLocaleString('ar-EG')} ج.م</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">نسبة الإغلاق: {parseFloat(goal.closingRateTarget as string)}%</p>
                  <p className="text-xs text-muted-foreground">صفقات مطلوبة: {goal.requiredDeals ?? 0}</p>
                </div>
              </div>
            )}
            <div>
              <Label>الهدف الإيرادي (ج.م) *</Label>
              <Input
                type="number"
                value={revenueTarget}
                onChange={e => setRevenueTarget(e.target.value)}
                placeholder={goal ? String(parseFloat(goal.revenueTarget as string)) : 'مثال: 2000000'}
                className="text-lg font-semibold mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>متوسط قيمة الصفقة (ج.م)</Label>
                <Input type="number" value={avgDealValue} onChange={e => setAvgDealValue(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>نسبة الإغلاق المستهدفة (%)</Label>
                <Input type="number" value={closingRateTarget} onChange={e => setClosingRateTarget(e.target.value)} min="1" max="100" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  من تاريخ
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="date"
                    value={periodFrom}
                    onChange={e => {
                      const val = e.target.value;
                      if (periodTo && val > periodTo) {
                        toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
                        return;
                      }
                      setPeriodFrom(val);
                    }}
                    className="cursor-pointer"
                    style={{ colorScheme: 'light' }}
                  />
                  {periodFrom && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {new Date(periodFrom).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  إلى تاريخ
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="date"
                    value={periodTo}
                    min={periodFrom || undefined}
                    onChange={e => {
                      const val = e.target.value;
                      if (periodFrom && val < periodFrom) {
                        toast.error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
                        return;
                      }
                      setPeriodTo(val);
                    }}
                    className="cursor-pointer"
                    style={{ colorScheme: 'light' }}
                  />
                  {periodTo && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {new Date(periodTo).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية..." className="mt-1 h-20 resize-none" />
            </div>
            <Button
              onClick={() => {
                if (!revenueTarget) return toast.error('يرجى إدخال الهدف الإيرادي');
                setGoalMut.mutate({
                  year, month,
                  revenueTarget: parseFloat(revenueTarget),
                  avgDealValue: parseFloat(avgDealValue),
                  closingRateTarget: parseFloat(closingRateTarget),
                  periodFrom: periodFrom || undefined,
                  periodTo: periodTo || undefined,
                  notes: notes || undefined,
                });
              }}
              disabled={setGoalMut.isPending}
              className="w-full gap-2"
            >
              <Save className="w-4 h-4" />
              {setGoalMut.isPending ? 'جاري الحفظ...' : 'حفظ هدف الشركة'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-500" />
              الحسابات التلقائية
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calc ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30">
                  <p className="text-xs text-indigo-600 font-medium mb-1">الهدف الإيرادي</p>
                  <p className="text-2xl font-bold text-indigo-700">{calc.rev.toLocaleString('ar-EG')} ج.م</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{calc.dealsNeeded}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">صفقة مطلوبة</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-center">
                    <p className="text-2xl font-bold text-amber-700">{calc.visitsNeeded}</p>
                    <p className="text-xs text-amber-600 mt-0.5">معاينة مطلوبة</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 text-center">
                    <p className="text-2xl font-bold text-purple-700">{calc.leadsNeeded}</p>
                    <p className="text-xs text-purple-600 mt-0.5">عميل محتمل</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-center">
                    <p className="text-xl font-bold text-rose-700">{(calc.pipelineValue / 1_000_000).toFixed(1)}M</p>
                    <p className="text-xs text-rose-600 mt-0.5">حجم Pipeline</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm border-t pt-3">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">متوسط قيمة الصفقة</span>
                    <span className="font-medium">{calc.avg.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">نسبة الإغلاق المستهدفة</span>
                    <span className="font-medium">{(calc.rate * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">* تحويل المعاينة لعميل = 70% افتراضي</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                <Calculator className="w-10 h-10 opacity-30" />
                <p className="text-sm">أدخل الهدف الإيرادي لحساب المتطلبات تلقائياً</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Chart */}
      {historyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              تاريخ الأهداف والتحقيق (6 أشهر)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={historyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString('ar-EG')} ج.م`]} />
                <Bar dataKey="الهدف" fill="#6366f1" radius={[4,4,0,0]} opacity={0.7} />
                <Bar dataKey="الفعلي" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 2: Individual Goals (Merged with Personal Development + Auto Distribution) ─
function IndividualGoalsTab({ year, month }: { year: number; month: number }) {
  const utils = trpc.useUtils();
  const { data: engineers } = trpc.engineers.list.useQuery();
  const { data: perfData } = trpc.sales.engineersPerformance.useQuery({ year, month });
  const { data: distPreview } = trpc.planning.previewDistribution.useQuery({ year, month });

  const [selectedEngId, setSelectedEngId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'financial' | 'operational' | 'personal'>('financial');
  const [editingFinancial, setEditingFinancial] = useState(false);
  const [editingOperational, setEditingOperational] = useState(false);
  const [financialTarget, setFinancialTarget] = useState('');
  const [manpower, setManpower] = useState('1');
  const [opTargets, setOpTargets] = useState<Record<string, string>>({});
  const [showDistPreview, setShowDistPreview] = useState(false);

  // Personal Development state
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newObjective, setNewObjective] = useState('');
  const [newArea, setNewArea] = useState('other');
  const [newMethod, setNewMethod] = useState('manager_review');
  const [newReviewerRole, setNewReviewerRole] = useState('manager');
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const { data: opData } = trpc.kpi.engineerOperationalTargets.useQuery(
    { engineerId: selectedEngId ?? 0, year, month },
    { enabled: !!selectedEngId }
  );

  const { data: personalGoals, isLoading: loadingPersonal } = trpc.planning.getPersonalGoals.useQuery(
    { engineerId: selectedEngId ?? 0, year, month },
    { enabled: !!selectedEngId }
  );

  const setFinancialMut = trpc.sales.setEngineerTarget.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ الهدف المالي');
      utils.sales.engineersPerformance.invalidate();
      setEditingFinancial(false);
    },
    onError: (e) => toast.error(`خطأ في الحفظ: ${e.message}`),
  });

  const setOperationalMut = trpc.sales.setOperationalTargets.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ الأهداف التشغيلية');
      utils.kpi.engineerOperationalTargets.invalidate();
      setEditingOperational(false);
    },
    onError: (e) => toast.error(`خطأ في الحفظ: ${e.message}`),
  });

  const applyDistMut = trpc.planning.applyDistribution.useMutation({
    onSuccess: (res) => {
      toast.success(`تم توزيع الأهداف على ${res.count} مهندس`);
      utils.sales.engineersPerformance.invalidate();
      utils.kpi.engineerOperationalTargets.invalidate();
      utils.planning.previewDistribution.invalidate();
    },
    onError: (e) => toast.error(`خطأ: ${e.message}`),
  });

  const manualOverrideMut = trpc.planning.manualOverride.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ التعديل اليدوي');
      utils.sales.engineersPerformance.invalidate();
      utils.kpi.engineerOperationalTargets.invalidate();
      setEditingFinancial(false);
      setEditingOperational(false);
    },
    onError: (e) => toast.error(`خطأ: ${e.message}`),
  });

  const addGoalMut = trpc.planning.setPersonalGoal.useMutation({
    onSuccess: () => {
      toast.success('تم إضافة الهدف الشخصي');
      utils.planning.getPersonalGoals.invalidate();
      setShowAddGoalForm(false);
      setNewObjective('');
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const updateGoalMut = trpc.planning.setPersonalGoal.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث التقييم');
      utils.planning.getPersonalGoals.invalidate();
      setEditingGoalId(null);
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const salesEngineers = (engineers ?? []).filter((e: any) =>
    !['admin', 'system_user'].includes(e.role ?? '')
  );

  const selectedEng = selectedEngId
    ? (perfData?.find((e: any) => e.engineerId === selectedEngId) ?? null)
    : null;

  const handleSelectEng = (id: number) => {
    setSelectedEngId(id);
    setEditingFinancial(false);
    setEditingOperational(false);
    setActiveSection('financial');
    const eng = perfData?.find((e: any) => e.engineerId === id);
    if (eng) {
      setFinancialTarget(eng.targetAmount > 0 ? String(eng.targetAmount) : '');
      setManpower(String(eng.manpower ?? 1));
    }
  };

  const handleSaveOperational = () => {
    if (!selectedEngId) return;
    const parsed: Record<string, number> = {};
    OPERATIONAL_ITEMS.forEach(item => {
      const val = opTargets[item.targetKey];
      if (val !== undefined && val !== '') parsed[item.targetKey] = parseInt(val) || 0;
    });
    manualOverrideMut.mutate({ engineerId: selectedEngId, year, month, ...parsed });
  };

  const scoredGoals = (personalGoals ?? []).filter((g: any) => g.score !== null);
  const avgScore = scoredGoals.length > 0
    ? Math.round(scoredGoals.reduce((s: number, g: any) => s + (g.score ?? 0), 0) / scoredGoals.length)
    : null;

  return (
    <div className="space-y-6">

      {/* ── Auto Distribution Banner */}
      {distPreview && (
        <Card className="border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/10">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                  <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-indigo-800 dark:text-indigo-200">توزيع تلقائي جاهز</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                    إيراد الشركة: {distPreview.companyGoal.revenueTarget.toLocaleString('ar-EG')} ج.م → كل مهندس: {distPreview.perEngineer.targetAmount.toLocaleString('ar-EG')} ج.م
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-indigo-700 dark:text-indigo-300">
                    <span>📊 {distPreview.companyGoal.dealsNeeded} صفقة مطلوبة</span>
                    <span>👤 {distPreview.companyGoal.leadsNeeded} عميل محتمل</span>
                    <span>🤝 {distPreview.companyGoal.meetingsNeeded} اجتماع</span>
                    <span>📈 نسبة إغلاق: {distPreview.companyGoal.closingRate.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm" variant="outline" className="h-8 text-xs gap-1"
                  onClick={() => setShowDistPreview(!showDistPreview)}
                >
                  {showDistPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  تفاصيل
                </Button>
                <Button
                  size="sm" className="h-8 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => applyDistMut.mutate({ year, month })}
                  disabled={applyDistMut.isPending}
                >
                  {applyDistMut.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  تطبيق التوزيع
                </Button>
              </div>
            </div>

            {/* Distribution Preview Table */}
            {showDistPreview && (
              <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800/50">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-3">معاينة التوزيع لكل مهندس:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    { label: 'الهدف المالي', value: `${(distPreview.perEngineer.targetAmount / 1000).toFixed(0)}k ج.م`, color: 'indigo' },
                    { label: 'الصفقات', value: distPreview.perEngineer.targetDeals, color: 'emerald' },
                    { label: 'العملاء المحتملين', value: distPreview.perEngineer.targetLeads, color: 'amber' },
                    { label: 'الاجتماعات', value: distPreview.perEngineer.targetMeetings, color: 'purple' },
                    { label: 'عروض الأسعار', value: distPreview.perEngineer.targetQuotations, color: 'rose' },
                    { label: 'العروض التقديمية', value: distPreview.perEngineer.targetPresentations, color: 'cyan' },
                    { label: 'Render', value: distPreview.perEngineer.targetRender, color: 'orange' },
                    { label: 'الإغلاقات', value: distPreview.perEngineer.targetClosings, color: 'green' },
                  ].map((item, i) => (
                    <div key={i} className="p-2 rounded-lg bg-white dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/30 text-center">
                      <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Engineer Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {salesEngineers.map((eng: any) => {
          const perf = perfData?.find((p: any) => p.engineerId === eng.id);
          const pct = perf?.achievementPct ?? 0;
          const isSelected = selectedEngId === eng.id;
          return (
            <button
              key={eng.id}
              onClick={() => handleSelectEng(eng.id)}
              className={`p-3 rounded-xl border-2 text-right transition-all ${isSelected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-border hover:border-indigo-300 bg-card'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {eng.name.charAt(0)}
                </div>
                <div className="text-sm font-semibold truncate">{eng.name}</div>
              </div>
              <div className={`text-lg font-bold ${pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-indigo-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {pct}%
              </div>
              <div className="text-xs text-muted-foreground">تحقيق مالي</div>
            </button>
          );
        })}
      </div>

      {!selectedEngId && (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
          <Users className="w-8 h-8 opacity-30" />
          <p className="text-sm">اختر مهندساً لعرض أهدافه الكاملة</p>
        </div>
      )}

      {/* ── Engineer Detail Panel */}
      {selectedEngId && selectedEng && (
        <div className="space-y-4">
          {/* Section Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
            {[
              { id: 'financial' as const, label: 'الهدف المالي', icon: TrendingUp },
              { id: 'operational' as const, label: 'الأهداف التشغيلية', icon: Target },
              { id: 'personal' as const, label: 'التطوير الشخصي', icon: BookOpen },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeSection === tab.id
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── SECTION 1: Financial Target */}
          {activeSection === 'financial' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    الهدف المالي — {selectedEng.engineerName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Manual Override Flag */}
                    <Badge variant="outline" className="text-xs gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      تعديل يدوي
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditingFinancial(!editingFinancial)}>
                      <Edit3 className="w-3 h-3" />
                      {editingFinancial ? 'إلغاء' : 'تعديل'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">الهدف</p>
                    <p className="text-lg font-bold">
                      {selectedEng.targetAmount > 0 ? `${(selectedEng.targetAmount / 1000).toFixed(0)}k` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">ج.م</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">الفعلي</p>
                    <p className="text-lg font-bold text-indigo-600">{(selectedEng.actualSales / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground">ج.م</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">التحقيق</p>
                    <p className={`text-lg font-bold ${selectedEng.achievementPct >= 100 ? 'text-emerald-600' : selectedEng.achievementPct >= 70 ? 'text-indigo-600' : selectedEng.achievementPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {selectedEng.achievementPct}%
                    </p>
                  </div>
                </div>
                <Progress value={Math.min(selectedEng.achievementPct, 100)} className="h-2" />
                {selectedEng.targetAmount > 0 && selectedEng.remaining > 0 && (
                  <p className="text-xs text-muted-foreground">
                    المتبقي: {selectedEng.remaining.toLocaleString('ar-EG')} ج.م
                  </p>
                )}
                {editingFinancial && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      تعديل يدوي — سيتم كسر الربط التلقائي لهذا المهندس
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">الهدف المالي (ج.م)</Label>
                        <Input type="number" value={financialTarget} onChange={e => setFinancialTarget(e.target.value)} className="h-8 text-sm mt-1" placeholder="مثال: 500000" />
                      </div>
                      <div>
                        <Label className="text-xs">عدد الأفراد</Label>
                        <Input type="number" value={manpower} onChange={e => setManpower(e.target.value)} className="h-8 text-sm mt-1" min="0.5" step="0.5" />
                      </div>
                    </div>
                    <Button
                      size="sm" className="w-full h-8 text-xs gap-1"
                      onClick={() => {
                        if (!financialTarget) return toast.error('أدخل الهدف');
                        manualOverrideMut.mutate({
                          engineerId: selectedEngId, year, month,
                          targetAmount: parseFloat(financialTarget),
                        });
                      }}
                      disabled={manualOverrideMut.isPending}
                    >
                      <Save className="w-3 h-3" />
                      حفظ الهدف المالي
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── SECTION 2: Operational Targets */}
          {activeSection === 'operational' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-500" />
                    الأهداف التشغيلية — {selectedEng.engineerName}
                  </CardTitle>
                  <Button
                    size="sm" variant="ghost" className="h-7 text-xs gap-1"
                    onClick={() => {
                      if (!editingOperational && opData) {
                        const init: Record<string, string> = {};
                        OPERATIONAL_ITEMS.forEach(item => {
                          init[item.targetKey] = String((opData.targets as any)[item.key] ?? 0);
                        });
                        setOpTargets(init);
                      } else if (!editingOperational) {
                        const init: Record<string, string> = {};
                        OPERATIONAL_ITEMS.forEach(item => { init[item.targetKey] = '0'; });
                        setOpTargets(init);
                      }
                      setEditingOperational(!editingOperational);
                    }}
                  >
                    <Edit3 className="w-3 h-3" />
                    {editingOperational ? 'إلغاء' : 'تعديل'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {opData ? (
                  <div className="space-y-2">
                    {OPERATIONAL_ITEMS.map(item => {
                      const actual = (opData.actuals as any)[item.key] ?? 0;
                      const target = (opData.targets as any)[item.key] ?? 0;
                      const pct = (opData.percentages as any)[item.key] ?? 0;
                      return (
                        <div key={item.key} className="flex items-center gap-3">
                          <span className="text-base w-6 shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-medium">{item.label}</span>
                              <span className={`font-bold ${pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-indigo-600' : pct >= 50 ? 'text-amber-600' : target === 0 ? 'text-muted-foreground' : 'text-red-600'}`}>
                                {target === 0 ? '—' : `${actual}/${target} (${pct}%)`}
                              </span>
                            </div>
                            {target > 0 && (
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-indigo-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                          {editingOperational && (
                            <Input
                              type="number"
                              value={opTargets[item.targetKey] ?? ''}
                              onChange={e => setOpTargets(prev => ({ ...prev, [item.targetKey]: e.target.value }))}
                              className="h-7 w-16 text-xs text-center shrink-0"
                              min="0"
                            />
                          )}
                        </div>
                      );
                    })}
                    {editingOperational && (
                      <>
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-xs text-amber-700 flex items-center gap-1.5 mt-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          تعديل يدوي — سيتم كسر الربط التلقائي
                        </div>
                        <Button size="sm" className="w-full h-8 text-xs gap-1 mt-1" onClick={handleSaveOperational} disabled={manualOverrideMut.isPending}>
                          <Save className="w-3 h-3" />
                          حفظ الأهداف التشغيلية
                        </Button>
                      </>
                    )}
                    {opData.diagnosis && opData.diagnosis !== 'no_data' && (
                      <div className={`mt-3 p-3 rounded-lg text-xs ${
                        opData.diagnosis === 'on_track' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border border-emerald-200' :
                        opData.diagnosis === 'closing' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border border-amber-200' :
                        'bg-red-50 dark:bg-red-950/20 text-red-700 border border-red-200'
                      }`}>
                        {opData.diagnosis === 'on_track' ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : <AlertCircle className="w-3.5 h-3.5 inline mr-1" />}
                        {opData.diagnosis === 'on_track' && 'الأداء على المسار الصحيح'}
                        {opData.diagnosis === 'closing' && 'النشاط كافٍ لكن نسبة الإغلاق تحتاج تحسين'}
                        {opData.diagnosis === 'activity' && 'عدد الأنشطة أقل من المطلوب'}
                        {opData.diagnosis === 'both' && 'كل من النشاط والإغلاق يحتاجان تحسين'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                    <Target className="w-8 h-8 opacity-30" />
                    <p className="text-sm">لا توجد أهداف تشغيلية محددة</p>
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => {
                        const init: Record<string, string> = {};
                        OPERATIONAL_ITEMS.forEach(item => { init[item.targetKey] = '0'; });
                        setOpTargets(init);
                        setEditingOperational(true);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      تحديد أهداف تشغيلية
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── SECTION 3: Personal Development */}
          {activeSection === 'personal' && (
            <div className="space-y-4">
              {/* Summary */}
              {personalGoals && personalGoals.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <Card><CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-indigo-600">{personalGoals.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">إجمالي الأهداف</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{scoredGoals.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">تم تقييمها</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4 text-center">
                    <p className={`text-3xl font-bold ${avgScore !== null ? (avgScore >= 80 ? 'text-emerald-600' : avgScore >= 60 ? 'text-amber-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                      {avgScore !== null ? `${avgScore}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">متوسط الدرجة</p>
                  </CardContent></Card>
                </div>
              )}

              {loadingPersonal && <div className="text-center py-6 text-muted-foreground">جاري التحميل...</div>}

              {personalGoals && personalGoals.length === 0 && !showAddGoalForm && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  <p className="text-sm">لا توجد أهداف شخصية لهذا الشهر</p>
                </div>
              )}

              {personalGoals && personalGoals.map((goal: any) => (
                <Card key={goal.id} className={`border ${goal.score !== null ? (goal.score >= 80 ? 'border-emerald-200' : goal.score >= 60 ? 'border-amber-200' : 'border-red-200') : 'border-border'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{goal.objective}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{DEVELOPMENT_AREAS[goal.developmentArea] ?? goal.developmentArea}</Badge>
                          <Badge variant="secondary" className="text-xs">{EVALUATION_METHODS[goal.evaluationMethod] ?? goal.evaluationMethod}</Badge>
                          <Badge variant="outline" className="text-xs">مراجع: {goal.reviewerRole === 'admin' ? 'الإدارة' : 'المدير'}</Badge>
                        </div>
                        {goal.reviewNotes && <p className="text-xs text-muted-foreground mt-2 italic">"{goal.reviewNotes}"</p>}
                      </div>
                      <div className="text-center min-w-[60px]">
                        {goal.score !== null ? (
                          <>
                            <div className={`text-2xl font-bold ${goal.score >= 80 ? 'text-emerald-600' : goal.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{goal.score}</div>
                            <div className="text-xs text-muted-foreground">/ 100</div>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs">لم يُقيَّم</Badge>
                        )}
                      </div>
                    </div>
                    {editingGoalId === goal.id ? (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">الدرجة (0-100)</Label>
                            <Input type="number" value={editScore} onChange={e => setEditScore(e.target.value)} min="0" max="100" className="h-8 text-sm mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">ملاحظات المراجع</Label>
                            <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} className="h-8 text-sm mt-1" placeholder="اختياري" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm" className="flex-1 h-8 text-xs gap-1"
                            onClick={() => {
                              updateGoalMut.mutate({
                                id: goal.id, engineerId: selectedEngId, year, month,
                                objective: goal.objective, developmentArea: goal.developmentArea,
                                evaluationMethod: goal.evaluationMethod, reviewerRole: goal.reviewerRole,
                                score: editScore ? parseInt(editScore) : undefined,
                                reviewNotes: editNotes || undefined,
                              });
                            }}
                            disabled={updateGoalMut.isPending}
                          >
                            <Save className="w-3 h-3" />
                            حفظ التقييم
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingGoalId(null)}>إلغاء</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm" variant="ghost" className="w-full h-7 text-xs mt-2 gap-1"
                        onClick={() => { setEditingGoalId(goal.id); setEditScore(goal.score !== null ? String(goal.score) : ''); setEditNotes(goal.reviewNotes ?? ''); }}
                      >
                        <Edit3 className="w-3 h-3" />
                        {goal.score !== null ? 'تعديل التقييم' : 'إضافة تقييم'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Add New Goal */}
              {showAddGoalForm ? (
                <Card className="border-dashed border-indigo-300">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-500" />
                      هدف شخصي جديد
                    </h3>
                    <div>
                      <Label className="text-xs">الهدف / الإنجاز المطلوب *</Label>
                      <Textarea
                        value={newObjective}
                        onChange={e => setNewObjective(e.target.value)}
                        placeholder="مثال: إتمام 3 عروض تقديمية احترافية مع تسجيل فيديو"
                        className="mt-1 h-20 resize-none text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">مجال التطوير</Label>
                        <select value={newArea} onChange={e => setNewArea(e.target.value)} className="w-full h-8 text-sm border rounded-md px-2 bg-background mt-1">
                          {Object.entries(DEVELOPMENT_AREAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">طريقة التقييم</Label>
                        <select value={newMethod} onChange={e => setNewMethod(e.target.value)} className="w-full h-8 text-sm border rounded-md px-2 bg-background mt-1">
                          {Object.entries(EVALUATION_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">المراجع</Label>
                      <select value={newReviewerRole} onChange={e => setNewReviewerRole(e.target.value)} className="w-full h-8 text-sm border rounded-md px-2 bg-background mt-1">
                        <option value="manager">المدير المباشر</option>
                        <option value="admin">الإدارة العليا</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm" className="flex-1 h-8 text-xs gap-1"
                        onClick={() => {
                          if (!newObjective.trim()) return toast.error('أدخل الهدف');
                          addGoalMut.mutate({
                            engineerId: selectedEngId, year, month,
                            objective: newObjective.trim(),
                            developmentArea: newArea as any,
                            evaluationMethod: newMethod as any,
                            reviewerRole: newReviewerRole as any,
                          });
                        }}
                        disabled={addGoalMut.isPending}
                      >
                        <Save className="w-3 h-3" />
                        حفظ الهدف
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddGoalForm(false)}>إلغاء</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => setShowAddGoalForm(true)}>
                  <Plus className="w-4 h-4" />
                  إضافة هدف شخصي جديد
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── All Engineers Summary Table */}
      {perfData && perfData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              ملخص أهداف الفريق — {MONTHS[month - 1]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-right py-2 pr-2">المهندس</th>
                    <th className="text-center py-2">الهدف</th>
                    <th className="text-center py-2">الفعلي</th>
                    <th className="text-center py-2">التحقيق</th>
                    <th className="text-center py-2">الصفقات</th>
                    <th className="text-center py-2">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {perfData.map((eng: any) => (
                    <tr
                      key={eng.engineerId}
                      className={`border-b hover:bg-muted/30 cursor-pointer transition-colors ${selectedEngId === eng.engineerId ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}`}
                      onClick={() => handleSelectEng(eng.engineerId)}
                    >
                      <td className="py-2 pr-2 font-medium">{eng.engineerName}</td>
                      <td className="text-center py-2 text-muted-foreground">
                        {eng.targetAmount > 0 ? `${(eng.targetAmount / 1000).toFixed(0)}k` : '—'}
                      </td>
                      <td className="text-center py-2 font-medium">{(eng.actualSales / 1000).toFixed(0)}k</td>
                      <td className="text-center py-2">
                        <Badge variant={eng.achievementPct >= 100 ? 'default' : eng.achievementPct >= 70 ? 'secondary' : 'destructive'} className="text-xs">
                          {eng.achievementPct}%
                        </Badge>
                      </td>
                      <td className="text-center py-2 text-muted-foreground">{eng.closedWon}</td>
                      <td className="text-center py-2 text-muted-foreground">
                        {eng.remaining > 0 ? `${(eng.remaining / 1000).toFixed(0)}k` : '✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 3: Personal Development ──────────────────────────────────────────────
function PersonalDevelopmentTab({ year, month }: { year: number; month: number }) {
  const utils = trpc.useUtils();
  const { data: engineers } = trpc.engineers.list.useQuery();
  const [selectedEngId, setSelectedEngId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: goals, isLoading } = trpc.planning.getPersonalGoals.useQuery(
    { engineerId: selectedEngId ?? 0, year, month },
    { enabled: !!selectedEngId }
  );

  const [newObjective, setNewObjective] = useState('');
  const [newArea, setNewArea] = useState('other');
  const [newMethod, setNewMethod] = useState('manager_review');
  const [newReviewerRole, setNewReviewerRole] = useState('manager');
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const addGoalMut = trpc.planning.setPersonalGoal.useMutation({
    onSuccess: () => {
      toast.success('تم إضافة الهدف الشخصي');
      utils.planning.getPersonalGoals.invalidate();
      setShowAddForm(false);
      setNewObjective('');
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const updateGoalMut = trpc.planning.setPersonalGoal.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث التقييم');
      utils.planning.getPersonalGoals.invalidate();
      setEditingGoalId(null);
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const salesEngineers = (engineers ?? []).filter((e: any) =>
    !['admin', 'system_user'].includes(e.role ?? '')
  );

  const scoredGoals = (goals ?? []).filter((g: any) => g.score !== null);
  const avgScore = scoredGoals.length > 0
    ? Math.round(scoredGoals.reduce((s: number, g: any) => s + (g.score ?? 0), 0) / scoredGoals.length)
    : null;

  return (
    <div className="space-y-6">
      {/* Engineer Selector */}
      <div className="flex flex-wrap gap-2">
        {salesEngineers.map((eng: any) => (
          <button
            key={eng.id}
            onClick={() => { setSelectedEngId(eng.id); setShowAddForm(false); }}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${selectedEngId === eng.id
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'bg-card border-border hover:border-indigo-300 text-foreground'
            }`}
          >
            {eng.name}
          </button>
        ))}
      </div>

      {!selectedEngId && (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
          <User className="w-8 h-8 opacity-30" />
          <p className="text-sm">اختر مهندساً لعرض أهدافه الشخصية</p>
        </div>
      )}

      {selectedEngId && (
        <div className="space-y-4">
          {/* Summary */}
          {goals && goals.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-indigo-600">{goals.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي الأهداف</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{scoredGoals.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">تم تقييمها</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className={`text-3xl font-bold ${avgScore !== null ? (avgScore >= 80 ? 'text-emerald-600' : avgScore >= 60 ? 'text-amber-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                    {avgScore !== null ? `${avgScore}%` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">متوسط الدرجة</p>
                </CardContent>
              </Card>
            </div>
          )}

          {isLoading && <div className="text-center py-6 text-muted-foreground">جاري التحميل...</div>}

          {goals && goals.length === 0 && !showAddForm && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-sm">لا توجد أهداف شخصية لهذا الشهر</p>
            </div>
          )}

          {goals && goals.map((goal: any) => (
            <Card key={goal.id} className={`border ${goal.score !== null ? (goal.score >= 80 ? 'border-emerald-200' : goal.score >= 60 ? 'border-amber-200' : 'border-red-200') : 'border-border'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{goal.objective}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {DEVELOPMENT_AREAS[goal.developmentArea] ?? goal.developmentArea}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {EVALUATION_METHODS[goal.evaluationMethod] ?? goal.evaluationMethod}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        مراجع: {goal.reviewerRole === 'admin' ? 'الإدارة' : 'المدير'}
                      </Badge>
                    </div>
                    {goal.reviewNotes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">"{goal.reviewNotes}"</p>
                    )}
                  </div>
                  <div className="text-center min-w-[60px]">
                    {goal.score !== null ? (
                      <>
                        <div className={`text-2xl font-bold ${goal.score >= 80 ? 'text-emerald-600' : goal.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {goal.score}
                        </div>
                        <div className="text-xs text-muted-foreground">/ 100</div>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs">لم يُقيَّم</Badge>
                    )}
                  </div>
                </div>

                {editingGoalId === goal.id ? (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">الدرجة (0-100)</Label>
                        <Input type="number" value={editScore} onChange={e => setEditScore(e.target.value)} min="0" max="100" className="h-8 text-sm mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">ملاحظات المراجع</Label>
                        <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} className="h-8 text-sm mt-1" placeholder="اختياري" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm" className="flex-1 h-8 text-xs gap-1"
                        onClick={() => {
                          updateGoalMut.mutate({
                            id: goal.id,
                            engineerId: selectedEngId,
                            year, month,
                            objective: goal.objective,
                            developmentArea: goal.developmentArea,
                            evaluationMethod: goal.evaluationMethod,
                            reviewerRole: goal.reviewerRole,
                            score: editScore ? parseInt(editScore) : undefined,
                            reviewNotes: editNotes || undefined,
                          });
                        }}
                        disabled={updateGoalMut.isPending}
                      >
                        <Save className="w-3 h-3" />
                        حفظ التقييم
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingGoalId(null)}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm" variant="ghost" className="w-full h-7 text-xs mt-2 gap-1"
                    onClick={() => {
                      setEditingGoalId(goal.id);
                      setEditScore(goal.score !== null ? String(goal.score) : '');
                      setEditNotes(goal.reviewNotes ?? '');
                    }}
                  >
                    <Edit3 className="w-3 h-3" />
                    {goal.score !== null ? 'تعديل التقييم' : 'إضافة تقييم'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add New Goal */}
          {showAddForm ? (
            <Card className="border-dashed border-indigo-300">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-500" />
                  هدف شخصي جديد
                </h3>
                <div>
                  <Label className="text-xs">الهدف / الإنجاز المطلوب *</Label>
                  <Textarea
                    value={newObjective}
                    onChange={e => setNewObjective(e.target.value)}
                    placeholder="مثال: إتمام 3 عروض تقديمية احترافية مع تسجيل فيديو"
                    className="mt-1 h-20 resize-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">مجال التطوير</Label>
                    <select value={newArea} onChange={e => setNewArea(e.target.value)} className="w-full h-8 text-sm border rounded-md px-2 bg-background mt-1">
                      {Object.entries(DEVELOPMENT_AREAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">طريقة التقييم</Label>
                    <select value={newMethod} onChange={e => setNewMethod(e.target.value)} className="w-full h-8 text-sm border rounded-md px-2 bg-background mt-1">
                      {Object.entries(EVALUATION_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">المراجع</Label>
                  <select value={newReviewerRole} onChange={e => setNewReviewerRole(e.target.value)} className="w-full h-8 text-sm border rounded-md px-2 bg-background mt-1">
                    <option value="manager">المدير المباشر</option>
                    <option value="admin">الإدارة العليا</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm" className="flex-1 h-8 text-xs gap-1"
                    onClick={() => {
                      if (!newObjective.trim()) return toast.error('أدخل الهدف');
                      addGoalMut.mutate({
                        engineerId: selectedEngId,
                        year, month,
                        objective: newObjective.trim(),
                        developmentArea: newArea as any,
                        evaluationMethod: newMethod as any,
                        reviewerRole: newReviewerRole as any,
                      });
                    }}
                    disabled={addGoalMut.isPending}
                  >
                    <Save className="w-3 h-3" />
                    حفظ الهدف
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4" />
              إضافة هدف شخصي جديد
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main PlanningModule ───────────────────────────────────────────────────────
export default function PlanningModule() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'company' | 'individual' | 'personal'>('company');
  const { canViewSection } = useSectionPermission();

  const allTabs = [
    { id: 'company' as const,    label: 'هدف الشركة',      icon: Target,    section: 'company_goals' },
    { id: 'individual' as const, label: 'أهداف المهندسين', icon: Users,     section: 'engineer_goals' },
    { id: 'personal' as const,   label: 'التطوير الشخصي',  icon: BookOpen,  section: 'personal_goals' },
  ];
  const tabs = allTabs.filter(t => canViewSection('planning', t.section));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-500" />
            تخطيط الأهداف
          </h1>
          <p className="text-sm text-muted-foreground">
            تخطيط الأهداف المالية والتشغيلية والشخصية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select className="h-8 text-sm border rounded-md px-2 bg-background" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className="h-8 text-sm border rounded-md px-2 bg-background" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'company' && <CompanyGoalsTab year={year} month={month} />}
      {activeTab === 'individual' && <IndividualGoalsTab year={year} month={month} />}
      {activeTab === 'personal' && <PersonalDevelopmentTab year={year} month={month} />}
    </div>
  );
}
