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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Award, AlertTriangle, CheckCircle,
  XCircle, Star, ChevronRight, Users, Target, BarChart3, Clock,
  ArrowUpCircle, Shield, Zap, Crown, BookOpen, Trophy, Minus,
  AlertCircle, CheckSquare, Video, FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PerformanceLevel = "a_player" | "b_player" | "c_player";
type CareerLevel = "sales_engineer" | "senior_sales_engineer" | "sales_consultant";

// ─── Career Config ────────────────────────────────────────────────────────────
const CAREER_CONFIG: Record<CareerLevel, {
  label: string; icon: any; color: string; bg: string; border: string;
  commission: string; discount: string; leads: string; clients: string;
  extras: string[]; promotionTarget: string;
}> = {
  sales_engineer: {
    label: "Sales Engineer",
    icon: BookOpen,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    commission: "Commission أساسي (×1.0)",
    discount: "Discount محدود (5%)",
    leads: "Standard Leads",
    clients: "عملاء عاديون",
    extras: [],
    promotionTarget: "→ Senior Sales Engineer",
  },
  senior_sales_engineer: {
    label: "Senior Sales Engineer",
    icon: Star,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    commission: "Commission أعلى (×1.15)",
    discount: "Discount صلاحيات أعلى (10%)",
    leads: "Premium Leads",
    clients: "عملاء متميزون",
    extras: ["أولوية في توزيع Leads الجديدة"],
    promotionTarget: "→ Sales Consultant",
  },
  sales_consultant: {
    label: "Sales Consultant",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    commission: "أعلى Commission (×1.30)",
    discount: "أعلى Discount Range (15%)",
    leads: "VIP Leads — أولوية قصوى",
    clients: "Clients VIP فقط",
    extras: [
      "Priority في كل Leads الجديدة",
      "صلاحية التفاوض المستقل",
      "Bonus إضافي على الصفقات الكبيرة",
    ],
    promotionTarget: "أعلى مستوى في المسار",
  },
};

// ─── Performance Level Config ─────────────────────────────────────────────────
const LEVEL_CONFIG: Record<PerformanceLevel, {
  label: string; color: string; bg: string; border: string; badge: string;
  icon: any; description: string; action: string;
}> = {
  a_player: {
    label: "A Player",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    badge: "bg-emerald-600",
    icon: Trophy,
    description: "Top Performer — يترقى ويأخذ Bonus",
    action: "ترقية + Bonus + صلاحيات أعلى",
  },
  b_player: {
    label: "B Player",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    badge: "bg-amber-600",
    icon: Shield,
    description: "متوسط — يكمل + Coaching إجباري",
    action: "Coaching إجباري",
  },
  c_player: {
    label: "C Player",
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    badge: "bg-red-600",
    icon: AlertTriangle,
    description: "ضعيف — Warning + Plan تحسين 30 يوم",
    action: "Warning + خطة تحسين 30 يوم + إعادة تقييم",
  },
};

// ─── Decision Config ──────────────────────────────────────────────────────────
const DECISION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  promote: { label: "ترقية مستحقة ✅", color: "text-emerald-400", bg: "bg-emerald-600/20" },
  bonus: { label: "Bonus مستحق 💰", color: "text-blue-400", bg: "bg-blue-600/20" },
  coaching: { label: "Coaching إجباري 📚", color: "text-amber-400", bg: "bg-amber-600/20" },
  warning: { label: "تحذير رسمي ⚠️", color: "text-orange-400", bg: "bg-orange-600/20" },
  improvement_plan: { label: "خطة تحسين 30 يوم 📋", color: "text-red-400", bg: "bg-red-500/20" },
  firing_risk: { label: "قرار إداري مطلوب 🚨", color: "text-red-300", bg: "bg-red-700/30" },
  none: { label: "لا يوجد إجراء", color: "text-slate-400", bg: "bg-slate-700/30" },
};

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

