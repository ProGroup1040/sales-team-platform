import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart2, Clock, Target, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Plus, Users, Activity, Award
} from "lucide-react";

// ─── Types matching backend ────────────────────────────────────────────────────
type DistData = {
  engineerId: number;
  year: number;
  month: number;
  totalMinutes: number;
  totalHours: number;
  byActivity: Record<string, { minutes: number; count: number; pct: number }>;
  categories: { meetings: number; design_3d: number; design_2d: number; quotation: number };
  distributionScore: number;
  feedback: { status: "balanced" | "focused" | "weak"; message: string; warnings: string[] };
};

type AllEngDist = {
  engineerId: number;
  engineerName: string;
  distribution: DistData | null;
};

type RankingRow = {
  engineerId: number;
  engineerName: string;
  salesScore: number;
  closingScore: number;
  distributionScore: number;
  compositeScore: number;
  kpiRank: number;
  closedWon: number;
  totalRevenue: number;
  closingRate: number;
  distributionFeedback: string;
  fullRank: number;
};

type InsightRow = {
  engineerId: number;
  engineerName: string;
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const ACTIVITY_LABELS: Record<string, string> = {
  meeting_2d: "ميتينج 2D",
  meeting_quotation: "ميتينج عرض سعر",
  meeting_3d: "ميتينج 3D",
  meeting_closing: "ميتينج إغلاق",
  design_3d: "تصميم 3D",
  design_2d: "تصميم 2D",
  quotation: "عرض سعر",
};

const ACTIVITY_TYPES = Object.keys(ACTIVITY_LABELS) as (keyof typeof ACTIVITY_LABELS)[];

const TARGETS = { meetings: 50, design_3d: 30, design_2d: 10, quotation: 10 };

const CAT_COLORS: Record<string, string> = {
  meetings: "bg-blue-500",
  design_3d: "bg-purple-500",
  design_2d: "bg-green-500",
  quotation: "bg-orange-500",
};

const CAT_LABELS: Record<string, string> = {
  meetings: "الميتينجات",
  design_3d: "تصميم 3D",
  design_2d: "تصميم 2D",
  quotation: "عروض الأسعار",
};

// ─── Log Activity Dialog ───────────────────────────────────────────────────────
function LogActivityDialog({
  engineerId,
  onSuccess,
}: {
  engineerId: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    activityType: "meeting_2d" as (typeof ACTIVITY_TYPES)[number],
    logDate: today,
    durationMinutes: 60,
    clientName: "",
    notes: "",
  });

  const logMutation = trpc.workDist.log.useMutation({
    onSuccess: () => {
      toast({ title: "✅ تم تسجيل النشاط بنجاح" });
      setOpen(false);
      onSuccess();
    },
    onError: (e: { message: string }) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          تسجيل نشاط
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تسجيل نشاط جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>نوع النشاط</Label>
            <Select
              value={form.activityType}
              onValueChange={(v) => setForm({ ...form, activityType: v as typeof form.activityType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACTIVITY_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>التاريخ</Label>
            <Input
              type="date"
              value={form.logDate}
              onChange={(e) => setForm({ ...form, logDate: e.target.value })}
            />
          </div>
          <div>
            <Label>المدة (دقيقة)</Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>اسم العميل (اختياري)</Label>
            <Input
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="اسم العميل"
            />
          </div>
          <div>
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
          <Button
            className="w-full"
            disabled={logMutation.isPending}
            onClick={() =>
              logMutation.mutate({
                engineerId,
                logDate: form.logDate,
                activityType: form.activityType,
                durationMinutes: form.durationMinutes,
                clientName: form.clientName || undefined,
                notes: form.notes || undefined,
              })
            }
          >
            {logMutation.isPending ? "جاري الحفظ..." : "حفظ النشاط"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Distribution Progress Bar ─────────────────────────────────────────────────
function DistBar({
  label,
  actual,
  target,
  color,
}: {
  label: string;
  actual: number;
  target: number;
  color: string;
}) {
  const diff = actual - target;
  const isOver = diff > 5;
  const isUnder = diff < -5;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-2">
          <span className={isOver ? "text-red-400" : isUnder ? "text-yellow-400" : "text-green-400"}>
            {actual}%
          </span>
          <span className="text-muted-foreground text-xs">هدف: {target}%</span>
        </span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(actual, 100)}%` }}
        />
        {/* Target marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/60"
          style={{ left: `${target}%` }}
        />
      </div>
    </div>
  );
}

// ─── Score Badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-green-500/20 text-green-400 border-green-500/30" :
    score >= 50 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-red-500/20 text-red-400 border-red-500/30";
  const label =
    score >= 75 ? "متوازن" :
    score >= 50 ? "مقبول" : "ضعيف";

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold ${color}`}>
      {score >= 75 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {score} — {label}
    </div>
  );
}

// ─── Engineer Distribution Card (Manager View) ─────────────────────────────────
function EngineerDistCard({ eng }: { eng: AllEngDist }) {
  const dist = eng.distribution;
  const cats = dist?.categories ?? { meetings: 0, design_3d: 0, design_2d: 0, quotation: 0 };
  const score = dist?.distributionScore ?? 0;

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{eng.engineerName}</CardTitle>
          <ScoreBadge score={score} />
        </div>
        {dist && (
          <p className="text-xs text-muted-foreground">
            {dist.totalHours} ساعة مسجّلة هذا الشهر
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {dist ? (
          <>
            {(["meetings", "design_3d", "design_2d", "quotation"] as const).map((cat) => (
              <DistBar
                key={cat}
                label={CAT_LABELS[cat]}
                actual={cats[cat]}
                target={TARGETS[cat]}
                color={CAT_COLORS[cat]}
              />
            ))}
            {dist.feedback.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {dist.feedback.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {w}
                  </p>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات لهذا الشهر</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── My Distribution Detail View ──────────────────────────────────────────────
function MyDistributionView({ dist }: { dist: DistData }) {
  const cats = dist.categories;

  return (
    <div className="space-y-6">
      {/* Score + Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            توزيع الوقت — {dist.totalHours} ساعة مسجّلة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <ScoreBadge score={dist.distributionScore} />
            <span className="text-sm text-muted-foreground">{dist.feedback.message}</span>
          </div>

          <div className="space-y-3">
            {(["meetings", "design_3d", "design_2d", "quotation"] as const).map((cat) => (
              <DistBar
                key={cat}
                label={CAT_LABELS[cat]}
                actual={cats[cat]}
                target={TARGETS[cat]}
                color={CAT_COLORS[cat]}
              />
            ))}
          </div>

          {dist.feedback.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold text-yellow-400 mb-2">⚠️ تنبيهات</p>
              {dist.feedback.warnings.map((w, i) => (
                <p key={i} className="text-sm text-yellow-300">• {w}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            تفاصيل الأنشطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/50">
            {ACTIVITY_TYPES.map((type) => {
              const data = dist.byActivity[type];
              if (!data) return null;
              return (
                <div key={type} className="flex items-center justify-between py-2 text-sm">
                  <span>{ACTIVITY_LABELS[type]}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{data.count} مرة</span>
                    <span>{Math.round(data.minutes / 60 * 10) / 10} ساعة</span>
                    <Badge variant="outline">{data.pct}%</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WorkDistribution() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "admin_sales";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedEngineerId, setSelectedEngineerId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"my" | "team" | "ranking" | "insights">("my");

  const { toast } = useToast();

  // Fetch engineers list for admin
  const engineersQuery = trpc.engineer.list.useQuery(undefined, { enabled: isAdmin });

  // Get current engineer ID
  const myEngineerId = engineersQuery.data?.find(
    (e) => e.name === user?.name
  )?.id ?? (engineersQuery.data?.[0]?.id ?? 0);

  const targetEngineerId = isAdmin
    ? (selectedEngineerId ?? myEngineerId)
    : myEngineerId;

  // Queries
  const distQuery = trpc.workDist.myDistribution.useQuery(
    { engineerId: targetEngineerId, year, month },
    { enabled: targetEngineerId > 0, refetchInterval: 60000 }
  );

  const allDistQuery = trpc.workDist.allEngineers.useQuery(
    { year, month },
    { enabled: isAdmin, refetchInterval: 60000 }
  );

  const rankingQuery = trpc.workDist.fullRanking.useQuery(
    { year, month },
    { enabled: isAdmin, refetchInterval: 60000 }
  );

  const insightsQuery = trpc.workDist.criticalInsights.useQuery(
    { year, month },
    { enabled: isAdmin, refetchInterval: 60000 }
  );

  const utils = trpc.useUtils();
  const refetchAll = () => {
    void utils.workDist.myDistribution.invalidate();
    void utils.workDist.allEngineers.invalidate();
    void utils.workDist.fullRanking.invalidate();
    void utils.workDist.criticalInsights.invalidate();
  };

  const months = [
    "يناير","فبراير","مارس","أبريل","مايو","يونيو",
    "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
  ];

  const tabs = [
    { id: "my" as const, label: "توزيعي", icon: <BarChart2 className="w-4 h-4" /> },
    ...(isAdmin ? [
      { id: "team" as const, label: "الفريق", icon: <Users className="w-4 h-4" /> },
      { id: "ranking" as const, label: "الترتيب", icon: <Award className="w-4 h-4" /> },
      { id: "insights" as const, label: "التنبيهات", icon: <AlertTriangle className="w-4 h-4" /> },
    ] : []),
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-primary" />
              توزيع العمل
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              تحليل توزيع وقت المهندسين — الهدف: ميتينجات 50% | 3D 30% | 2D 10% | عروض 10%
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month/Year selector */}
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetEngineerId > 0 && (
              <LogActivityDialog engineerId={targetEngineerId} onSuccess={refetchAll} />
            )}
          </div>
        </div>

        {/* Engineer selector (admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground">عرض مهندس:</Label>
            <Select
              value={selectedEngineerId ? String(selectedEngineerId) : "all"}
              onValueChange={(v) => setSelectedEngineerId(v === "all" ? null : Number(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="اختر مهندس" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {engineersQuery.data?.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border/50 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "my" && (
          <div>
            {distQuery.isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <Clock className="w-5 h-5 animate-spin mr-2" />
                جاري التحميل...
              </div>
            ) : distQuery.data ? (
              <MyDistributionView dist={distQuery.data} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart2 className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد بيانات لهذا الشهر</p>
                  <p className="text-sm text-muted-foreground mt-1">ابدأ بتسجيل أنشطتك اليومية</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "team" && isAdmin && (
          <div>
            {allDistQuery.isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <Clock className="w-5 h-5 animate-spin mr-2" />
                جاري التحميل...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(allDistQuery.data ?? []).map((eng) => (
                  <EngineerDistCard key={eng.engineerId} eng={eng} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "ranking" && isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                الترتيب الشامل — مبيعات + إغلاق + توزيع العمل
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankingQuery.isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Clock className="w-5 h-5 animate-spin mr-2" />
                  جاري التحميل...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="text-right py-2 px-3">#</th>
                        <th className="text-right py-2 px-3">المهندس</th>
                        <th className="text-right py-2 px-3">المبيعات</th>
                        <th className="text-right py-2 px-3">نسبة الإغلاق</th>
                        <th className="text-right py-2 px-3">توزيع العمل</th>
                        <th className="text-right py-2 px-3">النقاط الكلية</th>
                        <th className="text-right py-2 px-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {(rankingQuery.data as RankingRow[] ?? []).map((eng) => (
                        <tr key={eng.engineerId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3">
                            <span className={`font-bold text-lg ${
                              eng.fullRank === 1 ? "text-yellow-400" :
                              eng.fullRank === 2 ? "text-gray-400" :
                              eng.fullRank === 3 ? "text-amber-600" : "text-muted-foreground"
                            }`}>
                              #{eng.fullRank}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium">{eng.engineerName}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <span>{eng.salesScore}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">{eng.closingRate}%</td>
                          <td className="py-3 px-3">
                            <ScoreBadge score={eng.distributionScore} />
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-primary">{eng.compositeScore}</span>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={
                              eng.distributionFeedback === "balanced" ? "default" :
                              eng.distributionFeedback === "focused" ? "secondary" : "destructive"
                            }>
                              {eng.distributionFeedback === "balanced" ? "متوازن" :
                               eng.distributionFeedback === "focused" ? "مركّز" : "ضعيف"}
                            </Badge>
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

        {activeTab === "insights" && isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold">Critical Insights — نقاط الضعف</h2>
              {insightsQuery.data && (
                <Badge variant="destructive">{insightsQuery.data.length} تنبيه</Badge>
              )}
            </div>

            {insightsQuery.isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Clock className="w-5 h-5 animate-spin mr-2" />
                جاري التحميل...
              </div>
            ) : (insightsQuery.data?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
                  <p className="text-green-400 font-semibold">لا توجد تنبيهات</p>
                  <p className="text-sm text-muted-foreground mt-1">الفريق يعمل بشكل متوازن هذا الشهر</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(insightsQuery.data as InsightRow[] ?? []).map((insight, i) => (
                  <Card key={i} className={`border ${
                    insight.severity === "high" ? "border-red-500/30 bg-red-500/5" :
                    insight.severity === "medium" ? "border-yellow-500/30 bg-yellow-500/5" :
                    "border-blue-500/30 bg-blue-500/5"
                  }`}>
                    <CardContent className="flex items-start gap-3 py-4">
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        insight.severity === "high" ? "text-red-400" :
                        insight.severity === "medium" ? "text-yellow-400" : "text-blue-400"
                      }`} />
                      <div>
                        <p className="font-medium">{insight.message}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {insight.severity === "high" ? "🔴 عالي" :
                           insight.severity === "medium" ? "🟡 متوسط" : "🔵 منخفض"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
