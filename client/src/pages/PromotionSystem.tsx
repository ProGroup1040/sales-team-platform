import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Minus, Award, AlertTriangle, CheckCircle,
  XCircle, Star, ChevronRight, Users, Target, BarChart3, Clock,
  ArrowUpCircle, Shield, Zap, Crown, BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PerformanceLevel = "a_player" | "b_player" | "c_player" | null;
type CareerLevel = "sales_engineer" | "senior_sales_engineer" | "sales_consultant";
type PromotionStatus = "eligible" | "needs_improvement" | "at_risk";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  a_player: {
    label: "A Player", color: "text-emerald-400", bg: "bg-emerald-500/20",
    border: "border-emerald-500/40", icon: Crown, badge: "bg-emerald-500",
    description: "Top Performer - يترقى ويأخذ Bonus",
  },
  b_player: {
    label: "B Player", color: "text-amber-400", bg: "bg-amber-500/20",
    border: "border-amber-500/40", icon: Shield, badge: "bg-amber-500",
    description: "متوسط - Coaching إجباري",
  },
  c_player: {
    label: "C Player", color: "text-red-400", bg: "bg-red-500/20",
    border: "border-red-500/40", icon: AlertTriangle, badge: "bg-red-500",
    description: "ضعيف - Warning + Plan 30 يوم",
  },
};

const CAREER_CONFIG: Record<CareerLevel, { label: string; icon: any; color: string; benefits: string[] }> = {
  sales_engineer: {
    label: "Sales Engineer", icon: BookOpen, color: "text-blue-400",
    benefits: ["Commission ×1.0", "Discount 5%", "Standard Leads"],
  },
  senior_sales_engineer: {
    label: "Senior Sales Engineer", icon: Star, color: "text-purple-400",
    benefits: ["Commission ×1.15", "Discount 10%", "Premium Leads"],
  },
  sales_consultant: {
    label: "Sales Consultant", icon: Crown, color: "text-amber-400",
    benefits: ["Commission ×1.30", "Discount 15%", "VIP Leads"],
  },
};

const PROMOTION_STATUS_CONFIG: Record<PromotionStatus, { label: string; color: string; icon: any }> = {
  eligible: { label: "مؤهل للترقية", color: "text-emerald-400", icon: CheckCircle },
  needs_improvement: { label: "يحتاج تحسين", color: "text-amber-400", icon: TrendingUp },
  at_risk: { label: "At Risk", color: "text-red-400", icon: XCircle },
};

const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  promote: { label: "ترقية", color: "bg-emerald-500" },
  bonus: { label: "Bonus", color: "bg-blue-500" },
  coaching: { label: "Coaching إجباري", color: "bg-amber-500" },
  warning: { label: "تحذير", color: "bg-orange-500" },
  improvement_plan: { label: "Plan 30 يوم", color: "bg-red-400" },
  firing_risk: { label: "قرار إداري", color: "bg-red-600" },
  none: { label: "لا يوجد", color: "bg-slate-500" },
};

