import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  BookOpen, Video, FileText, Star, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, XCircle, Clock, Users, Target, Award,
  ChevronRight, ChevronDown, Search, Filter, BarChart3, ArrowUpCircle,
  MessageSquare, Zap, Eye, Play, Upload, Plus, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const YEAR = new Date().getFullYear();
const MONTH = new Date().getMonth() + 1;

// ─── Tab 1: Playbook ─────────────────────────────────────────────────────────
function PlaybookTab() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [recordingLink, setRecordingLink] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const { data: items = [], refetch } = trpc.playbook.list.useQuery({ category: selectedCategory === "all" ? undefined : selectedCategory });
  const { data: categories = [] } = trpc.playbook.categories.useQuery();
  const importMut = trpc.playbook.import.useMutation({ onSuccess: () => { refetch(); setImportDialogOpen(false); toast.success("تم الاستيراد بنجاح"); } });

  const filtered = useMemo(() =>
    items.filter((i: any) => i.name?.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const presentationItems = filtered.filter((i: any) => i.videoUrl || i.script || i.renderUrl || i.price);

  function handleImport() {
    try {
      const lines = importText.split("\n").filter(l => l.trim());
      const parsed = lines.map(l => {
        const parts = l.split(",");
        return { name: parts[0]?.trim() || "بند", category: parts[1]?.trim(), price: parseFloat(parts[2]) || undefined, unit: parts[3]?.trim() };
      });
      importMut.mutate({ items: parsed });
    } catch { toast.error("خطأ في تنسيق البيانات"); }
  }

  if (presentationMode && presentationItems.length > 0) {
    const item = presentationItems[presentationIndex];
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setPresentationMode(false)} className="border-slate-600 text-white">
              ✕ إغلاق
            </Button>
            <span className="text-slate-400 text-sm">{presentationIndex + 1} / {presentationItems.length}</span>
          </div>
          <h2 className="text-white font-bold text-lg">{item.name}</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-slate-600 text-white" onClick={() => setPresentationIndex(Math.max(0, presentationIndex - 1))} disabled={presentationIndex === 0}>
              ← السابق
            </Button>
            <Button size="sm" variant="outline" className="border-slate-600 text-white" onClick={() => setPresentationIndex(Math.min(presentationItems.length - 1, presentationIndex + 1))} disabled={presentationIndex === presentationItems.length - 1}>
              التالي →
            </Button>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4 p-6 overflow-auto">
          {/* Render / Image */}
          {item.renderUrl && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3 text-blue-400"><Eye className="w-4 h-4" /><span className="font-semibold">Render</span></div>
              <img src={item.renderUrl} alt={item.name} className="w-full rounded-lg object-cover max-h-64" />
            </div>
          )}
          {/* Video */}
          {item.videoUrl && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3 text-emerald-400"><Play className="w-4 h-4" /><span className="font-semibold">فيديو العرض</span></div>
              <a href={item.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-400 hover:underline">
                <Play className="w-5 h-5" /> تشغيل الفيديو
              </a>
            </div>
          )}
          {/* Script */}
          {item.script && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3 text-purple-400"><FileText className="w-4 h-4" /><span className="font-semibold">Script العرض</span></div>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{item.script}</p>
            </div>
          )}
          {/* Price */}
          {item.price && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3 text-amber-400"><Target className="w-4 h-4" /><span className="font-semibold">السعر</span></div>
              <p className="text-3xl font-bold text-amber-400">{parseFloat(item.price).toLocaleString('ar-EG')} ج.م</p>
              {item.unit && <p className="text-slate-400 text-sm mt-1">/ {item.unit}</p>}
            </div>
          )}
          {/* Key Points */}
          {item.keyPoints && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 col-span-2">
              <div className="flex items-center gap-2 mb-3 text-yellow-400"><Star className="w-4 h-4" /><span className="font-semibold">نقاط البيع الرئيسية</span></div>
              <p className="text-slate-300 text-sm">{item.keyPoints}</p>
            </div>
          )}
        </div>
        {/* Recording Link */}
        <div className="p-4 border-t border-slate-700 flex items-center gap-3">
          <Video className="w-5 h-5 text-slate-400" />
          <Input value={recordingLink} onChange={e => setRecordingLink(e.target.value)} placeholder="رابط تسجيل الاجتماع..." className="bg-slate-800 border-slate-600 text-white flex-1" />
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!recordingLink}>حفظ الرابط</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في البنود..." className="pr-9 bg-slate-800 border-slate-600 text-white" />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-44 bg-slate-800 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-white">كل الفئات</SelectItem>
              {categories.map((c: string) => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-600 text-white"><Upload className="w-4 h-4 mr-1" /> استيراد CSV</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription><DialogTitle>استيراد بنود من CSV</DialogTitle></DialogHeader>
              <p className="text-slate-400 text-sm">الصيغة: اسم البند, الفئة, السعر, الوحدة (سطر لكل بند)</p>
              <Textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="كرسي مكتب, أثاث, 2500, قطعة&#10;طاولة اجتماعات, أثاث, 8000, قطعة" className="bg-slate-800 border-slate-600 text-white h-40" />
              <Button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-700" disabled={importMut.isPending}>
                {importMut.isPending ? "جاري الاستيراد..." : "استيراد"}
              </Button>
            </DialogContent>
          </Dialog>
          {presentationItems.length > 0 && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setPresentationMode(true); setPresentationIndex(0); }}>
              <Play className="w-4 h-4 mr-1" /> Presentation Mode
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "إجمالي البنود", value: items.length, color: "text-blue-400" },
          { label: "بها فيديو", value: items.filter((i: any) => i.videoUrl).length, color: "text-emerald-400" },
          { label: "بها Script", value: items.filter((i: any) => i.script).length, color: "text-purple-400" },
        ].map(s => (
          <Card key={s.label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>لا توجد بنود. أضف بنوداً أو استورد من CSV.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => (
            <Card key={item.id} className="bg-slate-800/60 border-slate-700 hover:border-slate-500 cursor-pointer transition-all" onClick={() => setSelectedItem(item)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{item.name}</p>
                    {item.category && <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 mt-1">{item.category}</Badge>}
                  </div>
                  {item.price && <p className="text-amber-400 font-bold text-sm">{parseFloat(item.price).toLocaleString('ar-EG')}</p>}
                </div>
                {item.description && <p className="text-slate-400 text-xs line-clamp-2 mb-2">{item.description}</p>}
                <div className="flex gap-2 flex-wrap">
                  {item.videoUrl && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"><Play className="w-3 h-3 mr-1" />فيديو</Badge>}
                  {item.script && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"><FileText className="w-3 h-3 mr-1" />Script</Badge>}
                  {item.renderUrl && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"><Eye className="w-3 h-3 mr-1" />Render</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Item Detail Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription>
              <DialogTitle className="text-white">{selectedItem.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {selectedItem.description && <p className="text-slate-300 text-sm">{selectedItem.description}</p>}
              {selectedItem.price && <p className="text-amber-400 font-bold text-xl">{parseFloat(selectedItem.price).toLocaleString('ar-EG')} ج.م / {selectedItem.unit || "وحدة"}</p>}
              {selectedItem.script && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-purple-400 font-semibold text-sm mb-1">Script العرض</p>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedItem.script}</p>
                </div>
              )}
              {selectedItem.keyPoints && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-yellow-400 font-semibold text-sm mb-1">نقاط البيع</p>
                  <p className="text-slate-300 text-sm">{selectedItem.keyPoints}</p>
                </div>
              )}
              {selectedItem.videoUrl && (
                <a href={selectedItem.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-400 hover:underline text-sm">
                  <Play className="w-4 h-4" /> مشاهدة الفيديو
                </a>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Tab 2: Meeting Review ────────────────────────────────────────────────────
function MeetingReviewTab() {
  const [selectedEngineer, setSelectedEngineer] = useState<string>("all");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [form, setForm] = useState({
    playbookUsageScore: 5,
    presentationQualityScore: 5,
    controlScore: 5,
    closingAttemptScore: 5,
    decisionTag: "needs_improvement" as "strong" | "needs_improvement" | "weak",
    strengthPoint: "",
    improvementPoint: "",
    comments: "",
  });

  const { data: engineers = [] } = trpc.engineers.list.useQuery();
  const { data: pendingTasks = [], refetch: refetchPending } = trpc.promotion.getMeetingTasksPendingReview.useQuery();
  const { data: reviewSummaryList = [] } = trpc.promotion.getMeetingReviewSummary.useQuery({
    engineerId: selectedEngineer !== "all" ? parseInt(selectedEngineer) : undefined
  });
  // Aggregate summary from list
  const reviewSummary = reviewSummaryList.length > 0 ? {
    averageScore: Math.round(reviewSummaryList.reduce((s: number, e: any) => s + e.avgScorePct, 0) / reviewSummaryList.length),
    totalReviews: reviewSummaryList.reduce((s: number, e: any) => s + e.totalReviews, 0),
    strongCount: reviewSummaryList.reduce((s: number, e: any) => s + (e.decisionBreakdown?.strong ?? 0), 0),
    needsImprovementCount: reviewSummaryList.reduce((s: number, e: any) => s + (e.decisionBreakdown?.needsImprovement ?? 0), 0),
  } : null;
  const utils = trpc.useUtils();

  const createReviewMut = trpc.promotion.createMeetingReview.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التقييم بنجاح");
      setReviewDialogOpen(false);
      refetchPending();
      utils.promotion.getMeetingReviewSummary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const totalScore = form.playbookUsageScore + form.presentationQualityScore + form.controlScore + form.closingAttemptScore;
  const totalPercent = Math.round((totalScore / 40) * 100);

  function handleSubmitReview() {
    if (!selectedTask) return;
    if (!form.strengthPoint.trim() || !form.improvementPoint.trim()) {
      toast.error("نقطة القوة ونقطة التحسين إجباريتان");
      return;
    }
    createReviewMut.mutate({
      taskId: selectedTask.id,
      engineerId: selectedTask.engineerId,
      ...form,
    });
  }

  const decisionConfig = {
    strong: { label: "Strong Performer", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    needs_improvement: { label: "يحتاج تحسين", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    weak: { label: "ضعيف", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {reviewSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "متوسط الدرجة", value: `${reviewSummary.averageScore ?? 0}%`, color: "text-blue-400" },
            { label: "عدد التقييمات", value: reviewSummary.totalReviews ?? 0, color: "text-emerald-400" },
            { label: "Strong Performers", value: reviewSummary.strongCount ?? 0, color: "text-emerald-400" },
            { label: "يحتاج تحسين", value: reviewSummary.needsImprovementCount ?? 0, color: "text-amber-400" },
          ].map(s => (
            <Card key={s.label} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-400 text-xs">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
          <SelectTrigger className="w-52 bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="كل المهندسين" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-white">كل المهندسين</SelectItem>
            {engineers.map((e: any) => <SelectItem key={e.id} value={String(e.id)} className="text-white">{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="border-amber-500/50 text-amber-400">
          {pendingTasks.length} اجتماع ينتظر التقييم
        </Badge>
      </div>

      {/* Pending Reviews */}
      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            اجتماعات تنتظر التقييم ({pendingTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>كل الاجتماعات تم تقييمها</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div>
                    <p className="text-white text-sm font-medium">{task.title}</p>
                    <p className="text-slate-400 text-xs">{task.engineerName} — {new Date(task.taskDate).toLocaleDateString('ar-EG')}</p>
                    {task.meetingRecordingLink && (
                      <a href={task.meetingRecordingLink} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1 mt-1">
                        <Video className="w-3 h-3" /> مشاهدة التسجيل
                      </a>
                    )}
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setSelectedTask(task); setReviewDialogOpen(true); }}>
                    تقييم
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription>
            <DialogTitle>تقييم الاجتماع — {selectedTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 4 Scores */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "playbookUsageScore", label: "استخدام Playbook", desc: "مدى التزام المهندس بالـ Playbook" },
                { key: "presentationQualityScore", label: "جودة العرض", desc: "وضوح وإقناع العرض التقديمي" },
                { key: "controlScore", label: "التحكم في الاجتماع", desc: "قدرة المهندس على قيادة الاجتماع" },
                { key: "closingAttemptScore", label: "محاولة الإغلاق", desc: "قوة ووضوح محاولة إغلاق الصفقة" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="bg-slate-800 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-white text-sm">{label}</Label>
                    <span className="text-blue-400 font-bold">{(form as any)[key]}/10</span>
                  </div>
                  <p className="text-slate-500 text-xs mb-2">{desc}</p>
                  <input
                    type="range" min={0} max={10} step={1}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) }))}
                    className="w-full accent-blue-500"
                  />
                </div>
              ))}
            </div>

            {/* Total Score */}
            <div className={`rounded-lg p-3 border ${totalPercent >= 75 ? 'bg-emerald-500/10 border-emerald-500/30' : totalPercent >= 50 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-semibold">الدرجة الإجمالية</span>
                <span className={`text-2xl font-bold ${totalPercent >= 75 ? 'text-emerald-400' : totalPercent >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{totalPercent}%</span>
              </div>
              <Progress value={totalPercent} className="h-2" />
              <p className="text-slate-400 text-xs mt-1">{totalScore} / 40 نقطة</p>
            </div>

            {/* Decision Tag */}
            <div>
              <Label className="text-white text-sm mb-2 block">Decision Tag</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["strong", "needs_improvement", "weak"] as const).map(tag => {
                  const cfg = decisionConfig[tag];
                  return (
                    <button key={tag} onClick={() => setForm(f => ({ ...f, decisionTag: tag }))}
                      className={`p-2 rounded-lg border text-sm font-medium transition-all ${form.decisionTag === tag ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mandatory Feedback */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-emerald-400 text-sm mb-1 block">✅ نقطة القوة (إجباري)</Label>
                <Textarea value={form.strengthPoint} onChange={e => setForm(f => ({ ...f, strengthPoint: e.target.value }))}
                  placeholder="ما الذي أداه المهندس بشكل ممتاز؟" className="bg-slate-800 border-slate-600 text-white text-sm h-20" />
              </div>
              <div>
                <Label className="text-amber-400 text-sm mb-1 block">⚠️ نقطة التحسين (إجباري)</Label>
                <Textarea value={form.improvementPoint} onChange={e => setForm(f => ({ ...f, improvementPoint: e.target.value }))}
                  placeholder="ما الذي يحتاج تطوير؟" className="bg-slate-800 border-slate-600 text-white text-sm h-20" />
              </div>
            </div>

            {/* Comments */}
            <div>
              <Label className="text-slate-400 text-sm mb-1 block">ملاحظات إضافية (اختياري)</Label>
              <Textarea value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
                placeholder="أي ملاحظات إضافية..." className="bg-slate-800 border-slate-600 text-white text-sm h-16" />
            </div>

            <Button onClick={handleSubmitReview} className="w-full bg-blue-600 hover:bg-blue-700" disabled={createReviewMut.isPending}>
              {createReviewMut.isPending ? "جاري الحفظ..." : "حفظ التقييم"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 3: Funnel Analysis ───────────────────────────────────────────────────
function FunnelAnalysisTab() {
  const [selectedEngineer, setSelectedEngineer] = useState<string>("all");
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  const { data: engineers = [] } = trpc.engineers.list.useQuery();
  const { data: funnelData } = trpc.funnel.full.useQuery({
    engineerId: selectedEngineer !== "all" ? parseInt(selectedEngineer) : undefined,
    period,
  });
  const { data: comparison } = trpc.funnel.comparison.useQuery();

  const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

  const funnelChartData = funnelData ? [
    { name: "Leads", value: funnelData.funnel.totalLeads, fill: COLORS[0] },
    { name: "تواصل", value: funnelData.funnel.contactedLeads, fill: COLORS[1] },
    { name: "مؤهّل", value: funnelData.funnel.qualifiedLeads, fill: COLORS[2] },
    { name: "عروض", value: funnelData.funnel.proposals, fill: COLORS[3] },
    { name: "تفاوض", value: funnelData.funnel.negotiations, fill: COLORS[4] },
    { name: "مغلق", value: funnelData.funnel.closedWon, fill: "#10b981" },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
          <SelectTrigger className="w-52 bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="كل المهندسين" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-white">كل المهندسين</SelectItem>
            {engineers.map((e: any) => <SelectItem key={e.id} value={String(e.id)} className="text-white">{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
          {(["week", "month", "quarter"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm transition-all ${period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {p === "week" ? "أسبوع" : p === "month" ? "شهر" : "ربع سنة"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {funnelData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Leads الكلي", value: funnelData.funnel.totalLeads ?? 0, color: "text-blue-400" },
            { label: "Closing Rate", value: `${funnelData.conversionRates.quotationToClosing ?? 0}%`, color: "text-emerald-400" },
            { label: "Lost Deals", value: funnelData.lostDealsAnalysis.total ?? 0, color: "text-red-400" },
            { label: "إجمالي الإيرادات", value: `${(funnelData.revenue.totalRevenue ?? 0).toLocaleString('ar-EG')} ج.م`, color: "text-amber-400" },
          ].map(s => (
            <Card key={s.label} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-400 text-xs">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Funnel Chart */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Funnel مراحل البيع</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelChartData.length > 0 ? (
              <div className="space-y-2">
                {funnelChartData.map((stage: any, idx: number) => (
                  <div key={stage.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{stage.name}</span>
                      <span className="text-white font-semibold">{stage.value}</span>
                    </div>
                    <div className="bg-slate-700 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 text-xs text-white font-medium"
                        style={{
                          width: `${funnelChartData[0]?.value > 0 ? Math.round((stage.value / funnelChartData[0].value) * 100) : 0}%`,
                          backgroundColor: COLORS[idx % COLORS.length],
                          minWidth: stage.value > 0 ? "2rem" : "0",
                        }}
                      >
                        {funnelChartData[0]?.value > 0 ? Math.round((stage.value / funnelChartData[0].value) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>

        {/* Lost Deals Analysis */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">تحليل Deals الخاسرة</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData?.lostDealsAnalysis?.byReason && Object.keys(funnelData.lostDealsAnalysis.byReason).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(funnelData.lostDealsAnalysis.byReason).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                    <span className="text-slate-300 text-sm">{reason}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-700 rounded-full h-1.5">
                        <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${funnelData.lostDealsAnalysis.total > 0 ? Math.round(((count as number) / funnelData.lostDealsAnalysis.total) * 100) : 0}%` }} />
                      </div>
                      <span className="text-red-400 text-sm font-semibold">{count as number}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">لا توجد صفقات خاسرة</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engineers Comparison */}
      {comparison && comparison.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">مقارنة Closing Rate بين المهندسين</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={comparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="engineerName" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                <Bar dataKey="closingRate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Closing Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {funnelData?.insights && funnelData.insights.length > 0 && (
        <Card className="bg-slate-800/60 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" /> Insights تلقائية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelData.insights.map((insight: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 4: Coaching Dashboard ────────────────────────────────────────────────
function CoachingDashboardTab() {
  const [selectedEngineer, setSelectedEngineer] = useState<string>("");
  const { data: engineers = [] } = trpc.engineers.list.useQuery();

  const engineerId = selectedEngineer ? parseInt(selectedEngineer) : (engineers[0]?.id ?? 0);

  const { data: coaching } = trpc.playbook.weeklyCoaching.useQuery(
    { engineerId },
    { enabled: engineerId > 0 }
  );

  const trendData: any[] = [];

  const decisionColors: Record<string, string> = {
    strong: "#10b981",
    needs_improvement: "#f59e0b",
    weak: "#ef4444",
  };

  return (
    <div className="space-y-4">
      {/* Engineer Selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedEngineer || String(engineers[0]?.id ?? "")} onValueChange={setSelectedEngineer}>
          <SelectTrigger className="w-52 bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="اختر مهندساً" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {engineers.map((e: any) => <SelectItem key={e.id} value={String(e.id)} className="text-white">{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {coaching ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "متوسط الدرجة الأسبوعية", value: `${coaching.avgScore ?? 0}%`, color: "text-blue-400" },
            { label: "عدد التقييمات هذا الأسبوع", value: coaching.reviewsCount ?? 0, color: "text-emerald-400" },
            { label: "نقاط القوة", value: coaching.strengths?.length ?? 0, color: "text-emerald-400" },
            { label: "نقاط التحسين", value: coaching.improvements?.length ?? 0, color: "text-amber-400" },
            ].map(s => (
              <Card key={s.label} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-slate-400 text-xs">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trend Chart */}
          {trendData.length > 0 && (
            <Card className="bg-slate-800/60 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  اتجاه الأداء الأسبوعي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} unit="%" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 4 }} name="متوسط الدرجة %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Reviews */}
          {/* Strengths */}
          {coaching.strengths && coaching.strengths.length > 0 && (
            <Card className="bg-slate-800/60 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> نقاط القوة هذا الأسبوع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {coaching.strengths.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{s}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Improvements */}
          {coaching.improvements && coaching.improvements.length > 0 && (
            <Card className="bg-slate-800/60 border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> نقاط التحسين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {coaching.improvements.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>اختر مهندساً لعرض بيانات Coaching</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SalesExecutionSystem() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-400" />
          Sales Execution System
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Playbook • Meeting Review • Funnel Analysis • Coaching Dashboard
        </p>
      </div>

      <Tabs defaultValue="playbook" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700 grid grid-cols-4 w-full">
          <TabsTrigger value="playbook" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400">
            <BookOpen className="w-4 h-4 mr-1.5" /> Playbook
          </TabsTrigger>
          <TabsTrigger value="review" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400">
            <Star className="w-4 h-4 mr-1.5" /> Meeting Review
          </TabsTrigger>
          <TabsTrigger value="funnel" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400">
            <BarChart3 className="w-4 h-4 mr-1.5" /> Funnel Analysis
          </TabsTrigger>
          <TabsTrigger value="coaching" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400">
            <MessageSquare className="w-4 h-4 mr-1.5" /> Coaching
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playbook"><PlaybookTab /></TabsContent>
        <TabsContent value="review"><MeetingReviewTab /></TabsContent>
        <TabsContent value="funnel"><FunnelAnalysisTab /></TabsContent>
        <TabsContent value="coaching"><CoachingDashboardTab /></TabsContent>
      </Tabs>
    </div>
  );
}
