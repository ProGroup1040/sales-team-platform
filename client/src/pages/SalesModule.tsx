import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Target, TrendingUp, TrendingDown, Clock, Users, Trophy, AlertTriangle,
  DollarSign, Percent, ChevronUp, ChevronDown, Minus, Plus, Trash2,
  Activity, Award, Flame, Zap, BarChart2, Eye,
} from "lucide-react";

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}م` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}ك` : n.toLocaleString("ar-EG");
const fmtFull = (n: number) => `${n.toLocaleString("ar-EG")} ج.م`;

const STAGE_LABELS: Record<string, string> = {
  proposal: "عرض سعر", negotiation: "تفاوض", contract_sent: "عقد مُرسل",
  closed_won: "مُغلق (رابح)", closed_lost: "مُغلق (خاسر)",
};
const STAGE_COLORS: Record<string, string> = {
  proposal: "bg-blue-100 text-blue-700", negotiation: "bg-yellow-100 text-yellow-700",
  contract_sent: "bg-purple-100 text-purple-700", closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
};

function ProgressBadge({ status }: { status: string }) {
  if (status === "ahead") return <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><ChevronUp className="w-3 h-3" /> متقدم</span>;
  if (status === "on_track") return <span className="flex items-center gap-1 text-blue-600 text-xs font-bold"><Minus className="w-3 h-3" /> في المسار</span>;
  return <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><ChevronDown className="w-3 h-3" /> متأخر</span>;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-500 text-lg font-bold">🥇</span>;
  if (rank === 2) return <span className="text-gray-400 text-lg font-bold">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 text-lg font-bold">🥉</span>;
  return <span className="text-gray-500 text-sm font-bold">#{rank}</span>;
}

