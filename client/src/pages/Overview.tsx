import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Target, Calendar,
  AlertTriangle, CheckCircle, Clock, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Zap, RefreshCw,
  ShieldAlert, Megaphone, Eye, Crown, Shield, XCircle, ArrowUpCircle
} from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;
const TODAY = now.toISOString().split('T')[0];

const STAGE_LABELS: Record<string, string> = {
  proposal: 'عرض سعر', negotiation: 'تفاوض',
  contract_sent: 'عقد مرسل', closed_won: 'مغلق ✓', closed_lost: 'خسارة',
};
const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

function KPICard({ title, value, sub, icon: Icon, color, trend, trendVal }: {
  title: string; value: string; sub?: string; icon: any; color: string; trend?: 'up' | 'down'; trendVal?: string;
}) {
  return (
    <Card className={`border kpi-${color} transition-all hover:shadow-md`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-${color === 'blue' ? 'indigo' : color === 'green' ? 'emerald' : color === 'amber' ? 'amber' : color === 'red' ? 'red' : 'purple'}-100 dark:bg-opacity-20 flex-shrink-0`}>
            <Icon className={`w-5 h-5 text-${color === 'blue' ? 'indigo' : color === 'green' ? 'emerald' : color === 'amber' ? 'amber' : color === 'red' ? 'red' : 'purple'}-600`} />
          </div>
        </div>
        {trendVal && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trendVal}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertBadge({ type, text }: { type: 'critical' | 'warning' | 'info'; text: string }) {
  const styles = {
    critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40',
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40',
  };
  const icons = { critical: '🔴', warning: '🟡', info: '🔵' };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${styles[type]}`}>
      <span>{icons[type]}</span>
      <span>{text}</span>
    </div>
  );
}

