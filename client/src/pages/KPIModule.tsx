import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, TrendingDown, Zap, Clock, Database, DollarSign,
  AlertTriangle, Star, Gift, CheckCircle, XCircle, MinusCircle,
  ChevronUp, ChevronDown, Minus, Info, TrendingUp, Target, BarChart2,
} from "lucide-react";

const now = new Date();
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n/1_000_000).toFixed(2)}م` : n >= 1_000 ? `${(n/1_000).toFixed(0)}ك` : n.toLocaleString('ar-EG');
const fmtFull = (n: number) => `${n.toLocaleString('ar-EG')} ج.م`;

function getScoreColor(s: number) {
  if (s >= 90) return '#10b981';
  if (s >= 75) return '#6366f1';
  if (s >= 60) return '#f59e0b';
  if (s >= 45) return '#f97316';
  return '#ef4444';
}

function getRatingBg(rating: string) {
  if (rating === 'ممتاز')   return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (rating === 'جيد جداً') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (rating === 'جيد')     return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (rating === 'مقبول')   return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function StatusBadge({ status, type }: { status: string; type: 'commission' | 'incentive' | 'kpi' }) {
  if (status === 'available' || status === 'full')
    return <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> متاح</span>;
  if (status === 'partial')
    return <span className="flex items-center gap-1 text-amber-600 text-xs font-bold"><MinusCircle className="w-3.5 h-3.5" /> جزئي (50%)</span>;
  return <span className="flex items-center gap-1 text-red-500 text-xs font-bold"><XCircle className="w-3.5 h-3.5" /> محجوب</span>;
}

function WeightBar({ label, score, weight, color, icon: Icon }: {
  label: string; score: number; weight: number; color: string; icon: React.ElementType;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-muted-foreground">{label}</span>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-medium">{weight}%</span>
        </div>
        <span className="font-bold" style={{ color: getScoreColor(score) }}>{score}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// Commission tiers reference table
const COMMISSION_TIERS = [
  { label: 'أقل من 1,000,000', pct: 0 },
  { label: '1,000,000 → 1,250,000', pct: 1 },
  { label: '1,250,000 → 1,500,000', pct: 1.25 },
  { label: '1,500,000 → 1,750,000', pct: 1.5 },
  { label: '1,750,000 → 2,000,000', pct: 1.75 },
  { label: '2,000,000+', pct: '2% + 0.25% لكل 250K' },
];

const INCENTIVE_TIERS = [
  { label: 'أقل من 500,000', amount: 0 },
  { label: '500,000', amount: 2500 },
  { label: '1,000,000', amount: 5000 },
  { label: '1,250,000', amount: 6500 },
  { label: '1,500,000', amount: 7500 },
  { label: '1,750,000', amount: 8750 },
  { label: '2,000,000+', amount: 10000 },
];

const KPI_RULES = [
  { range: 'KPI < 60%', kpi: 'محجوب', commission: '50% فقط', incentive: 'محجوب', color: 'bg-red-50 border-red-200 text-red-700' },
  { range: 'KPI 60% → 75%', kpi: 'متاح', commission: 'كامل', incentive: 'محجوب', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { range: 'KPI 75% → 90%', kpi: 'متاح', commission: 'كامل', incentive: 'متاح', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { range: 'KPI ≥ 90%', kpi: 'متاح', commission: 'كامل', incentive: 'متاح', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

export default function KPIModule() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: kpiData, isLoading } = trpc.kpi.engineers.useQuery({ year, month });
  const { data: trendData } = trpc.kpi.trend.useQuery({ year, month });
  const { data: opData } = trpc.kpi.operationalPerformance.useQuery({ year, month });
  const { data: rankingData } = trpc.kpi.enhancedRanking.useQuery({ year, month });
  const { data: teleSalesKPI } = trpc.kpi.teleSalesKPI.useQuery({ year, month });
  const { data: siteEngKPI } = trpc.kpi.siteEngineersKPI.useQuery({ year, month });
  const { data: companyClosingKPI } = trpc.kpi.companyClosingKPI.useQuery({ year, month });
  const { data: teamReward } = trpc.kpi.teamRewardStatus.useQuery({ year, month });
  const { data: lostImpact } = trpc.kpi.lostDealsImpact.useQuery({ year, month });
  const { data: discountDist } = trpc.kpi.scoreBasedDiscountDistribution.useQuery({ year, month });
  const { data: allEarnings } = trpc.kpi.allEngineersEarnings.useQuery({ year, month, teamKPIPool: 2000 });
  const [kpiTab, setKpiTab] = useState<'sales'|'tele'|'site'|'closing'|'earnings'|'rewards'|'lost'>('sales');

  const sorted = kpiData ? [...kpiData].sort((a, b) => b.kpiScore - a.kpiScore) : [];
  const topPerformer = sorted[0];
  const lowPerformer = sorted[sorted.length - 1];

  const avgKPI = sorted.length > 0 ? Math.round(sorted.reduce((s, e) => s + e.kpiScore, 0) / sorted.length) : 0;
  const totalCommission = sorted.reduce((s, e) => s + (e.commissionValue ?? 0), 0);
  const totalIncentive = sorted.reduce((s, e) => s + (e.incentiveValue ?? 0), 0);
  const totalPayout = sorted.reduce((s, e) => s + (e.totalPayout ?? 0), 0);
  const blockedCount = sorted.filter(e => e.kpiStatus === 'blocked').length;

  const chartData = sorted.map(eng => ({
    name: eng.engineerName.split(' ')[0],
    'المهام': eng.tasksScore,
    'الاستجابة': eng.responseScore,
    'CRM': eng.crmScore,
    'KPI': eng.kpiScore,
  }));

  const radarData = topPerformer ? [
    { metric: 'المهام', value: topPerformer.tasksScore ?? 0 },
    { metric: 'الكفاءة', value: topPerformer.efficiencyScore ?? 0 },
    { metric: 'الاستجابة', value: topPerformer.responseScore ?? 0 },
    { metric: 'CRM', value: topPerformer.crmScore ?? 0 },
    { metric: 'الإنجاز', value: Math.min(100, topPerformer.achievementPct ?? 0) },
  ] : [];

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500" />
            مؤشرات الأداء والكوميشن (KPI)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            المهام <span className="font-semibold text-indigo-600">55%</span> •
            الاستجابة <span className="font-semibold text-blue-600">20%</span> •
            CRM <span className="font-semibold text-emerald-600">25%</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── SECTION 1: Summary KPIs ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100"><Star className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">متوسط KPI</p>
              <p className="text-2xl font-bold" style={{ color: getScoreColor(avgKPI) }}>{avgKPI}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الكوميشن</p>
              <p className="text-sm font-bold text-green-600">{fmtFull(totalCommission)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100"><Gift className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الحوافز</p>
              <p className="text-sm font-bold text-purple-600">{fmtFull(totalIncentive)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100"><XCircle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">KPI محجوب</p>
              <p className="text-2xl font-bold text-red-600">{blockedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── SECTION 2: KPI Rules Reference ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> قواعد KPI والاستحقاقات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {KPI_RULES.map((rule, i) => (
              <div key={i} className={`rounded-lg border p-3 ${rule.color}`}>
                <div className="font-bold text-sm mb-2">{rule.range}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>KPI:</span><span className="font-semibold">{rule.kpi}</span></div>
                  <div className="flex justify-between"><span>كوميشن:</span><span className="font-semibold">{rule.commission}</span></div>
                  <div className="flex justify-between"><span>حافز:</span><span className="font-semibold">{rule.incentive}</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── SECTION 3: Top & Low Performers ─── */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topPerformer && (
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100"><Trophy className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">🥇 الأعلى KPI</p>
                    <p className="font-bold">{topPerformer.engineerName}</p>
                  </div>
                  <div className="mr-auto text-left">
                    <p className="text-2xl font-bold text-emerald-600">{topPerformer.kpiScore}%</p>
                    <Badge className={`text-xs border ${getRatingBg(topPerformer.rating)}`}>{topPerformer.rating}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/70 dark:bg-white/10 rounded p-1.5"><div className="font-bold text-indigo-600">{topPerformer.tasksScore}%</div><div className="text-muted-foreground">المهام</div></div>
                  <div className="bg-white/70 dark:bg-white/10 rounded p-1.5"><div className="font-bold text-blue-600">{topPerformer.responseScore}%</div><div className="text-muted-foreground">الاستجابة</div></div>
                  <div className="bg-white/70 dark:bg-white/10 rounded p-1.5"><div className="font-bold text-emerald-600">{topPerformer.crmScore}%</div><div className="text-muted-foreground">CRM</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {lowPerformer && lowPerformer.engineerId !== topPerformer?.engineerId && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-red-100"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                  <div>
                    <p className="text-xs text-red-600 font-medium">⚠️ يحتاج دعم</p>
                    <p className="font-bold">{lowPerformer.engineerName}</p>
                  </div>
                  <div className="mr-auto text-left">
                    <p className="text-2xl font-bold text-red-600">{lowPerformer.kpiScore}%</p>
                    <Badge className={`text-xs border ${getRatingBg(lowPerformer.rating)}`}>{lowPerformer.rating}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/70 dark:bg-white/10 rounded p-1.5"><div className="font-bold text-indigo-600">{lowPerformer.tasksScore}%</div><div className="text-muted-foreground">المهام</div></div>
                  <div className="bg-white/70 dark:bg-white/10 rounded p-1.5"><div className="font-bold text-blue-600">{lowPerformer.responseScore}%</div><div className="text-muted-foreground">الاستجابة</div></div>
                  <div className="bg-white/70 dark:bg-white/10 rounded p-1.5"><div className="font-bold text-emerald-600">{lowPerformer.crmScore}%</div><div className="text-muted-foreground">CRM</div></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── SECTION 4: Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">مقارنة مكونات KPI</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div> :
            chartData.length === 0 ? <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="المهام" fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar dataKey="الاستجابة" fill="#3b82f6" radius={[3,3,0,0]} />
                  <Bar dataKey="CRM" fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="KPI" fill="#f59e0b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{topPerformer ? `${topPerformer.engineerName.split(' ')[0]} - رادار` : 'رادار الأداء'}</CardTitle></CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <Radar name="الأداء" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات</div>}
          </CardContent>
        </Card>
      </div>

      {/* ─── SECTION 5: Tiers Reference ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-600" /> شرائح الكوميشن</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {COMMISSION_TIERS.map((t, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 px-2 rounded text-sm hover:bg-muted/50">
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="font-bold text-green-600">{typeof t.pct === 'number' ? (t.pct === 0 ? 'لا كوميشن' : `${t.pct}%`) : t.pct}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4 text-purple-600" /> شرائح الحوافز</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {INCENTIVE_TIERS.map((t, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 px-2 rounded text-sm hover:bg-muted/50">
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="font-bold text-purple-600">{t.amount === 0 ? 'لا حافز' : fmtFull(t.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── SECTION 6: Individual Engineer Cards ─── */}
      <div>
        <h2 className="text-lg font-bold mb-4">تفاصيل أداء المهندسين</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((eng, rank) => (
            <Card key={eng.engineerId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                      rank === 0 ? 'bg-amber-100 text-amber-700' :
                      rank === 1 ? 'bg-slate-100 text-slate-600' :
                      rank === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{eng.engineerName}</p>
                      <p className="text-xs text-muted-foreground">{eng.department ?? 'مبيعات'}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold" style={{ color: getScoreColor(eng.kpiScore) }}>{eng.kpiScore}%</p>
                    <Badge className={`text-xs border ${getRatingBg(eng.rating)}`}>{eng.rating}</Badge>
                  </div>
                </div>

                {/* KPI Status */}
                <div className={`rounded-lg p-2.5 text-xs border ${
                  eng.kpiStatus === 'available' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}>
                  <p className="font-semibold mb-0.5">{eng.kpiStatusReason}</p>
                </div>

                {/* KPI Bars */}
                <div className="space-y-2">
                  <WeightBar label="المهام والتنفيذ" score={eng.tasksScore ?? 0} weight={55} color="#6366f1" icon={Zap} />
                  <WeightBar label="سرعة الاستجابة" score={eng.responseScore ?? 0} weight={20} color="#3b82f6" icon={Clock} />
                  <WeightBar label="تحديث CRM" score={eng.crmScore ?? 0} weight={25} color="#10b981" icon={Database} />
                </div>

                {/* Efficiency */}
                <div className="bg-muted/40 rounded-lg p-2 text-xs">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-muted-foreground">كفاءة الاجتماعات</span>
                    <span className={`font-bold ${(eng.visitsPerDeal ?? 0) > 3 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {eng.visitsPerDeal ?? 0} معاينة/صفقة
                    </span>
                  </div>
                  {(eng.visitsPerDeal ?? 0) > 3 && (
                    <p className="text-red-500 mt-0.5">⚠️ أعلى من الحد الطبيعي (3)</p>
                  )}
                </div>

                {/* KPI Alerts */}
                {eng.kpiAlerts && eng.kpiAlerts.length > 0 && (
                  <div className="space-y-1">
                    {eng.kpiAlerts.map((alert, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        {alert}
                      </div>
                    ))}
                  </div>
                )}

                {/* Commission & Incentive */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />المبيعات</span>
                    <span className="font-bold">{fmtFull(eng.totalDealValue ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">نسبة الكوميشن</span>
                    <span className="font-medium">{eng.baseCommissionPct ?? 0}% × {eng.commissionMultiplier ?? 0} = {eng.effectiveCommissionPct ?? 0}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">حالة الكوميشن</span>
                    <StatusBadge status={eng.commissionStatus ?? 'blocked'} type="commission" />
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-green-700 flex items-center gap-1"><DollarSign className="w-3 h-3" />الكوميشن</span>
                    <span className="text-green-700">{fmtFull(eng.commissionValue ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">حالة الحافز</span>
                    <StatusBadge status={eng.incentiveStatus ?? 'blocked'} type="incentive" />
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-purple-700 flex items-center gap-1"><Gift className="w-3 h-3" />الحافز</span>
                    <span className="text-purple-700">{fmtFull(eng.incentiveValue ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold border-t pt-2 mt-1">
                    <span className="text-foreground">الإجمالي المستحق</span>
                    <span className="text-emerald-700">{fmtFull(eng.totalPayout ?? 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── SECTION 7: Payout Summary Table ─── */}
      {sorted.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600" /> ملخص المستحقات الشهرية</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-right py-2 px-3">المهندس</th>
                    <th className="text-right py-2 px-3">KPI</th>
                    <th className="text-right py-2 px-3">المبيعات</th>
                    <th className="text-right py-2 px-3">الكوميشن</th>
                    <th className="text-right py-2 px-3">الحافز</th>
                    <th className="text-right py-2 px-3 font-bold">الإجمالي</th>
                    <th className="text-right py-2 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((eng, i) => (
                    <tr key={eng.engineerId} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">#{i+1}</span>
                          <span className="font-semibold">{eng.engineerName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold" style={{ color: getScoreColor(eng.kpiScore) }}>{eng.kpiScore}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{fmt(eng.totalDealValue ?? 0)}</td>
                      <td className="py-2.5 px-3 font-semibold text-green-600">{fmtFull(eng.commissionValue ?? 0)}</td>
                      <td className="py-2.5 px-3 font-semibold text-purple-600">{fmtFull(eng.incentiveValue ?? 0)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">{fmtFull(eng.totalPayout ?? 0)}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={eng.kpiStatus ?? 'blocked'} type="kpi" />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-bold">
                    <td className="py-2.5 px-3" colSpan={3}>الإجمالي</td>
                    <td className="py-2.5 px-3 text-green-700">{fmtFull(totalCommission)}</td>
                    <td className="py-2.5 px-3 text-purple-700">{fmtFull(totalIncentive)}</td>
                    <td className="py-2.5 px-3 text-emerald-700">{fmtFull(totalPayout)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── SECTION 8: Trend Analysis ─── */}
      {trendData && trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              اتجاه الأداء — مقارنة بالشهر السابق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-right py-2 px-3">المهندس</th>
                    <th className="text-right py-2 px-3">مبيعات الشهر</th>
                    <th className="text-right py-2 px-3">الشهر السابق</th>
                    <th className="text-right py-2 px-3">التغيير</th>
                    <th className="text-right py-2 px-3">نسبة الهدف %</th>
                    <th className="text-right py-2 px-3">تنفيذ المهام %</th>
                    <th className="text-right py-2 px-3">الاتجاه</th>
                  </tr>
                </thead>
                <tbody>
                  {trendData.map(eng => (
                    <tr key={eng.engineerId} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold">{eng.engineerName}</td>
                      <td className="py-2.5 px-3">{fmt(eng.currSales)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{fmt(eng.prevSales)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${
                          eng.salesDeltaPct > 0 ? 'text-emerald-600' :
                          eng.salesDeltaPct < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {eng.salesDeltaPct > 0 ? '+' : ''}{eng.salesDeltaPct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Math.min(100, eng.currQuota)}
                            className={`h-2 w-20 ${
                              eng.currQuota >= 100 ? '[&>div]:bg-emerald-500' :
                              eng.currQuota >= 75 ? '[&>div]:bg-blue-500' :
                              eng.currQuota >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                            }`}
                          />
                          <span className={`text-xs font-bold ${
                            eng.currQuota >= 100 ? 'text-emerald-600' :
                            eng.currQuota >= 75 ? 'text-blue-600' :
                            eng.currQuota >= 50 ? 'text-amber-600' : 'text-red-500'
                          }`}>{eng.currQuota}%</span>
                          {eng.quotaDelta !== 0 && (
                            <span className={`text-[10px] ${
                              eng.quotaDelta > 0 ? 'text-emerald-500' : 'text-red-400'
                            }`}>
                              {eng.quotaDelta > 0 ? '▲' : '▼'}{Math.abs(eng.quotaDelta)}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={eng.currExecRate}
                            className={`h-2 w-16 ${
                              eng.currExecRate >= 80 ? '[&>div]:bg-emerald-500' :
                              eng.currExecRate >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                            }`}
                          />
                          <span className="text-xs font-bold">{eng.currExecRate}%</span>
                          {eng.execDelta !== 0 && (
                            <span className={`text-[10px] ${
                              eng.execDelta > 0 ? 'text-emerald-500' : 'text-red-400'
                            }`}>
                              {eng.execDelta > 0 ? '▲' : '▼'}{Math.abs(eng.execDelta)}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {eng.trend === 'up' && (
                          <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                            <TrendingUp className="w-4 h-4" /> صاعد
                          </span>
                        )}
                        {eng.trend === 'down' && (
                          <span className="flex items-center gap-1 text-red-500 font-bold text-xs">
                            <TrendingDown className="w-4 h-4" /> هابط
                          </span>
                        )}
                        {eng.trend === 'stable' && (
                          <span className="flex items-center gap-1 text-muted-foreground font-bold text-xs">
                            <Minus className="w-4 h-4" /> مستقر
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}


      {/* ─── SECTION 8: Progressive Commission Breakdown ─── */}
      {sorted.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              تفاصيل الكوميشن التراكمي
              <span className="text-xs font-normal text-muted-foreground">(كل شريحة تُحسب على جزءها فقط)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sorted.map(eng => (
                <div key={eng.engineerId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{eng.engineerName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">إجمالي المبيعات: <strong>{fmt(eng.totalDealValue)}</strong></span>
                      <span className="text-sm font-bold text-green-600">كوميشن: {fmtFull((eng as any).progressiveCommissionValue ?? eng.commissionValue ?? 0)}</span>
                    </div>
                  </div>
                  {(eng as any).commissionBreakdown && (eng as any).commissionBreakdown.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {((eng as any).commissionBreakdown as Array<{label:string;amount:number;rate:number;portion:number}>).map((tier, i) => (
                        <div key={i} className="bg-muted/50 rounded p-2 text-xs">
                          <div className="text-muted-foreground">{tier.label}</div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="font-bold text-green-600">{fmtFull(tier.amount)}</span>
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{tier.rate}%</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">على {fmt(tier.portion)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">لا توجد مبيعات مسجلة</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── SECTION 9: Operational Performance from Tasks ─── */}
      {opData && opData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              تحليل الأداء التشغيلي (من المهام)
              <span className="text-xs font-normal text-muted-foreground">Actual vs Target Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {opData.map((eng: any) => (
                <div key={eng.engineerId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">{eng.engineerName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">إجمالي المهام: <strong>{eng.totalTasks}</strong></span>
                      <span className="text-xs font-bold" style={{ color: eng.taskEfficiency >= 80 ? '#10b981' : eng.taskEfficiency >= 60 ? '#f59e0b' : '#ef4444' }}>
                        كفاءة: {eng.taskEfficiency}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {[
                      { label: 'اجتماعات', actual: eng.meetingsPct, target: 50, color: '#6366f1' },
                      { label: '3D + Render', actual: eng.threeDRenderPct, target: 30, color: '#8b5cf6' },
                      { label: '2D تصميم', actual: eng.twoDPct, target: 10, color: '#06b6d4' },
                      { label: 'عروض سعر', actual: eng.quotationsPct, target: 10, color: '#f59e0b' },
                    ].map((item, i) => (
                      <div key={i} className="bg-muted/40 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                        <div className="flex items-end gap-1">
                          <span className="text-base font-bold" style={{ color: item.color }}>{item.actual}%</span>
                          <span className="text-[10px] text-muted-foreground mb-0.5">هدف: {item.target}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (item.actual/item.target)*100)}%`, backgroundColor: item.color }} />
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: Math.abs(item.actual - item.target) <= 5 ? '#10b981' : '#ef4444' }}>
                          {item.actual >= item.target ? '✓' : '↓'} {Math.abs(item.actual - item.target).toFixed(1)}% فرق
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2">
                    {[
                      { label: '2D', count: eng.count2D, color: '#06b6d4' },
                      { label: '3D', count: eng.count3D, color: '#8b5cf6' },
                      { label: 'Render', count: eng.countRender, color: '#a78bfa' },
                      { label: 'عروض', count: eng.countQuotation, color: '#f59e0b' },
                      { label: 'نمذجة', count: eng.countMeetingModeling, color: '#6366f1' },
                      { label: 'عرض', count: eng.countMeetingPresentation, color: '#3b82f6' },
                      { label: 'إغلاق', count: eng.countMeetingClosing, color: '#10b981' },
                    ].map((item, i) => (
                      <div key={i} className="text-center bg-muted/30 rounded p-1.5">
                        <div className="text-lg font-bold" style={{ color: item.color }}>{item.count}</div>
                        <div className="text-[10px] text-muted-foreground">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">تحويل اجتماعات → صفقات: <strong className="text-indigo-600">{eng.meetingToClosingRate}%</strong></span>
                    <span className="text-muted-foreground">تحويل تصميم → مبيعات: <strong className="text-purple-600">{eng.designToSalesRate}%</strong></span>
                  </div>
                  {eng.alerts && eng.alerts.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {eng.alerts.map((alert: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                          <AlertTriangle className="w-3 h-3" />{alert}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── SECTION 10: Enhanced Ranking (4 criteria) ─── */}
      {rankingData && rankingData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              ترتيب المهندسين (معيار مركب)
              <span className="text-xs font-normal text-muted-foreground">Revenue 35% + Closing 25% + Efficiency 20% + Target 20%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right py-2 px-3">#</th>
                    <th className="text-right py-2 px-3">المهندس</th>
                    <th className="text-right py-2 px-3">الدرجة المركبة</th>
                    <th className="text-right py-2 px-3">الإيرادات</th>
                    <th className="text-right py-2 px-3">الإغلاق</th>
                    <th className="text-right py-2 px-3">كفاءة المهام</th>
                    <th className="text-right py-2 px-3">تحقيق الهدف</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingData.map((eng: any, i: number) => (
                    <tr key={eng.engineerId} className={`border-b hover:bg-muted/30 ${i === 0 ? 'bg-amber-50' : ''}`}>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold text-base ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-500' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{eng.engineerName}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Progress value={eng.compositeScore} className="h-2 w-16" />
                          <span className="font-bold" style={{ color: getScoreColor(eng.compositeScore) }}>{eng.compositeScore}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs">{Math.round(eng.revenueScore)}%</td>
                      <td className="py-2.5 px-3 text-xs">{Math.round(eng.closingRateScore)}%</td>
                      <td className="py-2.5 px-3 text-xs">{Math.round(eng.taskEfficiencyScore)}%</td>
                      <td className="py-2.5 px-3 text-xs">{Math.round(eng.targetAchievementScore)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── ROLE TABS ─── */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {([
          { id: 'sales', label: 'مبيعات (Sales Engineers)' },
          { id: 'tele', label: 'Tele Sales' },
          { id: 'site', label: 'Site Engineers' },
          { id: 'closing', label: 'Company Closing KPI' },
          { id: 'earnings', label: 'الاستحقاقات التفصيلية' },
          { id: 'rewards', label: 'نظام المكافآت' },
          { id: 'lost', label: 'تأثير الصفقات الخاسرة' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setKpiTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              kpiTab === tab.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-muted text-muted-foreground border-muted hover:bg-muted/80'
            }`}>{tab.label}</button>
        ))}
      </div>

      {/* ─── TAB: Tele Sales KPI ─── */}
      {kpiTab === 'tele' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              KPI فريق Tele Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!teleSalesKPI || teleSalesKPI.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا يوجد موظفو Tele Sales مسجلون</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right py-2 px-3">الموظف</th>
                    <th className="text-right py-2 px-3">المكالمات</th>
                    <th className="text-right py-2 px-3">Leads</th>
                    <th className="text-right py-2 px-3">تحويل Lead→Meeting</th>
                    <th className="text-right py-2 px-3">سرعة الاستجابة</th>
                    <th className="text-right py-2 px-3">درجة KPI</th>
                  </tr></thead>
                  <tbody>
                    {teleSalesKPI.map((emp: any) => (
                      <tr key={emp.engineerId} className="border-b hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">{emp.engineerName}</td>
                        <td className="py-2.5 px-3">{emp.callsCount ?? 0}</td>
                        <td className="py-2.5 px-3">{emp.leadsCount ?? 0}</td>
                        <td className="py-2.5 px-3">
                          <span className={`font-bold ${ (emp.leadToMeetingRate ?? 0) >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {emp.leadToMeetingRate ?? 0}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{emp.avgResponseHours ?? '-'} ساعة</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Progress value={emp.kpiScore ?? 0} className="h-2 w-16" />
                            <span className="font-bold text-xs" style={{ color: getScoreColor(emp.kpiScore ?? 0) }}>{emp.kpiScore ?? 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB: Site Engineers KPI ─── */}
      {kpiTab === 'site' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              KPI مهندسو المعاينات (Site Engineers)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!siteEngKPI || siteEngKPI.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا يوجد مهندسو معاينات مسجلون</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right py-2 px-3">المهندس</th>
                    <th className="text-right py-2 px-3">المعاينات</th>
                    <th className="text-right py-2 px-3">الالتزام بالمواعيد</th>
                    <th className="text-right py-2 px-3">تحويل معاينة→تصميم</th>
                    <th className="text-right py-2 px-3">جودة البيانات</th>
                    <th className="text-right py-2 px-3">درجة KPI</th>
                  </tr></thead>
                  <tbody>
                    {siteEngKPI.map((eng: any) => (
                      <tr key={eng.engineerId} className="border-b hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">{eng.engineerName}</td>
                        <td className="py-2.5 px-3">{eng.visitsCount ?? 0}</td>
                        <td className="py-2.5 px-3">
                          <span className={`font-bold ${ (eng.punctualityRate ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {eng.punctualityRate ?? 0}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-bold ${ (eng.visitToDesignRate ?? 0) >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {eng.visitToDesignRate ?? 0}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{eng.dataQualityScore ?? 0}%</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Progress value={eng.kpiScore ?? 0} className="h-2 w-16" />
                            <span className="font-bold text-xs" style={{ color: getScoreColor(eng.kpiScore ?? 0) }}>{eng.kpiScore ?? 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB: Company Closing KPI ─── */}
      {kpiTab === 'closing' && companyClosingKPI && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'إجمالي الصفقات', value: companyClosingKPI.totalDeals, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'صفقات ناجحة (WON)', value: companyClosingKPI.wonDeals, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'نسبة الإغلاق', value: `${companyClosingKPI.currentRate}%`, color: (companyClosingKPI.currentRate ?? 0) >= 60 ? 'text-emerald-600' : 'text-red-500', bg: (companyClosingKPI.currentRate ?? 0) >= 60 ? 'bg-emerald-50' : 'bg-red-50' },
              { label: 'الهدف الشهري', value: `${companyClosingKPI.target ?? 60}%`, color: 'text-green-600', bg: 'bg-green-50' },
            ].map((item, i) => (
              <Card key={i}><CardContent className={`p-4 ${item.bg} rounded-lg`}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Funnel الإغلاق</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'إجمالي الصفقات', count: companyClosingKPI.totalDeals ?? 0, color: '#6366f1' },
                  { label: 'صفقات ناجحة', count: companyClosingKPI.wonDeals ?? 0, color: '#10b981' },
                  { label: 'صفقات مفتوحة', count: companyClosingKPI.openDeals ?? 0, color: '#f59e0b' },
                ].map((item, i) => (
                  <div key={i} className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-3xl font-bold" style={{ color: item.color }}>{item.count}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB: Earnings Breakdown ─── */}
      {kpiTab === 'earnings' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                الاستحقاقات التفصيلية — كوميشن تراكمي + حافز + KPI Share
                <span className="text-xs font-normal text-muted-foreground">(Sales Engineer + Sales Specialist فقط)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!allEarnings || allEarnings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات مبيعات لهذا الشهر</p>
              ) : (
                <div className="space-y-4">
                  {allEarnings.map((eng: any) => (
                    <div key={eng.engineerId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm">{eng.engineerName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">مبيعات: <strong>{fmt(eng.totalSales ?? 0)}</strong></span>
                          <span className="text-sm font-bold text-emerald-600">إجمالي: {fmtFull(eng.totalEarnings ?? 0)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        {/* Progressive Commission */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> كوميشن تراكمي
                          </div>
                          <div className="text-lg font-bold text-green-700">{fmtFull(eng.commission ?? 0)}</div>
                          {eng.commissionDetails && eng.commissionDetails.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {eng.commissionDetails.map((tier: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{tier.label}</span>
                                  <span className="font-semibold text-green-600">{fmtFull(tier.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Sales Incentive */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Gift className="w-3 h-3" /> حافز المبيعات
                          </div>
                          <div className="text-lg font-bold text-purple-700">{fmtFull(eng.salesIncentive ?? 0)}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            شريحة: {fmt(eng.totalSales ?? 0)}
                          </div>
                        </div>
                        {/* KPI Share + Closing Rate Incentive */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Star className="w-3 h-3" /> KPI Share + Closing Bonus
                          </div>
                          <div className="text-lg font-bold text-blue-700">{fmtFull((eng.kpiShare ?? 0) + (eng.closingRateIncentive ?? 0))}</div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <div>KPI Share: {fmtFull(eng.kpiShare ?? 0)}</div>
                            <div>Closing Bonus: {fmtFull(eng.closingRateIncentive ?? 0)}</div>
                            <div>Closing Rate: <strong>{eng.closingRate ?? 0}%</strong></div>
                          </div>
                        </div>
                      </div>
                      {/* Summary Bar */}
                      <div className="bg-muted/30 rounded p-2 flex flex-wrap gap-4 text-xs">
                        <span>كوميشن: <strong className="text-green-600">{fmtFull(eng.commission ?? 0)}</strong></span>
                        <span>حافز: <strong className="text-purple-600">{fmtFull(eng.salesIncentive ?? 0)}</strong></span>
                        <span>KPI Share: <strong className="text-blue-600">{fmtFull(eng.kpiShare ?? 0)}</strong></span>
                        <span>Closing Bonus: <strong className="text-indigo-600">{fmtFull(eng.closingRateIncentive ?? 0)}</strong></span>
                        <span className="font-bold text-emerald-700">الإجمالي: {fmtFull(eng.totalEarnings ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Commission Calculator Reference */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> جدول شرائح الكوميشن التراكمي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground">
                    <th className="text-right py-2 px-3">الشريحة</th>
                    <th className="text-right py-2 px-3">النسبة</th>
                    <th className="text-right py-2 px-3">الحساب</th>
                  </tr></thead>
                  <tbody>
                    {[
                      { range: '0 → 1,000,000', rate: '1%', note: 'على كامل المليون' },
                      { range: '1,000,000 → 1,250,000', rate: '1.25%', note: 'على الـ 250K فقط' },
                      { range: '1,250,000 → 1,500,000', rate: '1.5%', note: 'على الـ 250K فقط' },
                      { range: '1,500,000 → 1,750,000', rate: '1.75%', note: 'على الـ 250K فقط' },
                      { range: '1,750,000 → 2,000,000', rate: '2%', note: 'على الـ 250K فقط' },
                      { range: '2,000,000+', rate: '2.25%+', note: '+0.25% لكل 250K إضافية' },
                    ].map((tier, i) => (
                      <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-muted/20' : ''}`}>
                        <td className="py-2 px-3 font-semibold">{tier.range}</td>
                        <td className="py-2 px-3 text-green-600 font-bold">{tier.rate}</td>
                        <td className="py-2 px-3 text-muted-foreground">{tier.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* ─── TAB: Team Rewards ─── */}
      {kpiTab === 'rewards' && teamReward && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-500" />
              نظام مكافآت الفريق
              <Badge className={teamReward.targetMet ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                {teamReward.targetMet ? '✓ مؤهل للمكافأة' : '✗ غير مؤهل'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">نسبة الإغلاق الفعلية</p>
                <p className={`text-2xl font-bold ${ (teamReward.currentRate ?? 0) >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>{teamReward.currentRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground">الحد الأدنى: {teamReward.target ?? 60}%</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">مكافأة الفريق المتاحة</p>
                <p className="text-2xl font-bold text-purple-600">{fmtFull(teamReward.totalTeamBonus ?? 0)}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">إجمالي مكاسب الفريق</p>
                <p className="text-2xl font-bold text-indigo-600">{fmtFull(teamReward.totalTeamEarnings ?? 0)}</p>
              </div>
            </div>
            {teamReward.engineerEarnings && teamReward.engineerEarnings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right py-2 px-3">المهندس</th>
                    <th className="text-right py-2 px-3">الكوميشن</th>
                    <th className="text-right py-2 px-3">الحافز</th>
                    <th className="text-right py-2 px-3">الإجمالي</th>
                  </tr></thead>
                  <tbody>
                    {teamReward.engineerEarnings.map((eng: any) => (
                      <tr key={eng.engineerId} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3 font-semibold">{eng.engineerName}</td>
                        <td className="py-2 px-3">{fmtFull(eng.commission ?? 0)}</td>
                        <td className="py-2 px-3">{fmtFull(eng.incentive ?? 0)}</td>
                        <td className="py-2 px-3 font-bold text-purple-600">{fmtFull(eng.total ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB: Lost Deals Impact ─── */}
      {kpiTab === 'lost' && lostImpact && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'صفقات خاسرة', value: lostImpact.company.lostDeals, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'إيرادات ضائعة', value: fmt(lostImpact.company.lostValue ?? 0), color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'تأثير على نسبة الإغلاق', value: `${lostImpact.company.closingRateImpact ?? 0}%`, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'نسبة الخسارة', value: `${lostImpact.company.lostRate ?? 0}%`, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((item, i) => (
              <Card key={i}><CardContent className={`p-4 ${item.bg} rounded-lg`}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </CardContent></Card>
            ))}
          </div>
          {lostImpact.topLostReasons && lostImpact.topLostReasons.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /> أسباب الخسارة</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lostImpact.topLostReasons.map((reason: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm">{reason.label}</span>
                      <div className="flex items-center gap-3">
                        <Progress value={reason.pct ?? 0} className="h-2 w-24" />
                        <span className="text-xs font-bold text-red-600">{reason.count} ({reason.pct ?? 0}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {lostImpact.engineerImpacts && lostImpact.engineerImpacts.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">تأثير الخسارة على كل مهندس</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-xs text-muted-foreground">
                      <th className="text-right py-2 px-3">المهندس</th>
                      <th className="text-right py-2 px-3">صفقات خاسرة</th>
                      <th className="text-right py-2 px-3">إيرادات ضائعة</th>
                      <th className="text-right py-2 px-3">نسبة الخسارة</th>
                    </tr></thead>
                    <tbody>
                      {lostImpact.engineerImpacts.map((eng: any) => (
                        <tr key={eng.engineerId} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-3 font-semibold">{eng.engineerName}</td>
                          <td className="py-2 px-3 text-red-600 font-bold">{eng.lostDeals}</td>
                          <td className="py-2 px-3 text-red-600">{fmt(eng.lostValue ?? 0)}</td>
                          <td className="py-2 px-3">
                            <span className={`font-bold ${ (eng.lostRate ?? 0) > 40 ? 'text-red-600' : (eng.lostRate ?? 0) > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {eng.lostRate ?? 0}%
                            </span>
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
      )}

      {sorted.length === 0 && !isLoading && kpiTab === 'sales' && (
        <div className="text-center py-12 text-muted-foreground">لا توجد بيانات لهذا الشهر</div>
      )}
    </div>
  );
}