export default function SalesModule() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState("overview");
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState<number | null>(null);
  const [targetAmount, setTargetAmount] = useState("");
  const [manpower, setManpower] = useState("");
  const [dMin, setDMin] = useState(""); const [dMax, setDMax] = useState(""); const [dPct, setDPct] = useState(""); const [dLabel, setDLabel] = useState("");
  const [cMin, setCMin] = useState(""); const [cMax, setCMax] = useState(""); const [cPct, setCPct] = useState(""); const [cLabel, setCLabel] = useState("");

  const statsQ = trpc.sales.controlStats.useQuery({ year, month });
  const engPerfQ = trpc.sales.engineersPerformance.useQuery({ year, month });
  const trendQ = trpc.sales.trend.useQuery({ months: 6 });
  const engineersQ = trpc.tasks.engineers.useQuery();
  const discountTiersQ = trpc.sales.discountTiers.useQuery();
  const commissionTiersQ = trpc.sales.commissionTiers.useQuery();

  const stats = statsQ.data;
  const engPerf = engPerfQ.data ?? [];
  const trend = trendQ.data ?? [];
  const engineers = engineersQ.data ?? [];
  const discountTiers = discountTiersQ.data ?? [];
  const commissionTiers = commissionTiersQ.data ?? [];

  const utils = trpc.useUtils();
  const setTargetMut = trpc.sales.setEngineerTarget.useMutation({
    onSuccess: () => {
      utils.sales.engineersPerformance.invalidate();
      utils.sales.controlStats.invalidate();
      setShowTargetDialog(false); setTargetAmount("");
      toast.success("تم حفظ الهدف بنجاح");
    },
  });
  const upsertDiscountMut = trpc.sales.upsertDiscountTier.useMutation({
    onSuccess: () => { utils.sales.discountTiers.invalidate(); toast.success("تم حفظ شريحة الخصم"); },
  });
  const deleteDiscountMut = trpc.sales.deleteDiscountTier.useMutation({
    onSuccess: () => { utils.sales.discountTiers.invalidate(); toast.success("تم حذف الشريحة"); },
  });
  const upsertCommissionMut = trpc.sales.upsertCommissionTier.useMutation({
    onSuccess: () => { utils.sales.commissionTiers.invalidate(); toast.success("تم حفظ شريحة الكوميشن"); },
  });
  const deleteCommissionMut = trpc.sales.deleteCommissionTier.useMutation({
    onSuccess: () => { utils.sales.commissionTiers.invalidate(); toast.success("تم حذف الشريحة"); },
  });

  const [selectedOpEngineerId, setSelectedOpEngineerId] = useState<number | null>(null);
  // الأهداف التشغيلية لمهندس محدد
  const opTargetsQ = trpc.kpi.engineerOperationalTargets.useQuery(
    { engineerId: selectedOpEngineerId ?? 0, year, month },
    { enabled: selectedOpEngineerId !== null && selectedOpEngineerId > 0 }
  );
  // ترتيب الفريق
  const teamRankingQ = trpc.kpi.teamPerformanceRanking.useQuery({ year, month });
  const teamRanking = teamRankingQ.data ?? [];
  const topPerformers = teamRanking.filter(e => e.performanceGroup === 'top');
  const needsSupport = teamRanking.filter(e => e.performanceGroup === 'needs_support');
  const sortedEngineers = useMemo(() => [...engPerf].sort((a, b) => b.achievementPct - a.achievementPct), [engPerf]);
  const top3 = sortedEngineers.slice(0, 3);
  const bottom3 = sortedEngineers.slice(-3).reverse();

  const alerts = useMemo(() => {
    const list: string[] = [];
    if (!stats) return list;
    if (stats.achievementRate < 50 && stats.timePct > 50)
      list.push(`نسبة تحقيق الهدف ${stats.achievementRate}% أقل من نصف الشهر المنقضي (${stats.timePct}%)`);
    if (stats.requiredDailyRate > 0)
      list.push(`المطلوب يومياً لتحقيق الهدف: ${fmtFull(stats.requiredDailyRate)}`);
    if (stats.totalCapacity > 0 && stats.totalTarget > stats.totalCapacity * 1.2)
      list.push(`الهدف الشهري (${fmt(stats.totalTarget)}) يتجاوز القدرة البيعية (${fmt(stats.totalCapacity)}) بأكثر من 20%`);
    sortedEngineers.forEach((e) => {
      if (e.achievementPct < 50 && stats.timePct > 50)
        list.push(`${e.engineerName}: نسبة تحقيق ${e.achievementPct}% فقط`);
    });
    return list;
  }, [stats, sortedEngineers]);

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  if (statsQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل بيانات المبيعات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-8 h-8 text-primary" />
            مركز تحكم المبيعات
          </h1>
          <p className="text-muted-foreground mt-1">متابعة الأهداف • الأداء • الكوميشن • الخصومات</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{monthNames.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024,2025,2026].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5" /> تنبيهات تحتاج انتباهك ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alerts.map((a, i) => (
                <span key={i} className="text-sm bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-3 py-1 rounded-full border border-red-200 dark:border-red-700">
                  ⚠️ {a}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="engineers">الفريق والترتيب</TabsTrigger>
          <TabsTrigger value="operational">الأهداف التشغيلية</TabsTrigger>
          <TabsTrigger value="pipeline">خط الصفقات</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        {/* TAB 1: نظرة عامة */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3"><Target className="w-8 h-8 text-primary" /><span className="text-3xl font-bold text-primary">{stats?.achievementRate ?? 0}%</span></div>
                <p className="text-sm font-semibold text-foreground">نسبة تحقيق الهدف</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtFull(stats?.actualSales ?? 0)} من {fmtFull(stats?.totalTarget ?? 0)}</p>
                <Progress value={stats?.achievementRate ?? 0} className="mt-3 h-2" />
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3"><TrendingUp className="w-8 h-8 text-green-600" /><span className="text-3xl font-bold text-green-600">{fmt(stats?.actualSales ?? 0)}</span></div>
                <p className="text-sm font-semibold text-foreground">المبيعات الفعلية</p>
                <p className="text-xs text-muted-foreground mt-1">المتبقي: {fmtFull(stats?.remaining ?? 0)}</p>
                <div className="mt-3 text-xs text-green-600 font-medium">{stats?.closedWonCount ?? 0} صفقة مُغلقة</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3"><Clock className="w-8 h-8 text-blue-600" /><span className="text-3xl font-bold text-blue-600">{stats?.daysRemaining ?? 0}</span></div>
                <p className="text-sm font-semibold text-foreground">أيام متبقية</p>
                <p className="text-xs text-muted-foreground mt-1">مرّ {stats?.daysPassed ?? 0} يوم من أصل {stats?.daysInMonth ?? 0}</p>
                <Progress value={stats?.timePct ?? 0} className="mt-3 h-2 [&>div]:bg-blue-500" />
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-200 dark:border-orange-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3"><Zap className="w-8 h-8 text-orange-600" /><span className="text-2xl font-bold text-orange-600">{fmt(stats?.requiredDailyRate ?? 0)}</span></div>
                <p className="text-sm font-semibold text-foreground">المطلوب يومياً</p>
                <p className="text-xs text-muted-foreground mt-1">لتحقيق الهدف خلال الأيام المتبقية</p>
                <div className="mt-3 text-xs text-orange-600 font-medium">{stats?.requiredDailyRate === 0 ? "✅ الهدف محقق!" : "⚡ مطلوب تسريع الإغلاق"}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="w-5 h-5 text-primary" /> الأداء مقارنة بالوقت</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-8 mb-4">
                  <div className="text-center"><div className="text-2xl font-bold text-primary">{stats?.achievementRate ?? 0}%</div><div className="text-xs text-muted-foreground">نسبة الإنجاز</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-blue-600">{stats?.timePct ?? 0}%</div><div className="text-xs text-muted-foreground">الوقت المنقضي</div></div>
                  <div className="flex-1">
                    {(stats?.achievementRate ?? 0) >= (stats?.timePct ?? 0) + 10
                      ? <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg p-3 text-center font-bold">🚀 متقدم على الجدول الزمني</div>
                      : (stats?.achievementRate ?? 0) >= (stats?.timePct ?? 0) - 10
                      ? <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg p-3 text-center font-bold">✅ في المسار الصحيح</div>
                      : <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg p-3 text-center font-bold">⚠️ متأخر عن الجدول الزمني</div>
                    }
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>نسبة الإنجاز</span><span>{stats?.achievementRate ?? 0}%</span></div>
                  <Progress value={stats?.achievementRate ?? 0} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2"><span>الوقت المنقضي</span><span>{stats?.timePct ?? 0}%</span></div>
                  <Progress value={stats?.timePct ?? 0} className="h-3 [&>div]:bg-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="w-5 h-5 text-primary" /> القدرة البيعية</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><div className="text-xs text-muted-foreground mb-1">إجمالي القدرة (Manpower)</div><div className="text-2xl font-bold text-foreground">{fmt(stats?.totalCapacity ?? 0)}</div><div className="text-xs text-muted-foreground">ج.م</div></div>
                <div><div className="text-xs text-muted-foreground mb-1">الهدف الشهري</div><div className="text-2xl font-bold text-primary">{fmt(stats?.totalTarget ?? 0)}</div><div className="text-xs text-muted-foreground">ج.م</div></div>
                {stats?.totalCapacity && stats.totalCapacity > 0 ? (
                  <div className={`rounded-lg p-2 text-center text-xs font-bold ${stats.totalTarget <= stats.totalCapacity ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {stats.totalTarget <= stats.totalCapacity ? "✅ الهدف منطقي وقابل للتحقيق" : `⚠️ الهدف يتجاوز القدرة بـ ${Math.round(((stats.totalTarget - stats.totalCapacity) / stats.totalCapacity) * 100)}%`}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6 text-center"><Eye className="w-8 h-8 text-blue-500 mx-auto mb-2" /><div className="text-3xl font-bold text-blue-600">{stats?.totalVisits ?? 0}</div><p className="text-sm text-muted-foreground">إجمالي المعاينات</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><Percent className="w-8 h-8 text-purple-500 mx-auto mb-2" /><div className="text-3xl font-bold text-purple-600">{stats?.visitsToClosingRate ?? 0}%</div><p className="text-sm text-muted-foreground">معدل تحويل المعاينات لصفقات</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" /><div className="text-3xl font-bold text-green-600">{stats?.leadsToVisitsRate ?? 0}%</div><p className="text-sm text-muted-foreground">معدل تحويل العملاء لمعاينات</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-5 h-5 text-primary" /> مسار المبيعات (آخر 6 أشهر)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTarget" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [fmtFull(v), name === "target" ? "الهدف" : "الفعلي"]} labelFormatter={(l) => `الشهر: ${l}`} />
                  <Legend formatter={(v) => v === "target" ? "الهدف" : "الفعلي"} />
                  <Area type="monotone" dataKey="target" stroke="#6366f1" fill="url(#gradTarget)" strokeWidth={2} />
                  <Area type="monotone" dataKey="actual" stroke="#22c55e" fill="url(#gradActual)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: الفريق والترتيب */}
        <TabsContent value="engineers" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">أداء الفريق والترتيب</h2>
            <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2"><Target className="w-4 h-4" /> تحديد أهداف المهندسين</Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription><DialogTitle>تحديد هدف مهندس</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>المهندس</Label>
                    <Select onValueChange={(v) => setSelectedEngineerId(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
                      <SelectContent>{engineers.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>الهدف الشهري (ج.م)</Label><Input type="number" placeholder="مثال: 500000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} /></div>
                  <div><Label>Manpower</Label><Input type="number" placeholder="أدخل عدد الموظفين" value={manpower} onChange={(e) => setManpower(e.target.value)} /></div>
                  <Button className="w-full" disabled={!selectedEngineerId || !targetAmount || setTargetMut.isPending}
                    onClick={() => { if (!selectedEngineerId || !targetAmount) return; setTargetMut.mutate({ engineerId: selectedEngineerId, year, month, targetAmount: Number(targetAmount), manpower: Number(manpower) || 1 }); }}>
                    {setTargetMut.isPending ? "جاري الحفظ..." : "حفظ الهدف"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-yellow-600"><Trophy className="w-5 h-5" /> Top Performers 🏆</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {top3.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4">لا توجد بيانات</p> : top3.map((e, i) => (
                  <div key={e.engineerId} className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{e.engineerName}</div><div className="text-xs text-muted-foreground">{fmtFull(e.actualSales)}</div></div>
                    <div className="text-right"><div className="font-bold text-green-600">{e.achievementPct}%</div><ProgressBadge status={e.progressStatus} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-red-600"><TrendingDown className="w-5 h-5" /> يحتاجون دعم 🔴</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {bottom3.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4">لا توجد بيانات</p> : bottom3.map((e, i) => (
                  <div key={e.engineerId} className="flex items-center gap-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <span className="text-red-500 text-sm font-bold">#{sortedEngineers.length - i}</span>
                    <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{e.engineerName}</div><div className="text-xs text-muted-foreground">{fmtFull(e.actualSales)}</div></div>
                    <div className="text-right"><div className="font-bold text-red-600">{e.achievementPct}%</div><ProgressBadge status={e.progressStatus} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="w-5 h-5 text-primary" /> جدول أداء الفريق الكامل</CardTitle></CardHeader>
            <CardContent>
              {sortedEngineers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد بيانات أداء لهذا الشهر</p>
                  <p className="text-xs mt-1">قم بتحديد أهداف المهندسين أولاً</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-right py-2 px-3">الترتيب</th>
                        <th className="text-right py-2 px-3">المهندس</th>
                        <th className="text-right py-2 px-3">الهدف</th>
                        <th className="text-right py-2 px-3">الفعلي</th>
                        <th className="text-right py-2 px-3">النسبة</th>
                        <th className="text-right py-2 px-3">المتبقي</th>
                        <th className="text-right py-2 px-3">الحالة</th>
                        <th className="text-right py-2 px-3">الكوميشن</th>
                        <th className="text-right py-2 px-3">الصفقات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEngineers.map((e, i) => (
                        <tr key={e.engineerId} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3"><RankBadge rank={i + 1} /></td>
                          <td className="py-3 px-3 font-semibold">{e.engineerName}</td>
                          <td className="py-3 px-3 text-muted-foreground">{fmt(e.targetAmount)}</td>
                          <td className="py-3 px-3 font-bold text-green-600">{fmt(e.actualSales)}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(e.achievementPct, 100)} className="w-16 h-2" />
                              <span className={`font-bold text-xs ${e.achievementPct >= 100 ? "text-green-600" : e.achievementPct >= 70 ? "text-blue-600" : e.achievementPct >= 50 ? "text-yellow-600" : "text-red-600"}`}>{e.achievementPct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-red-600 text-xs">{fmt(e.remaining)}</td>
                          <td className="py-3 px-3"><ProgressBadge status={e.progressStatus} /></td>
                          <td className="py-3 px-3 font-bold text-purple-600">{e.commission > 0 ? fmtFull(e.commission) : <span className="text-muted-foreground text-xs">—</span>}</td>
                          <td className="py-3 px-3 text-center"><Badge variant="outline">{e.closedWon} / {e.dealsCount}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {sortedEngineers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart2 className="w-5 h-5 text-primary" /> تحليل الفجوة (Gap Analysis)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sortedEngineers} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="engineerName" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number, name: string) => [fmtFull(v), name === "targetAmount" ? "الهدف" : name === "actualSales" ? "الفعلي" : "المتبقي"]} />
                    <Legend formatter={(v) => v === "targetAmount" ? "الهدف" : v === "actualSales" ? "الفعلي" : "المتبقي"} />
                    <Bar dataKey="targetAmount" fill="#6366f1" opacity={0.6} radius={[4,4,0,0]} />
                    <Bar dataKey="actualSales" fill="#22c55e" radius={[4,4,0,0]} />
                    <Bar dataKey="remaining" fill="#f87171" opacity={0.7} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: الأهداف التشغيلية */}
        <TabsContent value="operational" className="space-y-6 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> الأهداف التشغيلية لكل مهندس
            </h2>
            <Select value={selectedOpEngineerId ? String(selectedOpEngineerId) : ""} onValueChange={(v) => setSelectedOpEngineerId(Number(v))}>
              <SelectTrigger className="w-48"><SelectValue placeholder="اختر مهندس" /></SelectTrigger>
              <SelectContent>
                {engineers.filter((e: any) => ['sales_engineer','sales_specialist'].includes(e.role ?? '')).map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ترتيب الفريق */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400"><Trophy className="w-4 h-4" /> Top Performance ({topPerformers.length})</CardTitle></CardHeader>
              <CardContent>
                {teamRankingQ.isLoading ? <p className="text-muted-foreground text-sm">جاري التحميل...</p> : topPerformers.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">لا يوجد بيانات</p>
                ) : (
                  <div className="space-y-3">
                    {topPerformers.map((e, i) => (
                      <div key={e.engineerId} className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900">
                        <div className="flex items-center gap-2">
                          <RankBadge rank={i+1} />
                          <div>
                            <p className="font-semibold text-sm">{e.engineerName}</p>
                            <p className="text-xs text-muted-foreground">{e.role === 'sales_engineer' ? 'مهندس مبيعات' : 'متخصص مبيعات'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-100 text-green-700 border-green-300 mb-1">{e.level}</Badge>
                          <p className="text-xs text-muted-foreground">نسبة: {e.achievementPct}% | إغلاق: {e.closingRate}%</p>
                          <p className="text-xs text-muted-foreground">اجتماعات: {e.actualMeetings}/{e.targetMeetings}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400"><AlertTriangle className="w-4 h-4" /> Needs Support ({needsSupport.length})</CardTitle></CardHeader>
              <CardContent>
                {teamRankingQ.isLoading ? <p className="text-muted-foreground text-sm">جاري التحميل...</p> : needsSupport.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">لا يوجد بيانات</p>
                ) : (
                  <div className="space-y-3">
                    {needsSupport.map((e, i) => (
                      <div key={e.engineerId} className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm font-bold">#{topPerformers.length + i + 1}</span>
                          <div>
                            <p className="font-semibold text-sm">{e.engineerName}</p>
                            <p className="text-xs text-muted-foreground">{e.role === 'sales_engineer' ? 'مهندس مبيعات' : 'متخصص مبيعات'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-orange-600 border-orange-300 mb-1">{e.level}</Badge>
                          <p className="text-xs text-muted-foreground">نسبة: {e.achievementPct}% | إغلاق: {e.closingRate}%</p>
                          <p className="text-xs text-muted-foreground">اجتماعات: {e.actualMeetings}/{e.targetMeetings}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* الأهداف التشغيلية لمهندس محدد */}
          {selectedOpEngineerId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  تفاصيل الأهداف التشغيلية - {engineers.find((e: any) => e.id === selectedOpEngineerId)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opTargetsQ.isLoading ? (
                  <p className="text-muted-foreground text-sm">جاري التحميل...</p>
                ) : !opTargetsQ.data ? (
                  <p className="text-muted-foreground text-sm text-center py-4">لا توجد أهداف محددة لهذا الشهر</p>
                ) : (
                  <div className="space-y-4">
                    {/* تشخيص المشكلة */}
                    {opTargetsQ.data.diagnosis !== 'no_data' && (
                      <div className={`p-3 rounded-lg border text-sm font-medium ${
                        opTargetsQ.data.diagnosis === 'on_track' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' :
                        opTargetsQ.data.diagnosis === 'closing' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400' :
                        'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400'
                      }`}>
                        {opTargetsQ.data.diagnosis === 'on_track' && '✅ الأداء في المسار الصحيح'}
                        {opTargetsQ.data.diagnosis === 'closing' && '⚠️ النشاط كافي لكن المشكلة في الإغلاق - يحتاج تدريب على إغلاق الصفقات'}
                        {opTargetsQ.data.diagnosis === 'activity' && '⚠️ النشاط ضعيف - يحتاج زيادة عدد الاجتماعات والتصاميم'}
                        {opTargetsQ.data.diagnosis === 'both' && '❌ النشاط والإغلاق ضعيفان - يحتاج دعم شامل'}
                      </div>
                    )}
                    {/* جدول الأهداف */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-right py-2 px-3">العنصر</th>
                            <th className="text-right py-2 px-3">المطلوب</th>
                            <th className="text-right py-2 px-3">المنفذ</th>
                            <th className="text-right py-2 px-3">نسبة الإنجاز</th>
                          </tr>
                        </thead>
                        <tbody>
                          {([
                            { label: 'اجتماعات', target: opTargetsQ.data.targets.meetings, actual: opTargetsQ.data.actuals.meetings, pct: opTargetsQ.data.percentages.meetings },
                            { label: '2D Design', target: opTargetsQ.data.targets.design2D, actual: opTargetsQ.data.actuals.design2D, pct: opTargetsQ.data.percentages.design2D },
                            { label: '3D Modeling', target: opTargetsQ.data.targets.design3D, actual: opTargetsQ.data.actuals.design3D, pct: opTargetsQ.data.percentages.design3D },
                            { label: 'Render', target: opTargetsQ.data.targets.render, actual: opTargetsQ.data.actuals.render, pct: opTargetsQ.data.percentages.render },
                            { label: 'Quotation', target: opTargetsQ.data.targets.quotations, actual: opTargetsQ.data.actuals.quotations, pct: opTargetsQ.data.percentages.quotations },
                            { label: 'Presentation', target: opTargetsQ.data.targets.presentations, actual: opTargetsQ.data.actuals.presentations, pct: opTargetsQ.data.percentages.presentations },
                            { label: 'Closing', target: opTargetsQ.data.targets.closings, actual: opTargetsQ.data.actuals.closings, pct: opTargetsQ.data.percentages.closings },
                          ] as const).map((row) => (
                            <tr key={row.label} className="border-b hover:bg-muted/30">
                              <td className="py-2 px-3 font-medium">{row.label}</td>
                              <td className="py-2 px-3 text-muted-foreground">{row.target > 0 ? row.target : <span className="text-xs text-muted-foreground">غير محدد</span>}</td>
                              <td className="py-2 px-3 font-bold">{row.actual}</td>
                              <td className="py-2 px-3">
                                {row.target > 0 && row.pct !== null ? (
                                  <div className="flex items-center gap-2">
                                    <Progress value={Math.min(row.pct, 100)} className="w-16 h-2" />
                                    <span className={`text-xs font-bold ${
                                      row.pct >= 100 ? 'text-green-600' : row.pct >= 70 ? 'text-blue-600' : row.pct >= 50 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>{row.pct}%</span>
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: خط الصفقات */}
        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> خط الصفقات النشطة</h2>
          {!stats?.pipelineDeals || stats.pipelineDeals.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>لا توجد صفقات نشطة في هذا الشهر</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {stats.pipelineDeals.map((deal: any) => (
                <Card key={deal.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base">{deal.clientName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {deal.nextAction && <span>الإجراء التالي: {deal.nextAction}</span>}
                          {deal.nextActionDate && <span className="mr-3">📅 {new Date(deal.nextActionDate).toLocaleDateString("ar-EG")}</span>}
                        </div>
                        {deal.notes && <div className="text-xs text-muted-foreground mt-1 italic">💬 {deal.notes}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right"><div className="font-bold text-lg text-primary">{fmtFull(parseFloat(deal.value))}</div><div className="text-xs text-muted-foreground">قيمة الصفقة</div></div>
                        <Badge className={STAGE_COLORS[deal.stage] ?? "bg-gray-100 text-gray-700"}>{STAGE_LABELS[deal.stage] ?? deal.stage}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: الإعدادات */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><Percent className="w-5 h-5 text-orange-500" /> نظام الخصومات</span>
                  <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
                    <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="w-3 h-3" /> إضافة شريحة</Button></DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription><DialogTitle>إضافة شريحة خصم</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>الحد الأدنى للمبيعات (ج.م)</Label><Input type="number" placeholder="0" value={dMin} onChange={(e) => setDMin(e.target.value)} /></div>
                        <div><Label>الحد الأقصى للمبيعات (ج.م)</Label><Input type="number" placeholder="اختياري" value={dMax} onChange={(e) => setDMax(e.target.value)} /></div>
                        <div><Label>أقصى نسبة خصم مسموحة (%)</Label><Input type="number" placeholder="5" value={dPct} onChange={(e) => setDPct(e.target.value)} /></div>
                        <div><Label>التسمية (اختياري)</Label><Input placeholder="مثال: شريحة البداية" value={dLabel} onChange={(e) => setDLabel(e.target.value)} /></div>
                        <Button className="w-full" disabled={!dMin || !dPct || upsertDiscountMut.isPending}
                          onClick={() => { upsertDiscountMut.mutate({ minSales: Number(dMin), maxSales: dMax ? Number(dMax) : undefined, maxDiscountPct: Number(dPct), label: dLabel || undefined }); setDMin(""); setDMax(""); setDPct(""); setDLabel(""); setShowDiscountDialog(false); }}>
                          حفظ الشريحة
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.currentDiscountTier && (
                  <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="text-xs text-muted-foreground">الشريحة الحالية</div>
                    <div className="font-bold text-orange-600">{stats.currentDiscountTier.label || "شريحة نشطة"}</div>
                    <div className="text-2xl font-bold text-orange-700">{stats.currentDiscountTier.maxDiscountPct}%</div>
                    <div className="text-xs text-muted-foreground">أقصى خصم مسموح</div>
                  </div>
                )}
                {discountTiers.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4">لا توجد شرائح خصم بعد</p> : (
                  <div className="space-y-2">
                    {discountTiers.map((tier) => (
                      <div key={tier.id} className="flex items-center justify-between p-2 rounded border">
                        <div><div className="font-semibold text-sm">{tier.label || "شريحة"}</div><div className="text-xs text-muted-foreground">{fmt(parseFloat(tier.minSales))} → {tier.maxSales ? fmt(parseFloat(tier.maxSales)) : "∞"} ج.م</div></div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-300">{tier.maxDiscountPct}%</Badge>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteDiscountMut.mutate({ id: tier.id })}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><Award className="w-5 h-5 text-purple-500" /> نظام الكوميشن</span>
                  <Dialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
                    <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="w-3 h-3" /> إضافة شريحة</Button></DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription><DialogTitle>إضافة شريحة كوميشن</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>الحد الأدنى لنسبة تحقيق الهدف (%)</Label><Input type="number" placeholder="50" value={cMin} onChange={(e) => setCMin(e.target.value)} /></div>
                        <div><Label>الحد الأقصى لنسبة تحقيق الهدف (%)</Label><Input type="number" placeholder="اختياري" value={cMax} onChange={(e) => setCMax(e.target.value)} /></div>
                        <div><Label>نسبة الكوميشن (%)</Label><Input type="number" placeholder="2" value={cPct} onChange={(e) => setCPct(e.target.value)} /></div>
                        <div><Label>التسمية (اختياري)</Label><Input placeholder="مثال: كوميشن أساسي" value={cLabel} onChange={(e) => setCLabel(e.target.value)} /></div>
                        <Button className="w-full" disabled={!cMin || !cPct || upsertCommissionMut.isPending}
                          onClick={() => { upsertCommissionMut.mutate({ minAchievementPct: Number(cMin), maxAchievementPct: cMax ? Number(cMax) : undefined, commissionPct: Number(cPct), label: cLabel || undefined }); setCMin(""); setCMax(""); setCPct(""); setCLabel(""); setShowCommissionDialog(false); }}>
                          حفظ الشريحة
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {commissionTiers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm mb-3">لا توجد شرائح كوميشن بعد</p>
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 text-right space-y-1">
                      <p className="font-semibold mb-2">مثال على الشرائح المقترحة:</p>
                      <p>• أقل من 50% → بدون كوميشن</p>
                      <p>• 50% – 80% → 1% كوميشن</p>
                      <p>• 80% – 100% → 2% كوميشن</p>
                      <p>• أكثر من 100% → 3% كوميشن</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {commissionTiers.map((tier) => (
                      <div key={tier.id} className="flex items-center justify-between p-2 rounded border">
                        <div><div className="font-semibold text-sm">{tier.label || "شريحة"}</div><div className="text-xs text-muted-foreground">{tier.minAchievementPct}% → {tier.maxAchievementPct ? `${tier.maxAchievementPct}%` : "∞"}</div></div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-purple-600 border-purple-300">{tier.commissionPct}%</Badge>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteCommissionMut.mutate({ id: tier.id })}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {sortedEngineers.some((e) => e.commission > 0) && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">ملخص الكوميشن هذا الشهر</div>
                    {sortedEngineers.filter((e) => e.commission > 0).map((e) => (
                      <div key={e.engineerId} className="flex justify-between items-center py-1 text-sm">
                        <span>{e.engineerName}</span><span className="font-bold text-purple-600">{fmtFull(e.commission)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-1 text-sm font-bold border-t mt-2">
                      <span>الإجمالي</span><span className="text-purple-700">{fmtFull(sortedEngineers.reduce((s, e) => s + e.commission, 0))}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