// ─── Evaluation Form ──────────────────────────────────────────────────────────
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
      const lvl = data.performanceLevel === "a_player" ? "A Player ✅" :
        data.performanceLevel === "b_player" ? "B Player ⚡" : "C Player ⚠️";
      toast.success(`${engineerName}: ${lvl} — ${data.overallScore}%`);
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const scores = [
    { key: "salesAchievementScore" as const, label: "Sales Achievement", hint: "نسبة تحقيق الهدف البيعي", weight: "25%" },
    { key: "closingRateScore" as const, label: "Closing Rate", hint: "نسبة إغلاق الصفقات", weight: "25%" },
    { key: "meetingScore" as const, label: "Meeting Review Score", hint: "متوسط درجات Meeting Reviews", weight: "20%" },
    { key: "playbookUsageScore" as const, label: "Playbook Usage", hint: "نسبة الالتزام بالـ Playbook", weight: "15%" },
    { key: "taskDisciplineScore" as const, label: "Task Discipline", hint: "إكمال Meeting + Recording 100%", weight: "15%" },
  ];

  const overall = Math.round(
    (form.salesAchievementScore + form.closingRateScore + form.meetingScore +
      form.playbookUsageScore + form.taskDisciplineScore) / 5
  );
  const predictedLevel: PerformanceLevel = overall >= 80 ? "a_player" : overall >= 60 ? "b_player" : "c_player";
  const lc = LEVEL_CONFIG[predictedLevel];

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* Period */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-slate-300 text-xs">الشهر</Label>
          <Select value={String(form.evaluationMonth)} onValueChange={(v) => setForm(f => ({ ...f, evaluationMonth: Number(v) }))}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {MONTHS_AR.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)} className="text-white">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-300 text-xs">السنة</Label>
          <Input type="number" value={form.evaluationYear}
            onChange={(e) => setForm(f => ({ ...f, evaluationYear: Number(e.target.value) }))}
            className="bg-slate-800 border-slate-600 text-white mt-1" />
        </div>
      </div>

      {/* 5 Scores */}
      <div className="bg-slate-900/50 rounded-lg p-3 space-y-3 border border-slate-700">
        <p className="text-slate-300 text-xs font-semibold">5 عناصر التقييم (كل عنصر من 100)</p>
        {scores.map(({ key, label, hint, weight }) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <Label className="text-slate-300 text-xs">{label}</Label>
                <span className="text-slate-500 text-[10px]">({weight})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">{hint}</span>
                <span className={`text-sm font-bold ${
                  form[key] >= 80 ? "text-emerald-400" : form[key] >= 60 ? "text-amber-400" : "text-red-400"
                }`}>{form[key]}%</span>
              </div>
            </div>
            <input type="range" min={0} max={100} step={5} value={form[key]}
              onChange={(e) => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
              className="w-full accent-blue-500" />
          </div>
        ))}
      </div>

      {/* Predicted Result */}
      <div className={`rounded-lg p-4 border ${lc.border} ${lc.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-300 text-sm">النتيجة المتوقعة</span>
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-bold ${lc.color}`}>{overall}%</span>
            <Badge className={`${lc.badge} text-white`}>{lc.label}</Badge>
          </div>
        </div>
        <p className="text-slate-400 text-xs">{lc.description}</p>
        <p className={`text-xs font-semibold mt-1 ${lc.color}`}>الإجراء: {lc.action}</p>
      </div>

      {/* Notes */}
      <div>
        <Label className="text-slate-300 text-xs">ملاحظات Coaching</Label>
        <Textarea value={form.coachingNotes}
          onChange={(e) => setForm(f => ({ ...f, coachingNotes: e.target.value }))}
          placeholder="ملاحظات للمهندس..." className="bg-slate-800 border-slate-600 text-white mt-1 text-sm" rows={2} />
      </div>
      {predictedLevel === "c_player" && (
        <div>
          <Label className="text-slate-300 text-xs text-red-400">خطة التحسين (30 يوم) — إجباري</Label>
          <Textarea value={form.improvementPlan}
            onChange={(e) => setForm(f => ({ ...f, improvementPlan: e.target.value }))}
            placeholder="خطة التحسين المطلوبة..." className="bg-slate-800 border-red-500/40 text-white mt-1 text-sm" rows={2} />
        </div>
      )}

      <Button onClick={() => createEval.mutate({ engineerId, ...form })} disabled={createEval.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700">
        {createEval.isPending ? "جاري الحفظ..." : "حفظ التقييم الشهري"}
      </Button>
    </div>
  );
}