// ─── Management Focus Component ─────────────────────────────────────────────
function ManagementFocusSection({ data }: { data: any }) {
  if (!data) return null;
  const { adminSales, campaign, alerts } = data;

  const adminStatusConfig = {
    good:             { label: 'جيد',           color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
    needs_attention:  { label: 'يحتاج متابعة',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   dot: 'bg-amber-400' },
    critical:         { label: 'خطر',           color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',       dot: 'bg-red-400' },
  };
  const campaignStatusConfig = {
    strong: { label: 'قوي',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
    medium: { label: 'متوسط', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   dot: 'bg-amber-400' },
    weak:   { label: 'ضعيف',  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',       dot: 'bg-red-400' },
  };
  const alertSeverityConfig = {
    critical: { icon: '🔴', bg: 'bg-red-500/10 border-red-500/30 text-red-300', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
    warning:  { icon: '🟡', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    info:     { icon: '🔵', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  };

  const adminCfg = adminStatusConfig[adminSales.status as keyof typeof adminStatusConfig];
  const campaignCfg = campaignStatusConfig[campaign.status as keyof typeof campaignStatusConfig];
  const criticalAlerts = alerts.filter((a: any) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a: any) => a.severity === 'warning');

  return (
    <div className="space-y-4" dir="rtl">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <Eye className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Management Focus</h2>
          <p className="text-xs text-white/40">النقاط التي تحتاج تدخل الإدارة فقط — بدون تكرار البيانات الموجودة</p>
        </div>
        {alerts.length > 0 && (
          <div className="mr-auto flex items-center gap-1.5">
            {criticalAlerts.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                🔴 {criticalAlerts.length} حرجة
              </span>
            )}
            {warningAlerts.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                🟡 {warningAlerts.length} تحذير
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* 1. Admin Sales Performance */}
        <Card className="border-white/10 bg-white/3 hover:bg-white/5 transition-all">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              Admin Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {adminSales.engineerCount === 0 ? (
              <p className="text-white/30 text-xs text-center py-3">لا يوجد Admin Sales مسجل بعد</p>
            ) : (
              <>
                {/* KPI Score */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">KPI الحالي</span>
                  <span className={`text-lg font-bold ${
                    adminSales.kpi >= 75 ? 'text-emerald-400' : adminSales.kpi >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>{adminSales.kpi}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${
                    adminSales.kpi >= 75 ? 'bg-emerald-500' : adminSales.kpi >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${adminSales.kpi}%` }} />
                </div>
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-lg font-bold text-red-400">{adminSales.errors}</p>
                    <p className="text-xs text-white/40">أخطاء</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-lg font-bold text-amber-400">{adminSales.delays}</p>
                    <p className="text-xs text-white/40">تأخيرات</p>
                  </div>
                </div>
                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${adminCfg.bg}`}>
                  <div className={`w-2 h-2 rounded-full ${adminCfg.dot} animate-pulse`} />
                  <span className={adminCfg.color}>{adminCfg.label}</span>
                  <span className="text-white/30 mr-auto">{adminSales.done}/{adminSales.total} مهمة</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 2. Campaign Performance */}
        <Card className="border-white/10 bg-white/3 hover:bg-white/5 transition-all">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-purple-400" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Lead Count */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">إجمالي الـ Leads</span>
              <span className="text-lg font-bold text-purple-400">{campaign.total}</span>
            </div>
            {/* Quality Rate */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">جودة الـ Leads</span>
              <span className={`text-sm font-bold ${
                campaign.qualityRate >= 40 ? 'text-emerald-400' : campaign.qualityRate >= 25 ? 'text-amber-400' : 'text-red-400'
              }`}>{campaign.qualityRate}% مؤهلة</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${
                campaign.qualityRate >= 40 ? 'bg-emerald-500' : campaign.qualityRate >= 25 ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{ width: `${Math.min(100, campaign.qualityRate)}%` }} />
            </div>
            {/* Conversion */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">تحول لصفقة</span>
              <span className="text-emerald-400 font-semibold">{campaign.converted} ({campaign.conversionRate}%)</span>
            </div>
            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${campaignCfg.bg}`}>
              <div className={`w-2 h-2 rounded-full ${campaignCfg.dot} animate-pulse`} />
              <span className={campaignCfg.color}>{campaignCfg.label}</span>
              {campaign.delayedRate > 0 && (
                <span className="text-white/30 mr-auto">{campaign.delayedRate}% تأخير رد</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Alerts */}
        <Card className={`border transition-all ${
          criticalAlerts.length > 0 ? 'border-red-500/40 bg-red-500/5' :
          warningAlerts.length > 0 ? 'border-amber-500/30 bg-amber-500/5' :
          'border-emerald-500/30 bg-emerald-500/5'
        }`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${
                criticalAlerts.length > 0 ? 'text-red-400' : warningAlerts.length > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`} />
              Alerts — تحتاج تدخل
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 opacity-70" />
                <p className="text-xs text-emerald-400 font-medium">لا توجد مشاكل تحتاج تدخل</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.map((alert: any, i: number) => {
                  const cfg = alertSeverityConfig[alert.severity as keyof typeof alertSeverityConfig];
                  return (
                    <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-xs ${cfg.bg}`}>
                      <span className="shrink-0 mt-0.5">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border mr-1 ${cfg.badge}`}>{alert.category}</span>
                        <span>{alert.message}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Overview() {
  const { data: managementFocus } = trpc.management.focus.useQuery({ year: YEAR, month: MONTH });
  const { data: evalDashboard } = trpc.promotion.getAllEngineersDashboard.useQuery();
  const { data: taskStats } = trpc.tasks.stats.useQuery({ date: TODAY });
  const { data: criticalTasks } = trpc.tasks.critical.useQuery();
  const { data: leadsStats } = trpc.leads.stats.useQuery({ year: YEAR, month: MONTH });
  const { data: visitsStats } = trpc.visits.stats.useQuery({ year: YEAR, month: MONTH });
  const { data: closingStats } = trpc.closing.stats.useQuery({ year: YEAR, month: MONTH });
  const { data: salesStats } = trpc.sales.monthlyStats.useQuery({ year: YEAR, month: MONTH });
  const { data: collectionsStats } = trpc.collections.stats.useQuery();
  const { data: salesTrend } = trpc.sales.trend.useQuery({ months: 6 });
  const { data: kpiData } = trpc.kpi.engineers.useQuery({ year: YEAR, month: MONTH });
  const { data: dealsList } = trpc.closing.list.useQuery({ limit: 5, year: YEAR, month: MONTH });
  const { data: missingRecordings } = trpc.tasks.missingRecordings.useQuery({});
  const { data: pendingReviews } = trpc.tasks.pendingReviews.useQuery();
  // Playbook insights: get per-engineer playbook usage from workDist
  const { data: workDistAll } = trpc.workDist.allEngineers.useQuery({ year: YEAR, month: MONTH });

  const alerts = useMemo(() => {
    const list: { type: 'critical' | 'warning' | 'info'; text: string }[] = [];
    if (taskStats && taskStats.not_done > 0) list.push({ type: 'critical', text: `${taskStats.not_done} مهمة لم تُنفذ اليوم` });
    if (taskStats && taskStats.delayed > 0) list.push({ type: 'warning', text: `${taskStats.delayed} مهمة متأخرة اليوم` });
    if (taskStats && (taskStats as any).critical > 0) list.push({ type: 'critical', text: `🔥 ${(taskStats as any).critical} مهمة حرجة - تأخير أكثر من يومين` });
    if (leadsStats && leadsStats.delayedRate > 30) list.push({ type: 'warning', text: `نسبة التأخير في الرد على العملاء المحتملين: ${leadsStats.delayedRate}%` });
    if (visitsStats && visitsStats.delayRate > 20) list.push({ type: 'warning', text: `نسبة تأخير المعاينات: ${visitsStats.delayRate}%` });
    if (closingStats && closingStats.conversionRate < 20) list.push({ type: 'critical', text: `نسبة إغلاق الصفقات منخفضة: ${closingStats.conversionRate}%` });
    if (salesStats && salesStats.target > 0 && salesStats.achievementRate < 50) list.push({ type: 'warning', text: `تحقيق الهدف الشهري: ${salesStats.achievementRate}% فقط` });
    if (collectionsStats && collectionsStats.overdue > 0) list.push({ type: 'critical', text: `مبالغ متأخرة: ${collectionsStats.overdue.toLocaleString('ar-EG')} ج.م` });
    if (kpiData) {
      const lowPerf = kpiData.filter(e => e.executionScore < 50);
      if (lowPerf.length > 0) list.push({ type: 'warning', text: `${lowPerf.length} مهندس أداؤهم ضعيف هذا الشهر` });
    }
    // ─── Meeting Recording Alerts ───────────────────────────────────────────
    if (missingRecordings && missingRecordings.length > 0) {
      list.push({ type: 'critical', text: `📹 ${missingRecordings.length} ميتينج بدون تسجيل — يجب رفع الرابط فوراً` });
    }
    if (pendingReviews && pendingReviews.length > 0) {
      list.push({ type: 'warning', text: `📋 ${pendingReviews.length} ميتينج يحتاج مراجعة وتقييم` });
    }
    // ─── Playbook Usage Alerts ──────────────────────────────────────────────
    if (workDistAll) {
      const lowPlaybook = (workDistAll as any[]).filter((e: any) => (e.playbookUsagePct ?? e.playbookScore ?? 0) < 50);
      if (lowPlaybook.length > 0) {
        list.push({ type: 'warning', text: `📚 ${lowPlaybook.length} مهندس لا يستخدم Playbook بشكل كافٍ (أقل من 50%)` });
      }
    }
    return list;
  }, [taskStats, leadsStats, visitsStats, closingStats, salesStats, collectionsStats, kpiData, missingRecordings, pendingReviews, workDistAll]);

  const trendChartData = salesTrend?.map(t => ({
    name: t.label,
    الهدف: t.target,
    'المبيعات الفعلية': t.actual,
  })) ?? [];

  const stageData = closingStats?.byStage?.map((s, i) => ({
    name: STAGE_LABELS[s.stage] ?? s.stage,
    value: s.count,
    fill: STAGE_COLORS[i % STAGE_COLORS.length],
  })) ?? [];

  const taskPieData = taskStats ? [
    { name: 'منجزة', value: taskStats.completed, fill: '#10b981' },
    { name: 'متأخرة', value: taskStats.delayed, fill: '#f59e0b' },
    { name: 'لم تُنفذ', value: taskStats.not_done, fill: '#ef4444' },
    { name: 'مخططة', value: Math.max(0, taskStats.planned - taskStats.completed - taskStats.delayed - taskStats.not_done), fill: '#6366f1' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم الرئيسية</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800/30">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4" /> تنبيهات تحتاج انتباهك ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {alerts.map((a, i) => <AlertBadge key={i} type={a.type} text={a.text} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Management Focus Section ─── */}
      <ManagementFocusSection data={managementFocus} />

      {/* KPI Row 1: Tasks & Leads */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">المتابعة اليومية</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="المهام المخططة اليوم" value={String(taskStats?.planned ?? 0)} icon={Calendar} color="blue" sub={`${taskStats?.completed ?? 0} منجزة`} />
          <KPICard title="المهام المتأخرة" value={String(taskStats?.delayed ?? 0)} icon={Clock} color="amber" trend={taskStats && taskStats.delayed > 2 ? 'down' : 'up'} trendVal={taskStats?.delayed ? `${Math.round((taskStats.delayed / Math.max(taskStats.planned, 1)) * 100)}% من الإجمالي` : undefined} />
          <KPICard title="لم تُنفذ" value={String(taskStats?.not_done ?? 0)} icon={AlertTriangle} color="red" />
          <KPICard title="🔥 مهام حرجة" value={String((taskStats as any)?.critical ?? 0)} icon={AlertTriangle} color="red" sub={(taskStats as any)?.critical > 0 ? 'تأخير +2 يوم' : 'لا توجد مهام حرجة'} trend={(taskStats as any)?.critical > 0 ? 'down' : 'up'} />
          <KPICard title="العملاء المحتملون هذا الشهر" value={String(leadsStats?.total ?? 0)} icon={Users} color="purple" sub={`${leadsStats?.contacted ?? 0} تم التواصل`} trend="up" trendVal={`${leadsStats?.converted ?? 0} تحول لصفقة`} />
        </div>
      </div>

      {/* Critical Tasks Quick View */}
      {criticalTasks && criticalTasks.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              🔥 المهام الحرجة ({criticalTasks.length}) — تحتاج تدخلاً فورياً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(criticalTasks as any[]).slice(0, 6).map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-100/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 truncate">{task.title}</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">{task.delayDays} {task.delayDays === 1 ? 'يوم' : 'أيام'} تأخير</p>
                  </div>
                  <Badge className="mr-2 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 text-xs shrink-0">حرجة</Badge>
                </div>
              ))}
            </div>
            {criticalTasks.length > 6 && (
              <p className="text-xs text-red-500 text-center mt-2">و {criticalTasks.length - 6} مهام حرجة أخرى — اذهب لقسم المهام للتفاصيل</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's Engineers Ranking */}
      {taskStats && (taskStats as any).topEngineers && (taskStats as any).topEngineers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">ترتيب المهندسين اليوم</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-emerald-200/50 dark:border-emerald-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">🏆 أفضل 3 مهندسين</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(taskStats as any).topEngineers.map((eng: any, i: number) => (
                  <div key={eng.engineerId} className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-800/20">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{eng.engineerName}</p>
                      <p className="text-xs text-muted-foreground">{eng.completed} منجزة / {eng.planned} مخططة</p>
                    </div>
                    <Badge className={`text-xs ${eng.executionScore >= 90 ? 'bg-emerald-100 text-emerald-700' : eng.executionScore >= 70 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{eng.executionScore}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            {(taskStats as any).bottomEngineers && (taskStats as any).bottomEngineers.length > 0 && (
              <Card className="border-red-200/50 dark:border-red-900/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-400">⚠ يحتاجون متابعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(taskStats as any).bottomEngineers.map((eng: any, i: number) => (
                    <div key={eng.engineerId} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/30 dark:border-red-800/20">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-red-100 text-red-700">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{eng.engineerName}</p>
                        <p className="text-xs text-muted-foreground">{eng.not_done} لم تُنفذ، {eng.delayed} متأخرة</p>
                      </div>
                      <Badge className="text-xs bg-red-100 text-red-700">{eng.executionScore}%</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* KPI Row 2: Visits & Closing */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">المعاينات والإغلاق</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="المعاينات المجدولة" value={String(visitsStats?.scheduled ?? 0)} icon={Activity} color="blue" sub={`${visitsStats?.completionRate ?? 0}% معدل الإتمام`} />
          <KPICard title="معاينات ناجحة" value={String(visitsStats?.successful ?? 0)} icon={CheckCircle} color="green" sub={`${visitsStats?.collectionRate ?? 0}% نسبة التحصيل`} />
          <KPICard title="صفقات مفتوحة" value={String(closingStats?.open ?? 0)} icon={Zap} color="amber" sub={`${closingStats?.conversionRate ?? 0}% نسبة الإغلاق`} />
          <KPICard title="صفقات مغلقة ✓" value={String(closingStats?.closedWon ?? 0)} icon={TrendingUp} color="green" sub={`${(closingStats?.closedValue ?? 0).toLocaleString('ar-EG')} ج.م`} />
        </div>
      </div>

      {/* KPI Row 3: Sales & Collections */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">المبيعات والتحصيل</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="هدف الشهر" value={`${(salesStats?.target ?? 0).toLocaleString('ar-EG')} ج.م`} icon={Target} color="blue" />
          <KPICard title="المبيعات الفعلية" value={`${(salesStats?.actual ?? 0).toLocaleString('ar-EG')} ج.م`} icon={DollarSign} color="green" sub={`${salesStats?.achievementRate ?? 0}% من الهدف`} trend={salesStats && salesStats.achievementRate >= 80 ? 'up' : 'down'} trendVal={`${salesStats?.achievementRate ?? 0}% تحقيق`} />
          <KPICard title="إجمالي التحصيل" value={`${(collectionsStats?.totalCollected ?? 0).toLocaleString('ar-EG')} ج.م`} icon={TrendingUp} color="green" sub={`${collectionsStats?.collectionRate ?? 0}% معدل التحصيل`} />
          <KPICard title="مبالغ متأخرة" value={`${(collectionsStats?.overdue ?? 0).toLocaleString('ar-EG')} ج.م`} icon={AlertTriangle} color="red" trend="down" trendVal="تحتاج متابعة عاجلة" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">اتجاه المبيعات (6 أشهر)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString('ar-EG')} ج.م`]} />
                <Legend />
                <Area type="monotone" dataKey="الهدف" stroke="#10b981" fill="url(#targetGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="المبيعات الفعلية" stroke="#6366f1" fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">توزيع المهام اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            {taskPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {taskPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {taskPieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                      <span className="text-muted-foreground">{d.name}: <span className="font-semibold text-foreground">{d.value}</span></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">لا توجد مهام اليوم</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">تقدم الهدف الشهري</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">المبيعات الفعلية</span>
                <span className="font-semibold">{salesStats?.achievementRate ?? 0}%</span>
              </div>
              <Progress value={salesStats?.achievementRate ?? 0} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{(salesStats?.actual ?? 0).toLocaleString('ar-EG')} ج.م</span>
                <span>الهدف: {(salesStats?.target ?? 0).toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">معدل التحصيل</span>
                <span className="font-semibold">{collectionsStats?.collectionRate ?? 0}%</span>
              </div>
              <Progress value={collectionsStats?.collectionRate ?? 0} className="h-3" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">إتمام المعاينات</span>
                <span className="font-semibold">{visitsStats?.completionRate ?? 0}%</span>
              </div>
              <Progress value={visitsStats?.completionRate ?? 0} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Deals Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">مسار الصفقات</CardTitle>
          </CardHeader>
          <CardContent>
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name="عدد الصفقات" radius={[0, 4, 4, 0]}>
                    {stageData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">لا توجد صفقات بعد</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Decision Dashboard ─── */}
      {evalDashboard && evalDashboard.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Crown className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Decision Dashboard</h2>
              <p className="text-xs text-muted-foreground">مستوى أداء كل مهندس + قرار الترقية</p>
            </div>
            {/* Summary badges */}
            <div className="mr-auto flex items-center gap-2">
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                A: {evalDashboard.filter(e => e.currentEval?.performanceLevel === 'a_player').length}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                B: {evalDashboard.filter(e => e.currentEval?.performanceLevel === 'b_player').length}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                C: {evalDashboard.filter(e => e.currentEval?.performanceLevel === 'c_player').length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {evalDashboard.map((eng: any) => {
              const level = eng.currentEval?.performanceLevel;
              const levelConfig = level === 'a_player'
                ? { label: 'A Player', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', Icon: Crown }
                : level === 'b_player'
                ? { label: 'B Player', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', Icon: Shield }
                : level === 'c_player'
                ? { label: 'C Player', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', Icon: XCircle }
                : null;
              const promotionStatus = eng.currentEval?.promotionStatus;
              const careerLabel = eng.careerLevel === 'sales_consultant' ? 'Consultant'
                : eng.careerLevel === 'senior_sales_engineer' ? 'Senior'
                : 'Sales Eng.';
              return (
                <div key={eng.engineerId} className={`p-4 rounded-xl border bg-card hover:shadow-md transition-all ${
                  eng.currentEval?.firingDecisionTriggered ? 'border-red-500/50 shadow-red-500/10 shadow-lg' : ''
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {eng.engineerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{eng.engineerName}</p>
                        <p className="text-xs text-muted-foreground">{careerLabel}</p>
                      </div>
                    </div>
                    {levelConfig ? (
                      <Badge className={`${levelConfig.bg} ${levelConfig.color} border ${levelConfig.border} text-xs`}>
                        <levelConfig.Icon className="w-3 h-3 mr-1" />
                        {levelConfig.label}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">لم يُقيَّم</Badge>
                    )}
                  </div>

                  {/* Score */}
                  {eng.currentEval && (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">الدرجة الإجمالية</span>
                        <span className={`text-lg font-bold ${levelConfig?.color ?? 'text-foreground'}`}>
                          {eng.currentEval.overallScore}%
                        </span>
                      </div>
                      <Progress value={eng.currentEval.overallScore} className="h-2 mb-3" />
                      {/* 5 scores mini */}
                      <div className="grid grid-cols-5 gap-1 mb-3">
                        {[
                          { label: 'Sales', v: eng.currentEval.salesAchievementScore },
                          { label: 'Close', v: eng.currentEval.closingRateScore },
                          { label: 'Meet', v: eng.currentEval.meetingScore },
                          { label: 'PB', v: eng.currentEval.playbookUsageScore },
                          { label: 'Task', v: eng.currentEval.taskDisciplineScore },
                        ].map(({ label, v }) => (
                          <div key={label} className="text-center">
                            <div className={`text-xs font-bold ${
                              v >= 80 ? 'text-emerald-500' : v >= 60 ? 'text-amber-500' : 'text-red-500'
                            }`}>{v}%</div>
                            <div className="text-muted-foreground text-[10px]">{label}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Promotion Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {promotionStatus === 'eligible' && (
                        <><ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">مؤهل للترقية</span></>
                      )}
                      {promotionStatus === 'needs_improvement' && (
                        <><TrendingUp className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-amber-500 font-medium">يحتاج تحسين</span></>
                      )}
                      {promotionStatus === 'at_risk' && (
                        <><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-red-500 font-medium">At Risk</span></>
                      )}
                      {!promotionStatus && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    {eng.currentEval?.firingDecisionTriggered && (
                      <span className="text-xs font-bold text-red-500 animate-pulse">⚠️ قرار إداري</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Engineers Performance Summary */}
      {kpiData && kpiData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">ملخص أداء المهندسين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiData.map(eng => (
                <div key={eng.engineerId} className="p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm truncate">{eng.engineerName}</p>
                    <Badge variant={eng.rating === 'ممتاز' ? 'default' : eng.rating === 'جيد' ? 'secondary' : 'destructive'} className="text-xs">
                      {eng.rating}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>نسبة التنفيذ</span>
                      <span className="font-semibold text-foreground">{eng.executionScore}%</span>
                    </div>
                    <Progress value={eng.executionScore} className="h-1.5" />
                    <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                      <div className="text-xs"><div className="font-semibold text-emerald-600">{eng.tasksCompleted}</div><div className="text-muted-foreground">منجز</div></div>
                      <div className="text-xs"><div className="font-semibold text-amber-500">{eng.tasksDelayed}</div><div className="text-muted-foreground">متأخر</div></div>
                      <div className="text-xs"><div className="font-semibold text-indigo-600">{eng.closedWon}</div><div className="text-muted-foreground">صفقة</div></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