// ─── Monthly Evaluation Form ──────────────────────────────────────────────────
function EvaluationForm({ engineerId, engineerName, onSuccess }: {
  engineerId: number; engineerName: string; onSuccess: () => void;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    evaluationMonth: now.getMonth() + 1,
    evaluationYear: now.getFullYear(),
    salesAchievementScore: 0,
    closingRateScore: 0,
    meetingScore: 0,
    playbookUsageScore: 0,
    taskDisciplineScore: 0,
    coachingNotes: "",
    improvementPlan: "",
  });

  const createEval = trpc.promotion.createMonthlyEvaluation.useMutation({
    onSuccess: (data) => {
      toast.success(`${engineerName}: ${data.performanceLevel === "a_player" ? "A Player" : data.performanceLevel === "b_player" ? "B Player" : "C Player"} - ${data.overallScore}%`);
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const overallScore = Math.round((
    form.salesAchievementScore + form.closingRateScore + form.meetingScore +
    form.playbookUsageScore + form.taskDisciplineScore
  ) / 5);

  const predictedLevel = overallScore >= 80 ? "a_player" : overallScore >= 60 ? "b_player" : "c_player";

  const scoreFields = [
    { key: "salesAchievementScore", label: "Sales Achievement", hint: "نسبة تحقيق الهدف" },
    { key: "closingRateScore", label: "Closing Rate", hint: "معدل الإغلاق" },
    { key: "meetingScore", label: "Meeting Score", hint: "متوسط تقييم الاجتماعات" },
    { key: "playbookUsageScore", label: "Playbook Usage", hint: "نسبة استخدام Playbook" },
    { key: "taskDisciplineScore", label: "Task Discipline", hint: "إكمال المهام + Recording" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-slate-300 text-xs">الشهر</Label>
          <Select
            value={String(form.evaluationMonth)}
            onValueChange={(v) => setForm(f => ({ ...f, evaluationMonth: Number(v) }))}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)} className="text-white">
                  {new Date(2024, i).toLocaleString("ar", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-300 text-xs">السنة</Label>
          <Input
            type="number" value={form.evaluationYear}
            onChange={(e) => setForm(f => ({ ...f, evaluationYear: Number(e.target.value) }))}
            className="bg-slate-800 border-slate-600 text-white mt-1"
          />
        </div>
      </div>

      {/* Score Fields */}
      <div className="space-y-3">
        {scoreFields.map(({ key, label, hint }) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-slate-300 text-xs">{label}</Label>
              <span className="text-xs text-slate-400">{hint}</span>
              <span className={`text-sm font-bold ${
                form[key] >= 80 ? "text-emerald-400" :
                form[key] >= 60 ? "text-amber-400" : "text-red-400"
              }`}>{form[key]}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={form[key]}
              onChange={(e) => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
              className="w-full accent-blue-500"
            />
          </div>
        ))}
      </div>

      {/* Overall Preview */}
      <div className={`rounded-lg p-3 border ${LEVEL_CONFIG[predictedLevel].border} ${LEVEL_CONFIG[predictedLevel].bg}`}>
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">الدرجة الإجمالية</span>
          <span className={`text-2xl font-bold ${LEVEL_CONFIG[predictedLevel].color}`}>{overallScore}%</span>
        </div>
        <div className={`text-sm font-semibold mt-1 ${LEVEL_CONFIG[predictedLevel].color}`}>
          {LEVEL_CONFIG[predictedLevel].label} — {LEVEL_CONFIG[predictedLevel].description}
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="text-slate-300 text-xs">ملاحظات Coaching</Label>
        <Textarea
          value={form.coachingNotes}
          onChange={(e) => setForm(f => ({ ...f, coachingNotes: e.target.value }))}
          placeholder="ملاحظات للمهندس..."
          className="bg-slate-800 border-slate-600 text-white mt-1 text-sm"
          rows={2}
        />
      </div>
      {predictedLevel === "c_player" && (
        <div>
          <Label className="text-slate-300 text-xs">خطة التحسين (30 يوم)</Label>
          <Textarea
            value={form.improvementPlan}
            onChange={(e) => setForm(f => ({ ...f, improvementPlan: e.target.value }))}
            placeholder="خطة التحسين المطلوبة..."
            className="bg-slate-800 border-slate-600 text-white mt-1 text-sm"
            rows={2}
          />
        </div>
      )}

      <Button
        onClick={() => createEval.mutate({ engineerId, ...form })}
        disabled={createEval.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {createEval.isPending ? "جاري الحفظ..." : "حفظ التقييم"}
      </Button>
    </div>
  );
}

// ─── Engineer Card ─────────────────────────────────────────────────────────────
function EngineerEvalCard({ eng, onRefresh }: {
  eng: any; onRefresh: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showEvalForm, setShowEvalForm] = useState(false);
  const { data: history } = trpc.promotion.getEvaluationHistory.useQuery(
    { engineerId: eng.engineerId },
    { enabled: showHistory }
  );

  const promote = trpc.promotion.promoteEngineer.useMutation({
    onSuccess: (data) => {
      toast.success(`تمت الترقية - المستوى الجديد: ${CAREER_CONFIG[data.newLevel as CareerLevel]?.label}`);
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const level = eng.currentEval?.performanceLevel as PerformanceLevel;
  const levelConfig = level ? LEVEL_CONFIG[level] : null;
  const careerConfig = CAREER_CONFIG[eng.careerLevel as CareerLevel];
  const promotionConfig = PROMOTION_STATUS_CONFIG[eng.currentEval?.promotionStatus as PromotionStatus ?? "needs_improvement"];
  const decisionConfig = DECISION_LABELS[eng.currentEval?.decisionAction ?? "none"];

  return (
    <Card className={`bg-slate-800/60 border-slate-700 ${
      eng.currentEval?.firingDecisionTriggered ? "border-red-500/60 shadow-red-500/20 shadow-lg" : ""
    }`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {eng.engineerName.charAt(0)}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{eng.engineerName}</p>
                <p className={`text-xs ${careerConfig?.color}`}>{careerConfig?.label}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {level && levelConfig && (
              <Badge className={`${levelConfig.badge} text-white text-xs`}>
                {levelConfig.label}
              </Badge>
            )}
            {eng.currentEval?.firingDecisionTriggered && (
              <Badge className="bg-red-600 text-white text-xs animate-pulse">
                ⚠️ قرار إداري
              </Badge>
            )}
          </div>
        </div>

        {/* Scores */}
        {eng.currentEval ? (
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">الدرجة الإجمالية</span>
              <span className={`text-lg font-bold ${levelConfig?.color ?? "text-white"}`}>
                {eng.currentEval.overallScore}%
              </span>
            </div>
            <Progress
              value={eng.currentEval.overallScore}
              className="h-2 bg-slate-700"
            />
            <div className="grid grid-cols-5 gap-1 mt-2">
              {[
                { label: "Sales", value: eng.currentEval.salesAchievementScore },
                { label: "Closing", value: eng.currentEval.closingRateScore },
                { label: "Meeting", value: eng.currentEval.meetingScore },
                { label: "Playbook", value: eng.currentEval.playbookUsageScore },
                { label: "Tasks", value: eng.currentEval.taskDisciplineScore },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className={`text-xs font-bold ${
                    value >= 80 ? "text-emerald-400" : value >= 60 ? "text-amber-400" : "text-red-400"
                  }`}>{value}%</div>
                  <div className="text-slate-500 text-[10px]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-3 text-slate-500 text-xs">لا يوجد تقييم هذا الشهر</div>
        )}

        {/* Promotion Status */}
        {eng.currentEval && (
          <div className="flex items-center justify-between mb-3 p-2 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-1">
              <promotionConfig.icon className={`w-3 h-3 ${promotionConfig.color}`} />
              <span className={`text-xs font-medium ${promotionConfig.color}`}>
                {promotionConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-xs">Readiness:</span>
              <span className="text-white text-xs font-bold">{eng.currentEval.promotionReadinessScore}%</span>
            </div>
          </div>
        )}

        {/* Decision */}
        {eng.currentEval?.decisionAction && eng.currentEval.decisionAction !== "none" && (
          <div className={`text-center py-1 rounded text-xs font-semibold text-white mb-3 ${decisionConfig?.color}`}>
            {decisionConfig?.label}
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-1 mb-3">
          {careerConfig?.benefits.map((b, i) => (
            <div key={i} className="text-center bg-slate-900/50 rounded p-1">
              <span className="text-slate-300 text-[10px]">{b}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Dialog open={showEvalForm} onOpenChange={setShowEvalForm}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1 text-xs border-slate-600 text-slate-300 hover:bg-slate-700">
                <BarChart3 className="w-3 h-3 mr-1" /> تقييم شهري
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>تقييم شهري - {eng.engineerName}</DialogTitle>
              </DialogHeader>
              <EvaluationForm
                engineerId={eng.engineerId}
                engineerName={eng.engineerName}
                onSuccess={() => { setShowEvalForm(false); onRefresh(); }}
              />
            </DialogContent>
          </Dialog>

          {eng.currentEval?.promotionEligible && eng.careerLevel !== "sales_consultant" && (
            <Button
              size="sm"
              onClick={() => promote.mutate({ engineerId: eng.engineerId })}
              disabled={promote.isPending}
              className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              <ArrowUpCircle className="w-3 h-3 mr-1" /> ترقية
            </Button>
          )}

          <Button
            size="sm" variant="ghost"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-slate-400 hover:text-white"
          >
            <Clock className="w-3 h-3" />
          </Button>
        </div>

        {/* History */}
        {showHistory && history && history.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-slate-700 pt-3">
            <p className="text-slate-400 text-xs mb-2">تاريخ التقييمات</p>
            {history.slice(0, 6).map((h: any) => (
              <div key={h.id} className="flex items-center justify-between py-1 px-2 bg-slate-900/50 rounded text-xs">
                <span className="text-slate-400">
                  {new Date(2024, h.evaluationMonth - 1).toLocaleString("ar", { month: "short" })} {h.evaluationYear}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${
                    h.performanceLevel === "a_player" ? "text-emerald-400" :
                    h.performanceLevel === "b_player" ? "text-amber-400" : "text-red-400"
                  }`}>{h.overallScore}%</span>
                  {h.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                  {h.trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
                  {h.trend === "stable" && <Minus className="w-3 h-3 text-slate-400" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PromotionSystem() {
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterCareer, setFilterCareer] = useState<string>("all");

  const { data, refetch, isLoading } = trpc.promotion.getAllEngineersDashboard.useQuery();

  const filtered = (data ?? []).filter(eng => {
    if (filterLevel !== "all" && eng.currentEval?.performanceLevel !== filterLevel) return false;
    if (filterCareer !== "all" && eng.careerLevel !== filterCareer) return false;
    return true;
  });

  // Summary Stats
  const aPlayers = (data ?? []).filter(e => e.currentEval?.performanceLevel === "a_player").length;
  const bPlayers = (data ?? []).filter(e => e.currentEval?.performanceLevel === "b_player").length;
  const cPlayers = (data ?? []).filter(e => e.currentEval?.performanceLevel === "c_player").length;
  const firingRisk = (data ?? []).filter(e => e.currentEval?.firingDecisionTriggered).length;
  const eligible = (data ?? []).filter(e => e.currentEval?.promotionEligible).length;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-amber-400" />
            نظام الترقية والتقييم
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Career Path: Sales Engineer → Senior → Consultant
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="border-slate-600 text-slate-300">
          تحديث
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-3 text-center">
            <Crown className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-400">{aPlayers}</p>
            <p className="text-xs text-slate-400">A Players</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-3 text-center">
            <Shield className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-400">{bPlayers}</p>
            <p className="text-xs text-slate-400">B Players</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-400">{cPlayers}</p>
            <p className="text-xs text-slate-400">C Players</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-3 text-center">
            <ArrowUpCircle className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-400">{eligible}</p>
            <p className="text-xs text-slate-400">مؤهل للترقية</p>
          </CardContent>
        </Card>
        <Card className="bg-red-900/30 border-red-700/50">
          <CardContent className="p-3 text-center">
            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-500">{firingRisk}</p>
            <p className="text-xs text-slate-400">قرار إداري</p>
          </CardContent>
        </Card>
      </div>

      {/* Career Path Visual */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> المسار الوظيفي
          </h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(["sales_engineer", "senior_sales_engineer", "sales_consultant"] as CareerLevel[]).map((level, i) => {
              const config = CAREER_CONFIG[level];
              const count = (data ?? []).filter(e => e.careerLevel === level).length;
              return (
                <div key={level} className="flex items-center gap-2 flex-shrink-0">
                  <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 min-w-[140px]">
                    <div className="flex items-center gap-2 mb-1">
                      <config.icon className={`w-4 h-4 ${config.color}`} />
                      <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-xs text-slate-400">مهندس</p>
                    <div className="mt-2 space-y-0.5">
                      {config.benefits.map((b, j) => (
                        <p key={j} className="text-[10px] text-slate-400">{b}</p>
                      ))}
                    </div>
                  </div>
                  {i < 2 && <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="مستوى الأداء" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-white">كل المستويات</SelectItem>
            <SelectItem value="a_player" className="text-emerald-400">A Player</SelectItem>
            <SelectItem value="b_player" className="text-amber-400">B Player</SelectItem>
            <SelectItem value="c_player" className="text-red-400">C Player</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCareer} onValueChange={setFilterCareer}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="المستوى الوظيفي" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-white">كل المستويات</SelectItem>
            <SelectItem value="sales_engineer" className="text-blue-400">Sales Engineer</SelectItem>
            <SelectItem value="senior_sales_engineer" className="text-purple-400">Senior</SelectItem>
            <SelectItem value="sales_consultant" className="text-amber-400">Consultant</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-slate-400 text-sm self-center">
          {filtered.length} مهندس
        </div>
      </div>

      {/* Engineer Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-slate-800/40 border-slate-700 animate-pulse h-64" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا يوجد مهندسون بهذا الفلتر</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((eng) => (
            <EngineerEvalCard key={eng.engineerId} eng={eng} onRefresh={refetch} />
          ))}
        </div>
      )}

      {/* Firing Risk Alert */}
      {firingRisk > 0 && (
        <Card className="bg-red-900/20 border-red-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-semibold">تنبيه: {firingRisk} مهندس في وضع قرار إداري</p>
                <p className="text-slate-400 text-sm">
                  هؤلاء المهندسون حققوا C Player لشهرين متتاليين. يجب اتخاذ قرار إداري فوري.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