// ─── Engineer Detail Modal ─────────────────────────────────────────────────────
function EngineerDetailModal({ eng, onRefresh }: { eng: any; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: progress, isLoading } = trpc.promotion.getEngineerPromotionProgress.useQuery(
    { engineerId: eng.engineerId },
    { enabled: open }
  );
  const promote = trpc.promotion.promoteEngineer.useMutation({
    onSuccess: (data) => {
      const newLabel = CAREER_CONFIG[data.newLevel as CareerLevel]?.label ?? data.newLevel;
      toast.success(`تمت الترقية بنجاح! المستوى الجديد: ${newLabel}`);
      onRefresh(); setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const careerCfg = CAREER_CONFIG[eng.careerLevel as CareerLevel];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs flex-1">
          تفاصيل الترقية
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {eng.engineerName.charAt(0)}
            </div>
            <div>
              <p className="text-white font-bold">{eng.engineerName}</p>
              <p className={`text-sm ${careerCfg?.color}`}>{careerCfg?.label}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        ) : progress ? (
          <div className="space-y-5">
            {/* Warning Banner */}
            {progress.warningStatus !== "none" && (
              <div className={`rounded-lg p-3 border flex items-start gap-3 ${
                progress.warningStatus === "firing_risk" ? "bg-red-900/30 border-red-600/50" :
                progress.warningStatus === "improvement_plan" ? "bg-orange-900/30 border-orange-600/50" :
                "bg-amber-900/30 border-amber-600/50"
              }`}>
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  progress.warningStatus === "firing_risk" ? "text-red-400" :
                  progress.warningStatus === "improvement_plan" ? "text-orange-400" : "text-amber-400"
                }`} />
                <div>
                  <p className={`font-semibold text-sm ${
                    progress.warningStatus === "firing_risk" ? "text-red-400" :
                    progress.warningStatus === "improvement_plan" ? "text-orange-400" : "text-amber-400"
                  }`}>{progress.warningMessage}</p>
                  {progress.warningStatus === "firing_risk" && (
                    <p className="text-slate-400 text-xs mt-1">شهرين متتاليين C Player — يجب اتخاذ قرار إداري فوري</p>
                  )}
                  {progress.warningStatus === "improvement_plan" && (
                    <p className="text-slate-400 text-xs mt-1">خطة تحسين 30 يوم مطلوبة — إذا لم يتحسن → قرار إداري</p>
                  )}
                </div>
              </div>
            )}

            {/* Promotion Progress */}
            {progress.nextLevel && (
              <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    نسبة تحقيق الترقية إلى {progress.nextLevelLabel}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${
                      progress.overallReadiness >= 80 ? "text-emerald-400" :
                      progress.overallReadiness >= 50 ? "text-amber-400" : "text-red-400"
                    }`}>{progress.overallReadiness}%</span>
                    {progress.promotionEligible && (
                      <Badge className="bg-emerald-600 text-white text-xs">مؤهل للترقية</Badge>
                    )}
                  </div>
                </div>
                <Progress value={progress.overallReadiness} className="h-3 bg-slate-700 mb-2" />
                <p className="text-xs text-slate-400">
                  {progress.criticalMet}/{progress.criticalTotal} شروط أساسية محققة
                </p>
              </div>
            )}

            {/* Promotion Rules */}
            {progress.promotionRules && progress.promotionRules.length > 0 && (
              <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  شروط الترقية
                  <span className="text-slate-400 text-xs font-normal">
                    {progress.careerLevel === "sales_engineer" ? "(Sales Engineer → Senior)" : "(Senior → Consultant)"}
                  </span>
                </h3>
                <div className="space-y-2">
                  {progress.promotionRules.map((rule: any, i: number) => (
                    <div key={i} className={`flex items-start gap-3 p-2 rounded-lg ${
                      rule.met ? "bg-emerald-500/10" : "bg-red-500/10"
                    }`}>
                      {rule.met
                        ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-xs font-medium">{rule.criterion}</span>
                          {rule.weight === "critical" && (
                            <Badge className="bg-red-800/50 text-red-300 text-[10px] px-1 py-0">أساسي</Badge>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          المطلوب: <span className="text-slate-300">{rule.required}</span>
                          {" · "}الحالي: <span className={rule.met ? "text-emerald-400" : "text-red-400"}>{rule.current}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mandatory Conditions */}
            <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                الشروط الإجبارية (لا ترقية بدونها)
              </h3>
              <div className="space-y-2">
                {[
                  { icon: Video, label: "Meeting Recordings كاملة", met: progress.mandatoryConditions?.hasAllRecordings, status: progress.mandatoryConditions?.recordingsStatus },
                  { icon: FileText, label: "Meeting Reviews موجودة", met: progress.mandatoryConditions?.hasAllReviews, status: progress.mandatoryConditions?.reviewsStatus },
                  { icon: BookOpen, label: "استخدام Playbook فعلي", met: progress.mandatoryConditions?.hasPlaybookUsage, status: progress.mandatoryConditions?.playbookStatus },
                ].map(({ icon: Icon, label, met, status }) => (
                  <div key={label} className={`flex items-center gap-3 p-2 rounded-lg ${met ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${met ? "text-emerald-400" : "text-red-400"}`} />
                    <div className="flex-1">
                      <span className="text-white text-xs font-medium">{label}</span>
                      <p className={`text-[11px] ${met ? "text-emerald-400" : "text-red-400"}`}>{status}</p>
                    </div>
                    {met ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Strength & Improvement Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <h4 className="text-emerald-400 font-semibold text-sm mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> نقاط القوة
                </h4>
                {progress.strengthPoints && progress.strengthPoints.length > 0 ? (
                  <ul className="space-y-1">
                    {progress.strengthPoints.map((pt: string, i: number) => (
                      <li key={i} className="text-slate-300 text-xs flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-500 text-xs">لا يوجد تقييم بعد</p>}
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <h4 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> نقاط التحسين
                </h4>
                {progress.improvementPoints && progress.improvementPoints.length > 0 ? (
                  <ul className="space-y-1">
                    {progress.improvementPoints.map((pt: string, i: number) => (
                      <li key={i} className="text-slate-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-500 text-xs">لا يوجد تقييم بعد</p>}
              </div>
            </div>

            {/* Benefits Comparison */}
            {progress.nextBenefits && (
              <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  مقارنة المزايا (الحالية vs بعد الترقية)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/60 rounded-lg p-3">
                    <p className={`text-xs font-bold mb-2 ${careerCfg?.color}`}>{progress.currentBenefits?.label} (الحالي)</p>
                    <ul className="space-y-1.5">
                      {[
                        progress.currentBenefits?.commission,
                        progress.currentBenefits?.discount,
                        progress.currentBenefits?.leads,
                        progress.currentBenefits?.clients,
                        ...(progress.currentBenefits?.extras ?? []),
                      ].filter(Boolean).map((b: string, i: number) => (
                        <li key={i} className="text-slate-400 text-[11px] flex items-start gap-1.5">
                          <Minus className="w-3 h-3 flex-shrink-0 mt-0.5" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`rounded-lg p-3 border ${CAREER_CONFIG[progress.nextLevel as CareerLevel]?.border ?? "border-slate-600"} ${CAREER_CONFIG[progress.nextLevel as CareerLevel]?.bg ?? "bg-slate-800"}`}>
                    <p className={`text-xs font-bold mb-2 ${CAREER_CONFIG[progress.nextLevel as CareerLevel]?.color ?? "text-white"}`}>
                      {progress.nextBenefits?.label} (بعد الترقية)
                    </p>
                    <ul className="space-y-1.5">
                      {[
                        progress.nextBenefits?.commission,
                        progress.nextBenefits?.discount,
                        progress.nextBenefits?.leads,
                        progress.nextBenefits?.clients,
                        ...(progress.nextBenefits?.extras ?? []),
                      ].filter(Boolean).map((b: string, i: number) => (
                        <li key={i} className="text-slate-300 text-[11px] flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Recent History */}
            {progress.recentHistory && progress.recentHistory.length > 0 && (
              <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  آخر 3 تقييمات (التاريخ)
                </h3>
                <div className="space-y-2">
                  {progress.recentHistory.map((h: any, i: number) => {
                    const lvl = h.performanceLevel as PerformanceLevel;
                    const lc = LEVEL_CONFIG[lvl];
                    return (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                        <span className="text-slate-400 text-xs">{MONTHS_AR[(h.month ?? 1) - 1]} {h.year}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${lc?.color ?? "text-slate-400"}`}>{h.overallScore}%</span>
                          <Badge className={`${lc?.badge ?? "bg-slate-600"} text-white text-xs`}>{lc?.label ?? "—"}</Badge>
                          <span className="text-slate-500 text-xs">{DECISION_CONFIG[h.decisionAction ?? "none"]?.label ?? ""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Promote Button */}
            {progress.promotionEligible && progress.nextLevel && (
              <Button onClick={() => promote.mutate({ engineerId: eng.engineerId })}
                disabled={promote.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                {promote.isPending ? "جاري الترقية..." : `ترقية إلى ${progress.nextLevelLabel}`}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">لا توجد بيانات</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Engineer Card ─────────────────────────────────────────────────────────────
function EngineerEvalCard({ eng, onRefresh }: { eng: any; onRefresh: () => void }) {
  const [showEvalForm, setShowEvalForm] = useState(false);
  const level = eng.currentEval?.performanceLevel as PerformanceLevel | undefined;
  const levelCfg = level ? LEVEL_CONFIG[level] : null;
  const careerCfg = CAREER_CONFIG[eng.careerLevel as CareerLevel];
  const decisionCfg = DECISION_CONFIG[eng.currentEval?.decisionAction ?? "none"];
  const isFiringRisk = eng.currentEval?.firingDecisionTriggered;
  const consecutiveCMonths = eng.currentEval?.consecutiveCMonths ?? 0;
  const trend = eng.currentEval?.trend ?? "stable";

  return (
    <Card className={`bg-slate-800/60 border-slate-700 transition-all ${
      isFiringRisk ? "border-red-500/60 shadow-lg shadow-red-500/10" :
      level === "a_player" ? "border-emerald-500/30" :
      level === "c_player" ? "border-red-500/20" : ""
    }`}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Name + Career Level + Performance Badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {eng.engineerName.charAt(0)}
            </div>
            <div>
              <p className="text-white font-semibold">{eng.engineerName}</p>
              <div className="flex items-center gap-1">
                {careerCfg && <careerCfg.icon className={`w-3 h-3 ${careerCfg.color}`} />}
                <p className={`text-xs ${careerCfg?.color}`}>{careerCfg?.label}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {level && levelCfg && (
              <Badge className={`${levelCfg.badge} text-white text-xs`}>{levelCfg.label}</Badge>
            )}
            {isFiringRisk && (
              <Badge className="bg-red-700 text-white text-xs animate-pulse">🚨 قرار إداري</Badge>
            )}
            {!isFiringRisk && consecutiveCMonths === 1 && (
              <Badge className="bg-orange-600 text-white text-xs">خطة تحسين</Badge>
            )}
          </div>
        </div>

        {/* Scores */}
        {eng.currentEval ? (
          <>
            {/* Overall Score + Trend */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">الدرجة الإجمالية</span>
                {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                {trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
              </div>
              <span className={`text-2xl font-bold ${levelCfg?.color ?? "text-white"}`}>
                {eng.currentEval.overallScore}%
              </span>
            </div>
            <Progress value={eng.currentEval.overallScore} className="h-2 bg-slate-700" />

            {/* 5 Scores Grid */}
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: "Sales", value: eng.currentEval.salesAchievementScore },
                { label: "Close", value: eng.currentEval.closingRateScore },
                { label: "Meet", value: eng.currentEval.meetingScore },
                { label: "PB", value: eng.currentEval.playbookUsageScore },
                { label: "Task", value: eng.currentEval.taskDisciplineScore },
              ].map(({ label, value }) => (
                <div key={label} className="text-center bg-slate-900/50 rounded p-1">
                  <div className={`text-xs font-bold ${
                    value >= 80 ? "text-emerald-400" : value >= 60 ? "text-amber-400" : "text-red-400"
                  }`}>{value}%</div>
                  <div className="text-slate-500 text-[9px]">{label}</div>
                </div>
              ))}
            </div>

            {/* Decision Action */}
            <div className={`rounded-lg p-2 text-center ${decisionCfg.bg}`}>
              <p className={`text-xs font-semibold ${decisionCfg.color}`}>{decisionCfg.label}</p>
            </div>

            {/* Promotion Readiness */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">نسبة تحقيق الترقية</span>
              <div className="flex items-center gap-2">
                <Progress value={eng.currentEval.promotionReadinessScore} className="w-20 h-1.5 bg-slate-700" />
                <span className={`font-semibold ${
                  eng.currentEval.promotionReadinessScore >= 80 ? "text-emerald-400" :
                  eng.currentEval.promotionReadinessScore >= 50 ? "text-amber-400" : "text-red-400"
                }`}>{eng.currentEval.promotionReadinessScore}%</span>
              </div>
            </div>

            {/* Promotion Eligible */}
            {eng.currentEval.promotionEligible && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
                <p className="text-emerald-400 text-xs font-semibold">✅ مؤهل للترقية</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">لم يتم التقييم بعد</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Dialog open={showEvalForm} onOpenChange={setShowEvalForm}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs">
                + تقييم شهري
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle>تقييم شهري — {eng.engineerName}</DialogTitle>
              </DialogHeader>
              <EvaluationForm engineerId={eng.engineerId} engineerName={eng.engineerName}
                onSuccess={() => { setShowEvalForm(false); onRefresh(); }} />
            </DialogContent>
          </Dialog>
          <EngineerDetailModal eng={eng} onRefresh={onRefresh} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PromotionSystem() {
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterCareer, setFilterCareer] = useState("all");
  const { data, refetch, isLoading } = trpc.promotion.getAllEngineersDashboard.useQuery();

  const engineers = (data ?? []) as any[];
  const filtered = engineers.filter(e => {
    if (filterLevel !== "all" && e.currentEval?.performanceLevel !== filterLevel) return false;
    if (filterCareer !== "all" && e.careerLevel !== filterCareer) return false;
    return true;
  });

  const aPlayers = engineers.filter(e => e.currentEval?.performanceLevel === "a_player").length;
  const bPlayers = engineers.filter(e => e.currentEval?.performanceLevel === "b_player").length;
  const cPlayers = engineers.filter(e => e.currentEval?.performanceLevel === "c_player").length;
  const firingRisk = engineers.filter(e => e.currentEval?.firingDecisionTriggered).length;
  const promotionEligible = engineers.filter(e => e.currentEval?.promotionEligible).length;
  const unEvaluated = engineers.filter(e => !e.currentEval).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Crown className="w-7 h-7 text-amber-400" />
            نظام التقييم والترقية
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            "الترقية ليست قرار… الترقية نتيجة أداء مستمر"
          </p>
        </div>
        <div className="text-slate-400 text-sm">{engineers.length} مهندس إجمالاً</div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-700 text-slate-300">لوحة التحكم</TabsTrigger>
          <TabsTrigger value="career-path" className="data-[state=active]:bg-slate-700 text-slate-300">المسار الوظيفي</TabsTrigger>
          <TabsTrigger value="rules" className="data-[state=active]:bg-slate-700 text-slate-300">قواعد الترقية</TabsTrigger>
        </TabsList>

        {/* ─── Dashboard Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-5 mt-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "A Player", value: aPlayers, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: Trophy },
              { label: "B Player", value: bPlayers, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Shield },
              { label: "C Player", value: cPlayers, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: AlertTriangle },
              { label: "مؤهل للترقية", value: promotionEligible, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: ArrowUpCircle },
              { label: "قرار إداري", value: firingRisk, color: "text-red-300", bg: "bg-red-900/20", border: "border-red-700/50", icon: AlertCircle },
              { label: "غير مقيّم", value: unEvaluated, color: "text-slate-400", bg: "bg-slate-800/50", border: "border-slate-600", icon: Clock },
            ].map(({ label, value, color, bg, border, icon: Icon }) => (
              <Card key={label} className={`${bg} border ${border}`}>
                <CardContent className="p-3 text-center">
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-slate-400 text-xs">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Firing Risk Alert */}
          {firingRisk > 0 && (
            <Card className="bg-red-900/20 border-red-700/50">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-bold">⚠️ تنبيه عاجل: {firingRisk} مهندس في وضع قرار إداري</p>
                  <p className="text-slate-400 text-sm mt-1">
                    هؤلاء المهندسون حققوا C Player لشهرين متتاليين. يجب اتخاذ قرار إداري فوري وفق قواعد النظام.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-44 bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="مستوى الأداء" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">كل المستويات</SelectItem>
                <SelectItem value="a_player" className="text-emerald-400">A Player فقط</SelectItem>
                <SelectItem value="b_player" className="text-amber-400">B Player فقط</SelectItem>
                <SelectItem value="c_player" className="text-red-400">C Player فقط</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCareer} onValueChange={setFilterCareer}>
              <SelectTrigger className="w-52 bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="المستوى الوظيفي" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">كل المستويات الوظيفية</SelectItem>
                <SelectItem value="sales_engineer" className="text-blue-400">Sales Engineer</SelectItem>
                <SelectItem value="senior_sales_engineer" className="text-purple-400">Senior Sales Engineer</SelectItem>
                <SelectItem value="sales_consultant" className="text-amber-400">Sales Consultant</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-slate-400 text-sm">{filtered.length} مهندس</span>
          </div>

          {/* Engineer Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-slate-800/40 border-slate-700 animate-pulse h-72" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="text-lg">لا يوجد مهندسون بهذا الفلتر</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((eng) => (
                <EngineerEvalCard key={eng.engineerId} eng={eng} onRefresh={refetch} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Career Path Tab ───────────────────────────────────────────────── */}
        <TabsContent value="career-path" className="space-y-5 mt-4">
          <div className="text-slate-400 text-sm bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            ❗ هذا المسار متخصص في البيع + التصميم — لا يتم التحويل إلى إدارة
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["sales_engineer", "senior_sales_engineer", "sales_consultant"] as CareerLevel[]).map((level, i) => {
              const cfg = CAREER_CONFIG[level];
              const count = engineers.filter(e => e.careerLevel === level).length;
              const engList = engineers.filter(e => e.careerLevel === level);
              return (
                <div key={level} className="relative">
                  {i < 2 && (
                    <div className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10">
                      <ChevronRight className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  <Card className={`${cfg.bg} border ${cfg.border} h-full`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                        <span className={cfg.color}>{cfg.label}</span>
                        <Badge className="bg-slate-700 text-slate-300 ml-auto">{count} مهندس</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <p className="text-slate-400 text-xs font-semibold">المزايا:</p>
                        {[cfg.commission, cfg.discount, cfg.leads, cfg.clients, ...cfg.extras].map((b, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <CheckCircle className={`w-3 h-3 ${cfg.color} flex-shrink-0 mt-0.5`} />
                            <span className="text-slate-300 text-xs">{b}</span>
                          </div>
                        ))}
                      </div>
                      {engList.length > 0 && (
                        <div className="border-t border-slate-700 pt-2">
                          <p className="text-slate-400 text-xs mb-1.5">المهندسون:</p>
                          <div className="flex flex-wrap gap-1">
                            {engList.map((e: any) => (
                              <div key={e.engineerId} className="flex items-center gap-1 bg-slate-800/60 rounded px-2 py-0.5">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold">
                                  {e.engineerName.charAt(0)}
                                </div>
                                <span className="text-slate-300 text-xs">{e.engineerName}</span>
                                {e.currentEval?.performanceLevel && (
                                  <Badge className={`${LEVEL_CONFIG[e.currentEval.performanceLevel as PerformanceLevel]?.badge ?? "bg-slate-600"} text-white text-[9px] px-1 py-0`}>
                                    {LEVEL_CONFIG[e.currentEval.performanceLevel as PerformanceLevel]?.label}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className={`text-xs ${cfg.color} font-semibold`}>{cfg.promotionTarget}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── Rules Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-5 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Promotion Rules: Sales Engineer → Senior */}
            <Card className="bg-slate-800/60 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Sales Engineer → Senior
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { criterion: "Sales Target ≥ 80%", detail: "لمدة شهرين متتاليين", critical: true },
                  { criterion: "Meeting Score ≥ 70%", detail: "متوسط درجات Meeting Reviews", critical: true },
                  { criterion: "Playbook Usage ≥ 70%", detail: "الالتزام بالـ Playbook", critical: true },
                  { criterion: "Task Completion 100%", detail: "Meeting + Recording مكتملة", critical: true },
                  { criterion: "لا يوجد تأخير في Tasks", detail: "صفر تأخيرات", critical: false },
                  { criterion: "Meeting Recordings كاملة", detail: "كل اجتماع مسجّل", critical: true },
                  { criterion: "Meeting Reviews موجودة", detail: "كل اجتماع مراجَع", critical: true },
                ].map(({ criterion, detail, critical }) => (
                  <div key={criterion} className="flex items-start gap-2 p-2 bg-slate-900/40 rounded">
                    <Target className={`w-4 h-4 flex-shrink-0 mt-0.5 ${critical ? "text-blue-400" : "text-slate-400"}`} />
                    <div className="flex-1">
                      <p className="text-white text-xs font-medium">{criterion}</p>
                      <p className="text-slate-400 text-[11px]">{detail}</p>
                    </div>
                    {critical && <Badge className="bg-blue-800/50 text-blue-300 text-[10px] flex-shrink-0">أساسي</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Promotion Rules: Senior → Consultant */}
            <Card className="bg-slate-800/60 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Senior → Sales Consultant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { criterion: "Sales Target ≥ 100%", detail: "لمدة 3 شهور متتالية", critical: true },
                  { criterion: "Closing Rate ≥ 70%", detail: "نسبة إغلاق الصفقات", critical: true },
                  { criterion: "Meeting Score ≥ 80%", detail: "متوسط درجات Meeting Reviews", critical: true },
                  { criterion: "Playbook Usage ≥ 85%", detail: "الالتزام بالـ Playbook", critical: true },
                  { criterion: "تقليل استخدام الخصومات", detail: "خصومات محدودة", critical: false },
                  { criterion: "Clients High Value", detail: "القدرة على التعامل مع عملاء VIP", critical: false },
                  { criterion: "Meeting Recordings + Reviews", detail: "100% كاملة", critical: true },
                  { criterion: "استخدام Playbook فعلي ≥ 85%", detail: "شرط إجباري", critical: true },
                ].map(({ criterion, detail, critical }) => (
                  <div key={criterion} className="flex items-start gap-2 p-2 bg-slate-900/40 rounded">
                    <Target className={`w-4 h-4 flex-shrink-0 mt-0.5 ${critical ? "text-purple-400" : "text-slate-400"}`} />
                    <div className="flex-1">
                      <p className="text-white text-xs font-medium">{criterion}</p>
                      <p className="text-slate-400 text-[11px]">{detail}</p>
                    </div>
                    {critical && <Badge className="bg-purple-800/50 text-purple-300 text-[10px] flex-shrink-0">أساسي</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Performance Levels */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  مستويات الأداء الشهري
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["a_player", "b_player", "c_player"] as PerformanceLevel[]).map((lvl) => {
                  const lc = LEVEL_CONFIG[lvl];
                  return (
                    <div key={lvl} className={`${lc.bg} border ${lc.border} rounded-lg p-3`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <lc.icon className={`w-4 h-4 ${lc.color}`} />
                          <p className={`font-semibold text-sm ${lc.color}`}>{lc.label}</p>
                        </div>
                        <Badge className="bg-slate-700 text-slate-300 text-xs">
                          {lvl === "a_player" ? "≥ 80%" : lvl === "b_player" ? "60% - 79%" : "< 60%"}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-xs">{lc.description}</p>
                      <p className={`text-xs font-semibold mt-1 ${lc.color}`}>الإجراء: {lc.action}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Demotion / Warning / Firing Logic */}
            <Card className="bg-slate-800/60 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Warning / Demotion / Firing Logic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { trigger: "C Player (أول مرة)", action: "Warning رسمي", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: AlertCircle },
                  { trigger: "شهر واحد C Player", action: "خطة تحسين 30 يوم", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: Clock },
                  { trigger: "شهرين متتاليين C Player", action: "قرار إداري — Firing Risk", color: "text-red-300", bg: "bg-red-900/20", border: "border-red-700/50", icon: AlertTriangle },
                  { trigger: "لم يتحسن بعد الخطة", action: "قرار إداري نهائي", color: "text-red-200", bg: "bg-red-900/30", border: "border-red-600/50", icon: XCircle },
                ].map(({ trigger, action, color, bg, border, icon: Icon }) => (
                  <div key={trigger} className={`${bg} border ${border} rounded-lg p-3 flex items-start gap-3`}>
                    <Icon className={`w-4 h-4 ${color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-white text-xs font-medium">{trigger}</p>
                      <p className={`text-xs font-semibold ${color}`}>→ {action}</p>
                    </div>
                  </div>
                ))}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                  <p className="text-slate-300 text-xs font-semibold mb-1">قاعدة الترقية الذهبية:</p>
                  <p className="text-slate-400 text-xs">
                    لا تتم الترقية إلا إذا: Meeting Score عالي + Closing Rate جيد + Playbook ملتزم
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mandatory Conditions */}
            <Card className="bg-slate-800/60 border-amber-500/20 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-amber-400 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  الشروط الإجبارية — لا توجد ترقية بدونها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { icon: Video, label: "Meeting Recordings كاملة", detail: "كل اجتماع يجب أن يكون مسجّلاً بالكامل", color: "text-blue-400" },
                    { icon: FileText, label: "Meeting Reviews موجودة", detail: "كل اجتماع يجب أن يكون مراجَعاً ومقيّماً", color: "text-purple-400" },
                    { icon: BookOpen, label: "استخدام Playbook فعلي", detail: "الالتزام بالـ Playbook في كل اجتماع (≥ 70% / 85%)", color: "text-emerald-400" },
                  ].map(({ icon: Icon, label, detail, color }) => (
                    <div key={label} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <Icon className={`w-5 h-5 ${color} mb-2`} />
                      <p className="text-white text-sm font-semibold">{label}</p>
                      <p className="text-slate-400 text-xs mt-1">{detail}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card className="bg-slate-800/60 border-slate-700 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  أهداف النظام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "بناء فريق قوي", icon: Users, color: "text-emerald-400" },
                    { label: "تصفية الضعيف", icon: XCircle, color: "text-red-400" },
                    { label: "تطوير المتوسط", icon: TrendingUp, color: "text-amber-400" },
                    { label: "ربط الترقية بالأداء الحقيقي", icon: Target, color: "text-blue-400" },
                  ].map(({ label, icon: Icon, color }) => (
                    <div key={label} className="bg-slate-900/50 rounded-lg p-3 text-center">
                      <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
                      <p className="text-slate-300 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
