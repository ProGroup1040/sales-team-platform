import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, Users, Plus, ChevronLeft, ChevronRight,
  Flame, Trophy, TrendingDown, UserCog, Trash2, Calendar, Star
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function formatDate(d: Date) {
  return d.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  planned:      { label: "مخططة",       color: "bg-blue-500/20 text-blue-400 border-blue-500/30",       icon: <Calendar className="h-3 w-3" /> },
  completed:    { label: "منجزة",        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  delayed:      { label: "متأخرة",       color: "bg-amber-500/20 text-amber-400 border-amber-500/30",    icon: <Clock className="h-3 w-3" /> },
  not_done:     { label: "لم تُنفذ",     color: "bg-red-500/20 text-red-400 border-red-500/30",          icon: <XCircle className="h-3 w-3" /> },
  client_delay: { label: "تأخير العميل", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Users className="h-3 w-3" /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: "منخفضة", color: "text-slate-400" },
  medium: { label: "متوسطة", color: "text-blue-400" },
  high:   { label: "عالية",  color: "text-amber-400" },
  urgent: { label: "عاجلة",  color: "text-red-400" },
};

// ─── Score Circle ─────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? "text-emerald-400" : score >= 70 ? "text-blue-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const strokeColor = score >= 90 ? "#10b981" : score >= 70 ? "#6366f1" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 90 ? "ممتاز" : score >= 70 ? "جيد" : score >= 50 ? "مقبول" : "ضعيف";
  const r = 15.9;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
          <circle cx="18" cy="18" r={r} fill="none" stroke={strokeColor} strokeWidth="2.5"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${color}`}>{score}%</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{label}</span>
    </div>
  );
}

// ─── Update Status Dialog ─────────────────────────────────────────────────────
function UpdateStatusDialog({ task, onDone }: { task: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(task.status);
  const [delayDays, setDelayDays] = useState(1);
  const [notes, setNotes] = useState(task.notes ?? "");
  const utils = trpc.useUtils();
  const updateMut = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.tasks.stats.invalidate(); utils.tasks.list.invalidate(); utils.tasks.critical.invalidate();
      toast.success("تم تحديث حالة المهمة"); setOpen(false); onDone();
    },
    onError: () => toast.error("حدث خطأ أثناء التحديث"),
  });

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs h-7 border-white/20 bg-white/5 hover:bg-white/10"
        onClick={() => setOpen(true)}>تحديث الحالة</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>تحديث حالة المهمة</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="font-medium text-sm">{task.title}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">الحالة الجديدة</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["completed", "delayed", "not_done", "client_delay"] as const).map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${status === s ? STATUS_CONFIG[s].color + " border-current" : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"}`}>
                    {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            {status === "delayed" && (
              <div className="space-y-2">
                <Label className="text-white/70">عدد أيام التأخير</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(d => (
                    <button key={d} onClick={() => setDelayDays(d)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${delayDays === d ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"}`}>
                      {d} {d === 1 ? "يوم" : "أيام"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40">
                  النقطة: {delayDays <= 1 ? "0.5" : delayDays === 2 ? "0.3" : delayDays === 3 ? "0.1" : "0"} من 1
                  {delayDays > 2 && <span className="text-red-400 mr-2"> ⚠ ستُصنف كمهمة حرجة</span>}
                </p>
              </div>
            )}
            {status === "client_delay" && (
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                سيتم إنشاء مهمة جديدة بتاريخ الغد تلقائياً ولن تؤثر على تقييم المهندس
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-white/70">ملاحظات (اختياري)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm resize-none h-20" placeholder="أضف ملاحظة..." />
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={updateMut.isPending}
              onClick={() => updateMut.mutate({ id: task.id, status: status as any, delayDays: status === "delayed" ? delayDays : undefined, notes })}>
              {updateMut.isPending ? "جاري الحفظ..." : "حفظ التحديث"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Add Task Dialog ──────────────────────────────────────────────────────────
function AddTaskDialog({ engineers, dateStr, onDone }: { engineers: any[]; dateStr: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ engineerId: "", title: "", description: "", priority: "medium", plannedHours: "1" });
  const utils = trpc.useUtils();
  const createMut = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.stats.invalidate(); utils.tasks.list.invalidate();
      toast.success("تمت إضافة المهمة"); setOpen(false);
      setForm({ engineerId: "", title: "", description: "", priority: "medium", plannedHours: "1" });
      onDone();
    },
    onError: () => toast.error("حدث خطأ أثناء الإضافة"),
  });

  return (
    <>
      <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />إضافة مهمة
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>إضافة مهمة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-white/70">المهندس *</Label>
              <Select value={form.engineerId} onValueChange={v => setForm(f => ({ ...f, engineerId: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {engineers.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10">{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">عنوان المهمة *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="bg-white/5 border-white/10 text-white" placeholder="أدخل عنوان المهمة" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/70">الأولوية</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k} className="text-white hover:bg-white/10">{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">الساعات المخططة</Label>
                <Input type="number" min="0.5" max="8" step="0.5" value={form.plannedHours}
                  onChange={e => setForm(f => ({ ...f, plannedHours: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">الوصف (اختياري)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white resize-none h-20" placeholder="تفاصيل المهمة..." />
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={createMut.isPending || !form.engineerId || !form.title}
              onClick={() => createMut.mutate({
                engineerId: Number(form.engineerId), taskDate: dateStr, title: form.title,
                description: form.description || undefined, priority: form.priority as any,
                plannedHours: Number(form.plannedHours)
              })}>
              {createMut.isPending ? "جاري الإضافة..." : "إضافة المهمة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Manage Engineers Dialog ──────────────────────────────────────────────────
function ManageEngineersDialog({ engineers, onDone }: { engineers: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", department: "", role: "engineer" });
  const utils = trpc.useUtils();
  const createMut = trpc.tasks.createEngineer.useMutation({
    onSuccess: () => {
      utils.tasks.engineers.invalidate(); toast.success("تمت إضافة المهندس");
      setForm({ name: "", phone: "", department: "", role: "engineer" }); onDone();
    },
    onError: () => toast.error("حدث خطأ"),
  });
  const deleteMut = trpc.tasks.deleteEngineer.useMutation({
    onSuccess: () => { utils.tasks.engineers.invalidate(); toast.success("تم حذف المهندس"); onDone(); },
    onError: () => toast.error("حدث خطأ"),
  });

  return (
    <>
      <Button variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 gap-2" onClick={() => setOpen(true)}>
        <UserCog className="h-4 w-4" />إدارة المهندسين
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader><DialogTitle>إدارة المهندسين</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <p className="text-sm font-semibold text-white/70">إضافة مهندس جديد</p>
              <div className="grid grid-cols-2 gap-3">
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-sm" placeholder="الاسم *" />
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-sm" placeholder="الهاتف" />
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-sm" placeholder="القسم" />
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="engineer" className="text-white hover:bg-white/10">مهندس</SelectItem>
                    <SelectItem value="admin" className="text-white hover:bg-white/10">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-2 w-full"
                disabled={!form.name || createMut.isPending}
                onClick={() => createMut.mutate({ name: form.name, phone: form.phone || undefined, department: form.department || undefined, role: form.role as any })}>
                <Plus className="h-3 w-3" /> إضافة
              </Button>
            </div>
            <div className="space-y-2">
              {engineers.map(eng => (
                <div key={eng.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <p className="font-medium text-sm">{eng.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {eng.department && <span className="text-xs text-white/40">{eng.department}</span>}
                      <Badge className={`text-xs ${eng.role === "admin" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>
                        {eng.role === "admin" ? "مدير" : "مهندس"}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                    onClick={() => deleteMut.mutate({ id: eng.id })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TasksModule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"admin" | "engineer">("admin");
  const [selectedEngineer, setSelectedEngineer] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"tasks" | "ranking" | "critical">("tasks");

  const dateStr = toDateStr(currentDate);
  const isToday = toDateStr(new Date()) === dateStr;
  const utils = trpc.useUtils();

  const statsQ = trpc.tasks.stats.useQuery({ date: dateStr });
  const listQ = trpc.tasks.list.useQuery({
    date: dateStr,
    engineerId: viewMode === "engineer" && selectedEngineer ? Number(selectedEngineer) : undefined
  });
  const criticalQ = trpc.tasks.critical.useQuery();
  const engineersQ = trpc.tasks.engineers.useQuery();

  const stats = statsQ.data;
  const tasks = listQ.data ?? [];
  const engineers = engineersQ.data ?? [];
  const criticalTasks = criticalQ.data ?? [];

  const deleteMut = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.stats.invalidate(); utils.tasks.list.invalidate(); toast.success("تم حذف المهمة"); },
    onError: () => toast.error("حدث خطأ"),
  });

  const filteredTasks = useMemo(() => {
    if (viewMode === "engineer" && selectedEngineer) return tasks.filter(t => t.engineerId === Number(selectedEngineer));
    return tasks;
  }, [tasks, viewMode, selectedEngineer]);

  return (
    <div className="p-6 space-y-6 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">المهام اليومية</h1>
          <p className="text-white/50 text-sm mt-1">نظام متابعة وتقييم تنفيذ المهام</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button onClick={() => setViewMode("admin")}
              className={`px-4 py-2 text-sm font-medium transition-all ${viewMode === "admin" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
              عرض المدير
            </button>
            <button onClick={() => setViewMode("engineer")}
              className={`px-4 py-2 text-sm font-medium transition-all ${viewMode === "engineer" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
              عرض المهندس
            </button>
          </div>
          {viewMode === "admin" && (
            <>
              <ManageEngineersDialog engineers={engineers} onDone={() => engineersQ.refetch()} />
              <AddTaskDialog engineers={engineers} dateStr={dateStr} onDone={() => { statsQ.refetch(); listQ.refetch(); }} />
            </>
          )}
          {viewMode === "engineer" && (
            <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-48"><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {engineers.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10">{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentDate(d => addDays(d, -1))}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
          <ChevronRight className="h-4 w-4 text-white" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-white font-semibold">{formatDate(currentDate)}</p>
          {isToday && <span className="text-xs text-indigo-400 font-medium">اليوم</span>}
        </div>
        <button onClick={() => setCurrentDate(d => addDays(d, 1))}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        {!isToday && (
          <button onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs hover:bg-indigo-600/30 transition-all">
            اليوم
          </button>
        )}
      </div>

      {/* Alerts */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((alert: any, i: number) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${alert.severity === "high" ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"}`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "المخططة",     value: stats?.planned ?? 0,      icon: <Calendar className="h-5 w-5" />,    color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "المنجزة",     value: stats?.completed ?? 0,    icon: <CheckCircle2 className="h-5 w-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "المتأخرة",    value: stats?.delayed ?? 0,      icon: <Clock className="h-5 w-5" />,        color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "لم تُنفذ",   value: stats?.not_done ?? 0,     icon: <XCircle className="h-5 w-5" />,      color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
          { label: "تأخير العميل", value: stats?.client_delay ?? 0, icon: <Users className="h-5 w-5" />,      color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
        ].map((kpi, i) => (
          <Card key={i} className={`border ${kpi.bg} bg-transparent`}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <div className={kpi.color}>{kpi.icon}</div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-white/50 text-xs">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Tasks Banner */}
      {(stats?.critical ?? 0) > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <Flame className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-red-300 font-semibold text-sm">تنبيه: {stats?.critical} مهمة حرجة</p>
            <p className="text-red-400/70 text-xs">مهام متأخرة أكثر من يومين تحتاج تدخلاً فورياً</p>
          </div>
          <button onClick={() => setActiveTab("critical")} className="mr-auto text-xs text-red-400 underline hover:text-red-300">
            عرض التفاصيل
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        {[
          { key: "tasks",    label: "قائمة المهام" },
          { key: "ranking",  label: "ترتيب المهندسين" },
          { key: "critical", label: `المهام الحرجة${criticalTasks.length > 0 ? ` (${criticalTasks.length})` : ""}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Tasks List ── */}
      {activeTab === "tasks" && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد مهام لهذا اليوم</p>
              {viewMode === "admin" && <p className="text-xs mt-2">اضغط "إضافة مهمة" لإضافة مهام جديدة</p>}
            </div>
          ) : filteredTasks.map(task => {
            const eng = engineers.find((e: any) => e.id === task.engineerId);
            const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.planned;
            const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
            return (
              <div key={task.id} className={`p-4 rounded-xl border bg-white/3 hover:bg-white/5 transition-all ${task.isCritical ? "border-red-500/40 bg-red-500/5" : "border-white/10"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {task.isCritical === 1 && <Flame className="h-4 w-4 text-red-400 shrink-0" />}
                      <p className="font-semibold text-white text-sm">{task.title}</p>
                      {task.isRescheduled === 1 && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">مُعاد جدولتها</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {eng && <span className="text-xs text-white/50">{(eng as any).name}</span>}
                      <Badge className={`text-xs border ${sc.color} flex items-center gap-1`}>{sc.icon}{sc.label}</Badge>
                      <span className={`text-xs font-medium ${pc.color}`}>{pc.label}</span>
                      {task.status === "delayed" && task.delayDays > 0 && (
                        <span className="text-xs text-amber-400">{task.delayDays} {task.delayDays === 1 ? "يوم" : "أيام"} تأخير</span>
                      )}
                    </div>
                    {task.notes && <p className="text-xs text-white/40 mt-1">{task.notes}</p>}
                  </div>
                  {viewMode === "admin" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <UpdateStatusDialog task={task} onDone={() => { statsQ.refetch(); listQ.refetch(); criticalQ.refetch(); }} />
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                        onClick={() => deleteMut.mutate({ id: task.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Ranking ── */}
      {activeTab === "ranking" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-white/10 bg-white/3">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" /> أفضل 3 مهندسين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stats?.topEngineers ?? []).length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">لا توجد بيانات كافية</p>
              ) : (stats?.topEngineers ?? []).map((eng: any, i: number) => (
                <div key={eng.engineerId} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-300" : "bg-orange-700/20 text-orange-400"}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white">{eng.engineerName}</p>
                    <p className="text-xs text-white/40">{eng.completed} منجزة / {eng.planned} مخططة</p>
                  </div>
                  <ScoreBadge score={eng.executionScore} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/3">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-400" /> يحتاجون تحسين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stats?.bottomEngineers ?? []).length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">لا توجد بيانات كافية</p>
              ) : (stats?.bottomEngineers ?? []).map((eng: any, i: number) => (
                <div key={eng.engineerId} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-red-500/10 text-red-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white">{eng.engineerName}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-white/40">{eng.completed} منجزة / {eng.planned} مخططة</p>
                      {eng.delayed >= 3 && <span className="text-xs text-amber-400">تأخيرات متكررة</span>}
                    </div>
                  </div>
                  <ScoreBadge score={eng.executionScore} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* All Engineers */}
          <Card className="border-white/10 bg-white/3 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Star className="h-5 w-5 text-indigo-400" /> تقييم جميع المهندسين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(stats?.byEngineer ?? []).length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-4">لا توجد مهام لهذا اليوم</p>
                ) : [...(stats?.byEngineer ?? [])].sort((a: any, b: any) => b.executionScore - a.executionScore).map((eng: any) => (
                  <div key={eng.engineerId} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white">{eng.engineerName}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-emerald-400">✓ {eng.completed} منجزة</span>
                          <span className="text-xs text-amber-400">⏰ {eng.delayed} متأخرة</span>
                          <span className="text-xs text-red-400">✗ {eng.not_done} لم تُنفذ</span>
                          {eng.client_delay > 0 && <span className="text-xs text-purple-400">👤 {eng.client_delay} تأخير عميل</span>}
                          {eng.critical > 0 && <span className="text-xs text-red-400 font-bold">🔥 {eng.critical} حرجة</span>}
                        </div>
                      </div>
                      <ScoreBadge score={eng.executionScore} />
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${eng.executionScore >= 90 ? "bg-emerald-500" : eng.executionScore >= 70 ? "bg-blue-500" : eng.executionScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${eng.executionScore}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Critical Tasks ── */}
      {activeTab === "critical" && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 shrink-0" />
            المهام الحرجة هي المهام المتأخرة أكثر من يومين وتحتاج تدخلاً فورياً
          </div>
          {criticalTasks.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد مهام حرجة حالياً</p>
            </div>
          ) : criticalTasks.map((task: any) => {
            const eng = engineers.find((e: any) => e.id === task.engineerId);
            return (
              <div key={task.id} className="p-4 rounded-xl border border-red-500/40 bg-red-500/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="h-4 w-4 text-red-400" />
                      <p className="font-semibold text-white text-sm">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {eng && <span className="text-xs text-white/50">{(eng as any).name}</span>}
                      <span className="text-xs text-red-400 font-medium">{task.delayDays} {task.delayDays === 1 ? "يوم" : "أيام"} تأخير</span>
                      <span className="text-xs text-white/40">{new Date(task.taskDate).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                  {viewMode === "admin" && (
                    <UpdateStatusDialog task={task} onDone={() => { statsQ.refetch(); listQ.refetch(); criticalQ.refetch(); }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
