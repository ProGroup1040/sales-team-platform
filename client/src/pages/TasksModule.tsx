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
import { DeleteConfirmDialog, type DeleteReason } from "@/components/DeleteConfirmDialog";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, Users, Plus, ChevronLeft, ChevronRight,
  Flame, Trophy, TrendingDown, UserCog, Trash2, Calendar, Star,
  ClipboardList, BarChart2, CalendarDays, Video, Target
} from "lucide-react";
import TaskCalendarView from "@/components/TaskCalendarView";
import TimeFilterBar, { type TimeFilterValue } from "@/components/TimeFilterBar";
import DailyTimeline from "@/components/DailyTimeline";
import { LayoutList, LayoutGrid, Filter, X } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function formatDate(d: Date) {
  return d.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function getWeekStart(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day;
  const start = new Date(d);
  start.setDate(diff);
  return toDateStr(start);
}
function getMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  planned:      { label: "مخططة",       color: "bg-blue-500/20 text-blue-400 border-blue-500/30",       icon: <Calendar className="h-3 w-3" /> },
  completed:    { label: "منجزة",        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  delayed:      { label: "متأخرة",       color: "bg-amber-500/20 text-amber-400 border-amber-500/30",    icon: <Clock className="h-3 w-3" /> },
  not_done:     { label: "لم تُنفذ",     color: "bg-red-500/20 text-red-400 border-red-500/30",          icon: <XCircle className="h-3 w-3" /> },
  client_delay: { label: "تأخير العميل", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Users className="h-3 w-3" /> },
};

const ADMIN_TASK_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "قيد التنفيذ", color: "bg-blue-500/20 text-blue-400 border-blue-500/30",       icon: <Clock className="h-3 w-3" /> },
  done:     { label: "تم",          color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  delayed:  { label: "متأخر",       color: "bg-amber-500/20 text-amber-400 border-amber-500/30",    icon: <AlertTriangle className="h-3 w-3" /> },
  not_done: { label: "لم يتم",      color: "bg-red-500/20 text-red-400 border-red-500/30",          icon: <XCircle className="h-3 w-3" /> },
};

const MEETING_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: "قيد الانتظار", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  done:     { label: "تم",           color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  not_done: { label: "لم يتم",       color: "bg-red-500/20 text-red-400 border-red-500/30" },
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
  const [recordingLink, setRecordingLink] = useState(task.meetingRecordingLink ?? "");
  const [showReview, setShowReview] = useState(false);
  const utils = trpc.useUtils();
  const isClosingOrMeeting = task.category === 'closing' || task.category === 'meeting';
  const needsRecording = isClosingOrMeeting && !task.meetingRecordingLink;

  const submitLinkMut = trpc.meetingReview.submitLink.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("تم حفظ رابط التسجيل وإرسال إشعار لـ Admin Sales");
    },
    onError: () => toast.error("رابط غير صحيح"),
  });

  const updateMut = trpc.tasks.updateStatus.useMutation({
    onSuccess: (res: any) => {
      if (res?.error === 'RECORDING_REQUIRED') {
        toast.error("يجب إدخال رابط تسجيل الميتينج أولاً");
        return;
      }
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
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm flex-1">{task.title}</p>
                {isClosingOrMeeting && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    task.category === 'closing' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                  }`}>{task.category === 'closing' ? 'إغلاق بيع' : 'ميتينج'}</span>
                )}
              </div>
            </div>

            {/* Recording Link Section */}
            {isClosingOrMeeting && (
              <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-medium text-indigo-300">رابط تسجيل الميتينج</span>
                  {task.meetingRecordingLink && (
                    <span className="text-xs text-emerald-400 mr-auto">✓ تم الرفع</span>
                  )}
                </div>
                {task.meetingRecordingLink ? (
                  <a href={task.meetingRecordingLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-400 underline truncate block">{task.meetingRecordingLink}</a>
                ) : (
                  <>
                    <Input value={recordingLink} onChange={e => setRecordingLink(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-sm" placeholder="https://..."
                      onKeyDown={e => e.key === 'Enter' && recordingLink && submitLinkMut.mutate({ taskId: task.id, link: recordingLink })} />
                    <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs"
                      disabled={!recordingLink || submitLinkMut.isPending}
                      onClick={() => submitLinkMut.mutate({ taskId: task.id, link: recordingLink })}>
                      {submitLinkMut.isPending ? "جاري الحفظ..." : "حفظ رابط التسجيل"}
                    </Button>
                    <p className="text-xs text-amber-400/80">يجب رفع الرابط قبل إغلاق المهمة</p>
                  </>
                )}
              </div>
            )}

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
              {status === 'completed' && needsRecording && (
                <p className="text-xs text-red-400">⚠ يجب رفع رابط التسجيل أولاً</p>
              )}
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
                  {delayDays > 2 && <span className="text-red-400 mr-2"> ⚠ ستُصنّف كمهمة حرجة</span>}
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
  const EMPTY_FORM = { engineerId: "", title: "", description: "", priority: "medium", plannedHours: "1", category: "general", meetingRecordingLink: "" };
  const [form, setForm] = useState(EMPTY_FORM);
  const utils = trpc.useUtils();
  const needsRecording = form.category === 'closing' || form.category === 'meeting';
  const createMut = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.stats.invalidate(); utils.tasks.list.invalidate();
      toast.success("تمت إضافة المهمة"); setOpen(false);
      setForm(EMPTY_FORM); onDone();
    },
    onError: () => toast.error("حدث خطأ أثناء الإضافة"),
  });
  const isDisabled = createMut.isPending || !form.engineerId || !form.title
    || (needsRecording && !form.meetingRecordingLink);

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
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-white/70">نوع المهمة</Label>
              <div className="grid grid-cols-3 gap-2">
                {[{v:'general',l:'عامة'},{v:'meeting',l:'ميتينج'},{v:'closing',l:'إغلاق بيع'}].map(({v,l}) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, category: v }))}
                    className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.category === v
                        ? v === 'closing' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : v === 'meeting' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-white/15 border-white/30 text-white'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
            {/* Recording Link - إجباري للـ Closing/Meeting */}
            {needsRecording && (
              <div className="space-y-2">
                <Label className="text-white/70 flex items-center gap-1">
                  <Video className="h-3.5 w-3.5 text-indigo-400" />
                  رابط تسجيل الميتينج <span className="text-red-400">*</span>
                </Label>
                <Input value={form.meetingRecordingLink}
                  onChange={e => setForm(f => ({ ...f, meetingRecordingLink: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white" placeholder="https://..." />
                <p className="text-xs text-amber-400/80">هذا الحقل إجباري لمهام الإغلاق والميتينج</p>
              </div>
            )}
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
              disabled={isDisabled}
              onClick={() => createMut.mutate({
                engineerId: Number(form.engineerId), taskDate: dateStr, title: form.title,
                description: form.description || undefined, priority: form.priority as any,
                plannedHours: Number(form.plannedHours),
                category: form.category,
                meetingRecordingLink: form.meetingRecordingLink || undefined,
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
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const createMut = trpc.tasks.createEngineer.useMutation({
    onSuccess: () => {
      utils.tasks.engineers.invalidate(); toast.success("تمت إضافة المهندس");
      setForm({ name: "", phone: "", department: "", role: "engineer" }); onDone();
    },
    onError: () => toast.error("حدث خطأ"),
  });
  const softDeleteMut = trpc.softDelete.engineer.useMutation({
    onSuccess: () => { utils.tasks.engineers.invalidate(); toast.success("تم حذف المهندس"); setDeleteTarget(null); onDone(); },
    onError: () => toast.error("حدث خطأ في الحذف"),
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
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm col-span-2"><SelectValue placeholder="اختر القسم *" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="sales_engineer" className="text-white hover:bg-white/10">مهندس مبيعات (Sales Engineer)</SelectItem>
                    <SelectItem value="sales_specialist" className="text-white hover:bg-white/10">أخصائي مبيعات (Sales Specialist)</SelectItem>
                    <SelectItem value="interior_designer" className="text-white hover:bg-white/10">مصمم داخلي (Interior Designer)</SelectItem>
                    <SelectItem value="tele_sales" className="text-white hover:bg-white/10">تيلي سيلز (Tele Sales)</SelectItem>
                    <SelectItem value="site_engineer" className="text-white hover:bg-white/10">مهندس معاينات (Site Engineer)</SelectItem>
                    <SelectItem value="admin_sales" className="text-white hover:bg-white/10">إداري مبيعات (Admin Sales)</SelectItem>
                    <SelectItem value="manager" className="text-white hover:bg-white/10">مدير (Manager)</SelectItem>
                  </SelectContent>
                </Select>
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
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {eng.department && (
                        <Badge className={`text-xs ${
                          ['sales_engineer','sales_specialist'].includes(eng.department) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          eng.department === 'tele_sales' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          eng.department === 'site_engineer' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          eng.department === 'admin_sales' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                          eng.department === 'manager' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>{
                          eng.department === 'sales_engineer' ? 'مهندس مبيعات' :
                          eng.department === 'sales_specialist' ? 'أخصائي مبيعات' :
                          eng.department === 'interior_designer' ? 'مصمم داخلي' :
                          eng.department === 'tele_sales' ? 'تيلي سيلز' :
                          eng.department === 'site_engineer' ? 'مهندس معاينات' :
                          eng.department === 'admin_sales' ? 'إداري مبيعات' :
                          eng.department === 'manager' ? 'مدير' : eng.department
                        }</Badge>
                      )}
                      <Badge className={`text-xs ${eng.role === "admin" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>
                        {eng.role === "admin" ? "مدير" : "مهندس"}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                    onClick={() => setDeleteTarget(eng.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason: DeleteReason, reasonCustom?: string) => {
          if (deleteTarget !== null) softDeleteMut.mutate({ id: deleteTarget, reason, reasonCustom });
        }}
        title="حذف المهندس"
        description="هل أنت متأكد من حذف هذا المهندس؟ سيتم إخفاؤه من القوائم مع الاحتفاظ ببياناته."
        isLoading={softDeleteMut.isPending}
      />
    </>
  );
}

// ─── Meeting Review Panel ────────────────────────────────────────────────────
function MeetingReviewPanel({ taskId, engineerId, reviewedBy, recordingLink }: {
  taskId: number; engineerId: number; reviewedBy?: number; recordingLink?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState({ opening: 0, understanding: 0, presentation: 0, objection: 0, closing: 0 });
  const [comments, setComments] = useState("");
  const utils = trpc.useUtils();
  const reviewQ = trpc.meetingReview.getReview.useQuery({ taskId }, { enabled: open });
  const upsertMut = trpc.meetingReview.upsertReview.useMutation({
    onSuccess: () => {
      utils.meetingReview.getReview.invalidate({ taskId });
      toast.success("تم حفظ التقييم بنجاح");
    },
    onError: () => toast.error("حدث خطأ"),
  });

  // ملء النموذج بالبيانات الموجودة
  const review = reviewQ.data;
  const existingTotal = review?.totalScore ?? 0;
  const currentTotal = scores.opening + scores.understanding + scores.presentation + scores.objection + scores.closing;

  const DIMENSIONS = [
    { key: 'opening',       label: 'الافتتاح (Opening)',           max: 10,  color: 'bg-blue-500' },
    { key: 'understanding', label: 'فهم العميل (Understanding)',    max: 20,  color: 'bg-purple-500' },
    { key: 'presentation',  label: 'العرض (Presentation)',             max: 20,  color: 'bg-indigo-500' },
    { key: 'objection',     label: 'الاعتراضات (Objection Handling)', max: 25,  color: 'bg-amber-500' },
    { key: 'closing',       label: 'الإغلاق (Closing)',               max: 25,  color: 'bg-emerald-500' },
  ] as const;

  return (
    <>
      <Button size="sm" variant="outline"
        className="text-xs h-7 border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 gap-1"
        onClick={() => setOpen(true)}>
        <Star className="h-3 w-3" />
        {review || existingTotal > 0 ? `تقييم: ${existingTotal}/100` : 'تقييم الميتينج'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              تقييم جودة الميتينج
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Recording Link */}
            {recordingLink && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                <Video className="h-4 w-4 text-indigo-400 shrink-0" />
                <a href={recordingLink} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-400 underline truncate">{recordingLink}</a>
              </div>
            )}

            {/* عرض التقييم الحالي إن وجد */}
            {review && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-emerald-300">التقييم الحالي</span>
                  <span className={`text-lg font-bold ${
                    review.totalScore >= 90 ? 'text-emerald-400' : review.totalScore >= 70 ? 'text-blue-400'
                    : review.totalScore >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>{review.totalScore}/100</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-xs text-white/50">
                  <span>افتتاح: {review.openingScore}/10</span>
                  <span>فهم: {review.understandingScore}/20</span>
                  <span>عرض: {review.presentationScore}/20</span>
                  <span>اعتراض: {review.objectionScore}/25</span>
                  <span>إغلاق: {review.closingScore}/25</span>
                </div>
                {review.comments && <p className="text-xs text-white/40 mt-2">{review.comments}</p>}
              </div>
            )}

            {/* نموذج التقييم */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/70">تقييم جديد / تحديث</p>
              {DIMENSIONS.map(dim => (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/70 text-xs">{dim.label}</Label>
                    <span className="text-xs font-bold text-white">{scores[dim.key]}/{dim.max}</span>
                  </div>
                  <input type="range" min={0} max={dim.max} step={1}
                    value={scores[dim.key]}
                    onChange={e => setScores(s => ({ ...s, [dim.key]: Number(e.target.value) }))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${dim.color}`}
                      style={{ width: `${(scores[dim.key] / dim.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* مجموع */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="text-white/70 text-sm">المجموع</span>
              <span className={`text-2xl font-bold ${
                currentTotal >= 90 ? 'text-emerald-400' : currentTotal >= 70 ? 'text-blue-400'
                : currentTotal >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>{currentTotal}/100</span>
            </div>

            {/* تعليق */}
            <div className="space-y-2">
              <Label className="text-white/70">تعليق (اختياري)</Label>
              <Textarea value={comments} onChange={e => setComments(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm resize-none h-16"
                placeholder="ملاحظات على الميتينج..." />
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              سيتم إضافة هذا التقييم تلقائياً إلى KPI المهندس تحت بند Closing Quality
            </div>

            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={upsertMut.isPending}
              onClick={() => upsertMut.mutate({
                taskId, engineerId, reviewedBy,
                openingScore: scores.opening,
                understandingScore: scores.understanding,
                presentationScore: scores.presentation,
                objectionScore: scores.objection,
                closingScore: scores.closing,
                comments: comments || undefined,
              })}>
              {upsertMut.isPending ? 'جاري الحفظ...' : 'حفظ التقييم'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Admin Sales Task Card ────────────────────────────────────────────────────
function AdminSalesTaskCard({ task, onUpdated }: { task: any; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(task.status);
  const [notes, setNotes] = useState(task.notes ?? "");
  const utils = trpc.useUtils();
  const updateMut = trpc.adminSalesTasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.adminSalesTasks.getByDate.invalidate();
      utils.adminSalesTasks.getStats.invalidate();
      toast.success("تم تحديث الحالة"); setOpen(false); onUpdated();
    },
    onError: () => toast.error("حدث خطأ"),
  });
  const cfg = ADMIN_TASK_STATUS[task.status] ?? ADMIN_TASK_STATUS.pending;
  return (
    <div className={`p-4 rounded-xl border transition-all ${task.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/5' : task.status === 'not_done' ? 'border-red-500/30 bg-red-500/5' : task.status === 'delayed' ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-white/3'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-white">{task.taskTitle}</p>
          {task.notes && <p className="text-xs text-white/40 mt-1">{task.notes}</p>}
          {task.completedAt && (
            <p className="text-xs text-emerald-400/70 mt-1">
              تم في: {new Date(task.completedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-xs border ${cfg.color}`}>{cfg.icon}<span className="mr-1">{cfg.label}</span></Badge>
          <Button size="sm" variant="outline" className="text-xs h-7 border-white/20 bg-white/5 hover:bg-white/10"
            onClick={() => setOpen(true)}>تحديث</Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>تحديث حالة المهمة</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="font-medium text-sm">{task.taskTitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["done", "pending", "delayed", "not_done"] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${status === s ? ADMIN_TASK_STATUS[s].color + " border-current" : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"}`}>
                  {ADMIN_TASK_STATUS[s].icon} {ADMIN_TASK_STATUS[s].label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">ملاحظات (اختياري)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm resize-none h-20" placeholder="أضف ملاحظة..." />
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={updateMut.isPending}
              onClick={() => updateMut.mutate({ taskId: task.id, status: status as any, notes: notes || undefined })}>
              {updateMut.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ─── Work Distribution Tab (Actual vs Target) ─────────────────────────────────
function WorkDistributionTab({ engineers, currentDate }: { engineers: any[]; currentDate: Date }) {
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  const { data: opData, isLoading } = trpc.kpi.operationalPerformance.useQuery({ year, month });

  // Mapping from old schema values to new 7 types
  const TASK_TYPE_DISPLAY = [
    { key: '2d_design',            label: '2D Design',             color: '#06b6d4', target: 10 },
    { key: '3d_modeling',          label: '3D Modeling',           color: '#8b5cf6', target: 15 },
    { key: 'render',               label: 'Render',                color: '#a78bfa', target: 15 },
    { key: 'quotation',            label: 'Quotation',             color: '#f59e0b', target: 10 },
    { key: 'meeting_modeling',     label: 'Meeting Modeling',      color: '#6366f1', target: 17 },
    { key: 'meeting_presentation', label: 'Meeting Presentation',  color: '#3b82f6', target: 17 },
    { key: 'meeting_closing',      label: 'Meeting Closing',       color: '#10b981', target: 16 },
  ];

  return (
    <div className="space-y-4">
      {/* Header + Month Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            توزيع العمل الفعلي مقابل الهدف
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            الهدف: 50% اجتماعات • 30% 3D+Render • 10% 2D • 10% عروض سعر
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1} className="bg-slate-900">{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5">
            {[2024,2025,2026].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-white/40">جاري التحميل...</div>
      )}

      {!isLoading && opData && opData.length === 0 && (
        <div className="text-center py-12 text-white/40">لا توجد بيانات لهذا الشهر</div>
      )}

      {opData && opData.map((eng: any) => (
        <div key={eng.engineerId} className="bg-white/5 border border-white/10 rounded-xl p-4">
          {/* Engineer header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                {eng.engineerName.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-white">{eng.engineerName}</div>
                <div className="text-xs text-white/40">إجمالي المهام: {eng.totalTasks}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="text-center">
                <div className="font-bold text-lg" style={{ color: eng.taskEfficiency >= 80 ? '#10b981' : eng.taskEfficiency >= 60 ? '#f59e0b' : '#ef4444' }}>
                  {eng.taskEfficiency}%
                </div>
                <div className="text-white/40">كفاءة الإتمام</div>
              </div>
            </div>
          </div>

          {/* Distribution: 4 main groups */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'اجتماعات', actual: eng.meetingsPct, target: 50, color: '#6366f1',
                counts: eng.countMeetingModeling + eng.countMeetingPresentation + eng.countMeetingClosing },
              { label: '3D + Render', actual: eng.threeDRenderPct, target: 30, color: '#8b5cf6',
                counts: eng.count3D + eng.countRender },
              { label: '2D تصميم', actual: eng.twoDPct, target: 10, color: '#06b6d4',
                counts: eng.count2D },
              { label: 'عروض سعر', actual: eng.quotationsPct, target: 10, color: '#f59e0b',
                counts: eng.countQuotation },
            ].map((item, i) => {
              const ratio = item.target > 0 ? Math.min(100, (item.actual / item.target) * 100) : 0;
              const diff = item.actual - item.target;
              const isGood = Math.abs(diff) <= 5;
              return (
                <div key={i} className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/60 mb-1">{item.label}</div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-xl font-bold" style={{ color: item.color }}>{item.actual.toFixed(1)}%</span>
                    <span className="text-[10px] text-white/40 mb-0.5">هدف: {item.target}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all" style={{ width: `${ratio}%`, backgroundColor: item.color }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: isGood ? '#10b981' : diff > 0 ? '#f59e0b' : '#ef4444' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}% {isGood ? '✓' : diff > 0 ? '↑' : '↓'}
                    </span>
                    <span className="text-white/40">{item.counts} مهمة</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7 Task Types breakdown */}
          <div className="space-y-2">
            <div className="text-xs text-white/40 font-medium mb-2">تفصيل 7 أنواع المهام</div>
            {[
              { label: '2D Design',            count: eng.count2D,                   color: '#06b6d4', pct: eng.twoDPct },
              { label: '3D Modeling',           count: eng.count3D,                   color: '#8b5cf6', pct: eng.totalTasks > 0 ? (eng.count3D / eng.totalTasks * 100) : 0 },
              { label: 'Render',                count: eng.countRender,               color: '#a78bfa', pct: eng.totalTasks > 0 ? (eng.countRender / eng.totalTasks * 100) : 0 },
              { label: 'Quotation',             count: eng.countQuotation,            color: '#f59e0b', pct: eng.quotationsPct },
              { label: 'Meeting Modeling',      count: eng.countMeetingModeling,      color: '#6366f1', pct: eng.totalTasks > 0 ? (eng.countMeetingModeling / eng.totalTasks * 100) : 0 },
              { label: 'Meeting Presentation',  count: eng.countMeetingPresentation,  color: '#3b82f6', pct: eng.totalTasks > 0 ? (eng.countMeetingPresentation / eng.totalTasks * 100) : 0 },
              { label: 'Meeting Closing',       count: eng.countMeetingClosing,       color: '#10b981', pct: eng.totalTasks > 0 ? (eng.countMeetingClosing / eng.totalTasks * 100) : 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 text-xs text-white/60 shrink-0">{item.label}</div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, item.pct)}%`, backgroundColor: item.color }} />
                </div>
                <div className="w-12 text-right text-xs font-bold" style={{ color: item.color }}>{item.pct.toFixed(1)}%</div>
                <div className="w-8 text-right text-xs text-white/40">{item.count}</div>
              </div>
            ))}
          </div>

          {/* Conversion rates + Alerts */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs">
            <span className="text-white/50">اجتماعات → صفقات: <strong className="text-indigo-400">{eng.meetingToClosingRate}%</strong></span>
            <span className="text-white/50">تصميم → مبيعات: <strong className="text-purple-400">{eng.designToSalesRate}%</strong></span>
          </div>
          {eng.alerts && eng.alerts.length > 0 && (
            <div className="mt-2 space-y-1">
              {eng.alerts.map((alert: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3" />{alert}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
// ─── Admin Sales Tab ──────────────────────────────────────────────────────────
function AdminSalesTab({ engineers, currentDate }: { engineers: any[]; currentDate: Date }) {
  const [selectedEngId, setSelectedEngId] = useState<string>("");
  const [subTab, setSubTab] = useState<"daily" | "weekly" | "monthly" | "meetings">("daily");
  const dateStr = toDateStr(currentDate);
  const weekStart = getWeekStart(currentDate);
  const monthStr = getMonthStr(currentDate);

  // اختيار أول مهندس إذا لم يُختر
  const engId = selectedEngId ? Number(selectedEngId) : (engineers[0]?.id ?? 0);

  const tasksQ = trpc.adminSalesTasks.getByDate.useQuery(
    { engineerId: engId, date: dateStr },
    { enabled: engId > 0 }
  );
  const meetingQ = trpc.adminSalesTasks.getWeekMeeting.useQuery(
    { engineerId: engId, weekStart },
    { enabled: engId > 0 }
  );
  const statsQ = trpc.adminSalesTasks.getStats.useQuery(
    { engineerId: engId, month: monthStr },
    { enabled: engId > 0 }
  );
  const utils = trpc.useUtils();

  const updateMeetingMut = trpc.adminSalesTasks.updateWeekMeeting.useMutation({
    onSuccess: () => { utils.adminSalesTasks.getWeekMeeting.invalidate(); toast.success("تم التحديث"); },
    onError: () => toast.error("حدث خطأ"),
  });

  const tasks = tasksQ.data ?? { daily: [], weekly: [], monthly: [] };
  const meeting = meetingQ.data;
  const stats = statsQ.data;

  const refetchAll = () => {
    tasksQ.refetch();
    statsQ.refetch();
  };

  const dayTasks = subTab === "daily" ? tasks.daily : subTab === "weekly" ? tasks.weekly : tasks.monthly;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-400" />
            مهام Admin Sales
          </h2>
          <p className="text-white/40 text-sm mt-0.5">متابعة المهام اليومية والأسبوعية والشهرية</p>
        </div>
        {engineers.length > 0 && (
          <Select value={selectedEngId || String(engineers[0]?.id ?? "")} onValueChange={setSelectedEngId}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white w-48">
              <SelectValue placeholder="اختر Admin Sales" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {engineers.map((e: any) => (
                <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10">{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "إجمالي المهام",    value: stats.total,          color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "تم تنفيذها",       value: stats.done,           color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "متأخرة",           value: stats.delayed,        color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "نسبة الإنجاز",     value: `${stats.completionRate}%`, color: stats.completionRate >= 80 ? "text-emerald-400" : stats.completionRate >= 60 ? "text-amber-400" : "text-red-400", bg: "bg-white/5 border-white/10" },
          ].map((kpi, i) => (
            <Card key={i} className={`border ${kpi.bg} bg-transparent`}>
              <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-white/50 text-xs">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit flex-wrap">
        {[
          { key: "daily",    label: "يومية",    icon: <Calendar className="h-3.5 w-3.5" />,    count: tasks.daily.length },
          { key: "weekly",   label: "أسبوعية",  icon: <CalendarDays className="h-3.5 w-3.5" />, count: tasks.weekly.length },
          { key: "monthly",  label: "شهرية",    icon: <BarChart2 className="h-3.5 w-3.5" />,   count: tasks.monthly.length },
          { key: "meetings", label: "الاجتماعات", icon: <Video className="h-3.5 w-3.5" />,     count: null },
        ].map(tab => (
          <button key={tab.key} onClick={() => setSubTab(tab.key as any)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${subTab === tab.key ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
            {tab.icon}
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${subTab === tab.key ? "bg-white/20" : "bg-white/10"}`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Daily / Weekly / Monthly Tasks */}
      {subTab !== "meetings" && (
        <div className="space-y-3">
          {tasksQ.isLoading ? (
            <div className="text-center py-10 text-white/30">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30 animate-spin" />
              <p>جاري التحميل...</p>
            </div>
          ) : dayTasks.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {subTab === "daily" ? "لا توجد مهام يومية لهذا اليوم" :
                 subTab === "weekly" ? "لا توجد مهام أسبوعية لهذا اليوم" :
                 "لا توجد مهام شهرية لهذا اليوم"}
              </p>
              {subTab === "weekly" && (
                <p className="text-xs mt-1 text-white/20">المهام الأسبوعية تظهر في أيام محددة (الاثنين، الأربعاء، الخميس، السبت، الثلاثاء)</p>
              )}
              {subTab === "monthly" && (
                <p className="text-xs mt-1 text-white/20">المهام الشهرية تظهر في أيام 15، 22، 28 من الشهر</p>
              )}
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
                <span className="text-white/50">الإجمالي: <span className="text-white font-semibold">{dayTasks.length}</span></span>
                <span className="text-emerald-400">✓ {dayTasks.filter((t: any) => t.status === 'done').length} تم</span>
                <span className="text-amber-400">⏰ {dayTasks.filter((t: any) => t.status === 'delayed').length} متأخر</span>
                <span className="text-red-400">✗ {dayTasks.filter((t: any) => t.status === 'not_done').length} لم يتم</span>
              </div>
              {dayTasks.map((task: any) => (
                <AdminSalesTaskCard key={task.id} task={task} onUpdated={refetchAll} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Meetings Tab */}
      {subTab === "meetings" && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm flex items-center gap-2">
            <Video className="h-4 w-4 shrink-0" />
            متابعة الاجتماعات الأسبوعية — أسبوع: {weekStart}
          </div>
          {meetingQ.isLoading ? (
            <div className="text-center py-10 text-white/30"><Clock className="h-8 w-8 mx-auto mb-2 opacity-30 animate-spin" /></div>
          ) : !meeting ? (
            <div className="text-center py-10 text-white/30">لا توجد بيانات</div>
          ) : (
            <div className="space-y-3">
              {/* Weekly Team Meeting */}
              <Card className="border-white/10 bg-white/3">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-white text-sm">الاجتماع الأسبوعي مع الفريق</p>
                      <p className="text-xs text-white/40 mt-0.5">Weekly Team Meeting</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs border ${MEETING_STATUS[meeting.weeklyTeamMeeting ?? 'pending'].color}`}>
                        {MEETING_STATUS[meeting.weeklyTeamMeeting ?? 'pending'].label}
                      </Badge>
                      <div className="flex gap-1">
                        {(["done", "not_done", "pending"] as const).map(s => (
                          <button key={s} onClick={() => updateMeetingMut.mutate({ id: meeting.id, weeklyTeamMeeting: s })}
                            className={`px-2 py-1 rounded text-xs border transition-all ${meeting.weeklyTeamMeeting === s ? MEETING_STATUS[s].color + " border-current" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"}`}>
                            {MEETING_STATUS[s].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Management Meeting */}
              <Card className="border-white/10 bg-white/3">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-white text-sm">الاجتماع مع الإدارة</p>
                      <p className="text-xs text-white/40 mt-0.5">Management Meeting</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs border ${MEETING_STATUS[meeting.managementMeeting ?? 'pending'].color}`}>
                        {MEETING_STATUS[meeting.managementMeeting ?? 'pending'].label}
                      </Badge>
                      <div className="flex gap-1">
                        {(["done", "not_done", "pending"] as const).map(s => (
                          <button key={s} onClick={() => updateMeetingMut.mutate({ id: meeting.id, managementMeeting: s })}
                            className={`px-2 py-1 rounded text-xs border transition-all ${meeting.managementMeeting === s ? MEETING_STATUS[s].color + " border-current" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"}`}>
                            {MEETING_STATUS[s].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Report Submitted */}
              <Card className="border-white/10 bg-white/3">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-white text-sm">رفع التقرير الأسبوعي</p>
                      <p className="text-xs text-white/40 mt-0.5">Weekly Report Submission</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs border ${meeting.reportSubmitted === 'yes' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : meeting.reportSubmitted === 'no' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                        {meeting.reportSubmitted === 'yes' ? 'تم الرفع' : meeting.reportSubmitted === 'no' ? 'لم يُرفع' : 'قيد الانتظار'}
                      </Badge>
                      <div className="flex gap-1">
                        {([["yes", "تم الرفع"], ["no", "لم يُرفع"], ["pending", "قيد الانتظار"]] as const).map(([s, label]) => (
                          <button key={s} onClick={() => updateMeetingMut.mutate({ id: meeting.id, reportSubmitted: s })}
                            className={`px-2 py-1 rounded text-xs border transition-all ${meeting.reportSubmitted === s ? (s === 'yes' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : s === 'no' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30') : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meeting Notes */}
              <Card className="border-white/10 bg-white/3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm">ملاحظات الاجتماعات</CardTitle>
                </CardHeader>
                <CardContent>
                  <MeetingNotesEditor meeting={meeting} onSave={(notes) => updateMeetingMut.mutate({ id: meeting.id, meetingNotes: notes })} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Meeting Notes Editor ─────────────────────────────────────────────────────
function MeetingNotesEditor({ meeting, onSave }: { meeting: any; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(meeting?.meetingNotes ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-2">
      <Textarea value={notes} onChange={e => { setNotes(e.target.value); setSaved(false); }}
        className="bg-white/5 border-white/10 text-white text-sm resize-none h-24" placeholder="أضف ملاحظات الاجتماعات..." />
      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"
        onClick={() => { onSave(notes); setSaved(true); }}>
        {saved ? "✓ تم الحفظ" : "حفظ الملاحظات"}
      </Button>
    </div>
  );
}

// ─── Lead Followup Tab ────────────────────────────────────────────────────────────────────────────────
const FOLLOWUP_STATUS_CONFIG = {
  followed_up: { label: "تم المتابعة", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  delayed:     { label: "تأخير في الرد",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30" },
  no_response: { label: "لم يتم الرد",  color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30" },
};
const QUALITY_CONFIG = {
  excellent: { label: "ممتاز", color: "text-emerald-400" },
  good:      { label: "جيد",    color: "text-blue-400" },
  poor:      { label: "ضعيف",   color: "text-red-400" },
};

function LeadFollowupTab({ engineers }: { engineers: any[] }) {
  const today = toDateStr(new Date());
  const [logDate, setLogDate] = useState(today);
  const [adminSalesId, setAdminSalesId] = useState<string>("");
  const [telesalesId, setTelesalesId] = useState<string>("");
  const [followupStatus, setFollowupStatus] = useState<"followed_up" | "delayed" | "no_response">("followed_up");
  const [responseDelayHours, setResponseDelayHours] = useState<string>("");
  const [followupQuality, setFollowupQuality] = useState<"excellent" | "good" | "poor">("good");
  const [notes, setNotes] = useState("");
  const [viewPeriod, setViewPeriod] = useState<"today" | "week" | "month">("week");

  // حساب فترة العرض
  const periodDates = (() => {
    const now = new Date();
    if (viewPeriod === "today") return { start: today, end: today };
    if (viewPeriod === "week") {
      const start = new Date(now); start.setDate(now.getDate() - 6);
      return { start: toDateStr(start), end: today };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toDateStr(start), end: today };
  })();

  const logMut = trpc.leadFollowup.log.useMutation({
    onSuccess: () => { toast.success("تم تسجيل المتابعة بنجاح"); logsQ.refetch(); statsQ.refetch(); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const logsQ = trpc.leadFollowup.getLogs.useQuery({ startDate: periodDates.start, endDate: periodDates.end });
  const statsQ = trpc.leadFollowup.allTelesalesStats.useQuery({ startDate: periodDates.start, endDate: periodDates.end });
  // Admin Sales KPI - يتم جلب KPI للمراجع المختار فقط
  const adminSalesKPIQ = trpc.leadFollowup.adminSalesKPI.useQuery(
    { adminSalesId: Number(adminSalesId), startDate: periodDates.start, endDate: periodDates.end },
    { enabled: !!adminSalesId }
  );

  const logs = logsQ.data ?? [];
  const telesalesStats = statsQ.data ?? [];
  const adminSalesKPI = adminSalesKPIQ.data;

  const handleSubmit = () => {
    if (!adminSalesId || !telesalesId) { toast.error("يرجى اختيار Admin Sales و Tele-sales"); return; }
    logMut.mutate({
      logDate,
      adminSalesId: Number(adminSalesId),
      telesalesId: Number(telesalesId),
      followupStatus,
      responseDelayHours: responseDelayHours ? Number(responseDelayHours) : undefined,
      followupQuality,
      notes: notes || undefined,
    });
    setNotes(""); setResponseDelayHours("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
        <h3 className="text-white font-semibold text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-400" />
          نظام متابعة Leads — Admin Sales و Tele-sales
        </h3>
        <p className="text-white/50 text-xs mt-1">يسجّل Admin Sales نتيجة مراجعة WhatsApp يومياً — بدون تكرار CRM</p>
      </div>

      {/* Log Form */}
      <Card className="border-white/10 bg-white/3">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-400" /> تسجيل نتيجة متابعة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">تاريخ المتابعة</Label>
              <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm" />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">Admin Sales (المراجع)</Label>
              <Select value={adminSalesId} onValueChange={setAdminSalesId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                  <SelectValue placeholder="اختر Admin Sales" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {engineers.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-white">{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">Tele-sales (المتابع)</Label>
              <Select value={telesalesId} onValueChange={setTelesalesId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                  <SelectValue placeholder="اختر Tele-sales" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {engineers.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-white">{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">حالة المتابعة</Label>
              <Select value={followupStatus} onValueChange={v => setFollowupStatus(v as any)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  <SelectItem value="followed_up" className="text-emerald-400">✅ تم المتابعة</SelectItem>
                  <SelectItem value="delayed" className="text-amber-400">⚠️ تأخير في الرد</SelectItem>
                  <SelectItem value="no_response" className="text-red-400">❌ لم يتم الرد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">جودة المتابعة</Label>
              <Select value={followupQuality} onValueChange={v => setFollowupQuality(v as any)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  <SelectItem value="excellent" className="text-emerald-400">★ ممتاز</SelectItem>
                  <SelectItem value="good" className="text-blue-400">● جيد</SelectItem>
                  <SelectItem value="poor" className="text-red-400">○ ضعيف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {followupStatus !== "followed_up" && (
              <div>
                <Label className="text-white/70 text-xs mb-1.5 block">ساعات التأخير</Label>
                <Input type="number" value={responseDelayHours} onChange={e => setResponseDelayHours(e.target.value)}
                  placeholder="عدد الساعات" min="1"
                  className="bg-white/5 border-white/10 text-white text-sm" />
              </div>
            )}
          </div>

          <div>
            <Label className="text-white/70 text-xs mb-1.5 block">ملاحظات (اختياري)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية..."
              className="bg-white/5 border-white/10 text-white text-sm resize-none h-16" />
          </div>

          <Button onClick={handleSubmit} disabled={logMut.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {logMut.isPending ? "جاري الحفظ..." : "تسجيل المتابعة"}
          </Button>
        </CardContent>
      </Card>

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-white/50 text-sm">عرض:</span>
        {(["today", "week", "month"] as const).map(p => (
          <button key={p} onClick={() => setViewPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewPeriod === p ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white bg-white/5"
            }`}>
            {p === "today" ? "اليوم" : p === "week" ? "آخر 7 أيام" : "هذا الشهر"}
          </button>
        ))}
      </div>

      {/* Admin Sales KPI Card */}
      {adminSalesId && adminSalesKPI && (
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-400" />
              KPI Admin Sales — {engineers.find(e => e.id === Number(adminSalesId))?.name ?? 'Admin Sales'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className={`text-2xl font-bold ${adminSalesKPI.accuracyScore >= 80 ? 'text-emerald-400' : adminSalesKPI.accuracyScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {adminSalesKPI.accuracyScore}%
              </p>
              <p className="text-white/50 text-xs mt-1">دقة المتابعة</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className={`text-2xl font-bold ${adminSalesKPI.detectionScore >= 80 ? 'text-emerald-400' : adminSalesKPI.detectionScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {adminSalesKPI.detectionScore}%
              </p>
              <p className="text-white/50 text-xs mt-1">اكتشاف تأخيرات</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/10">
              <p className="text-emerald-400 text-2xl font-bold">{adminSalesKPI.followedUp}</p>
              <p className="text-white/50 text-xs mt-1">تم المتابعة</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-500/10">
              <p className="text-red-400 text-2xl font-bold">{adminSalesKPI.noResponse}</p>
              <p className="text-white/50 text-xs mt-1">لم يتم الرد</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tele-sales KPI Cards */}
      {telesalesStats.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-white/70 text-sm font-medium">KPI التفصيلي لـ Tele-sales</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {telesalesStats.map((eng: any) => (
              <Card key={eng.engineerId} className="border-white/10 bg-white/3">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold text-sm">{eng.engineerName}</p>
                      <p className="text-white/40 text-xs">{eng.totalLogs} سجل متابعة</p>
                    </div>
                    <ScoreBadge score={eng.overallScore} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-emerald-400 font-bold text-lg">{eng.followedUp}</p>
                      <p className="text-white/40 text-[10px]">تم المتابعة</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-400 font-bold text-lg">{eng.delayed}</p>
                      <p className="text-white/40 text-[10px]">تأخير</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-red-400 font-bold text-lg">{eng.noResponse}</p>
                      <p className="text-white/40 text-[10px]">لا رد</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">سرعة الرد</span>
                      <span className={eng.responseScore >= 80 ? "text-emerald-400" : eng.responseScore >= 60 ? "text-amber-400" : "text-red-400"}>{eng.responseScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${
                        eng.responseScore >= 80 ? "bg-emerald-500" : eng.responseScore >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`} style={{ width: `${eng.responseScore}%` }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">جودة المتابعة</span>
                      <span className={eng.qualityScore >= 80 ? "text-emerald-400" : eng.qualityScore >= 60 ? "text-amber-400" : "text-red-400"}>{eng.qualityScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${
                        eng.qualityScore >= 80 ? "bg-emerald-500" : eng.qualityScore >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`} style={{ width: `${eng.qualityScore}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="space-y-3">
        <h4 className="text-white/70 text-sm font-medium">سجل المتابعة ({logs.length})</h4>
        {logsQ.isLoading ? (
          <div className="text-center py-8 text-white/30 text-sm">جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>لا توجد سجلات متابعة في هذه الفترة</p>
            <p className="text-xs mt-1">استخدم النموذج أعلاه لتسجيل أول متابعة</p>
          </div>
        ) : logs.map((log: any) => {
          const adminEng = engineers.find(e => e.id === log.adminSalesId);
          const telesalesEng = engineers.find(e => e.id === log.telesalesId);
          const statusCfg = FOLLOWUP_STATUS_CONFIG[log.followupStatus as keyof typeof FOLLOWUP_STATUS_CONFIG];
          const qualityCfg = log.followupQuality ? QUALITY_CONFIG[log.followupQuality as keyof typeof QUALITY_CONFIG] : null;
          return (
            <div key={log.id} className={`p-4 rounded-xl border ${statusCfg.bg}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-sm font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                    {qualityCfg && <span className={`text-xs ${qualityCfg.color}`}>{qualityCfg.label}</span>}
                    {log.responseDelayHours && <span className="text-xs text-amber-400">{log.responseDelayHours} ساعة تأخير</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
                    <span>المراجع: {adminEng?.name ?? log.adminSalesId}</span>
                    <span>•</span>
                    <span>Tele-sales: {telesalesEng?.name ?? log.telesalesId}</span>
                    <span>•</span>
                    <span>{new Date(log.logDate).toLocaleDateString("ar-EG")}</span>
                  </div>
                  {log.notes && <p className="text-xs text-white/30 mt-1">{log.notes}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────────────────────────
export default function TasksModule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"admin" | "engineer">("admin");
  const [selectedEngineer, setSelectedEngineer] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"tasks" | "ranking" | "critical" | "admin_sales" | "calendar" | "distribution">("tasks");
  // ── New: list vs timeline toggle
  const [listViewMode, setListViewMode] = useState<"list" | "timeline">("list");
  // ── New: Time Filter
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({ dateRange: "today" });
  // ── New: Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterEngineer, setFilterEngineer] = useState<string>("");
  const [filterTaskType, setFilterTaskType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const dateStr = toDateStr(currentDate);
  const isToday = toDateStr(new Date()) === dateStr;
  const utils = trpc.useUtils();
  const statsQ = trpc.tasks.stats.useQuery({ date: dateStr });
  // ── Use filtered query when time filter or advanced filters are active
  const useFilteredQuery = timeFilter.dateRange !== "today" || !!filterEngineer || !!filterTaskType || !!filterStatus;
  const filteredQ = trpc.tasks.filtered.useQuery({
    dateRange: timeFilter.dateRange,
    dateFrom: timeFilter.dateFrom,
    dateTo: timeFilter.dateTo,
    engineerId: filterEngineer ? Number(filterEngineer) : undefined,
    taskType: filterTaskType || undefined,
    status: filterStatus || undefined,
  }, { enabled: useFilteredQuery });
  const listQ = trpc.tasks.list.useQuery({
    date: dateStr,
    engineerId: viewMode === "engineer" && selectedEngineer ? Number(selectedEngineer) : undefined
  }, { enabled: !useFilteredQuery });
  const criticalQ = trpc.tasks.criticalEnhanced.useQuery();
  const engineersQ = trpc.tasks.engineers.useQuery();
  const stats = statsQ.data;
  const rawTasks = useFilteredQuery ? (filteredQ.data ?? []) : (listQ.data ?? []);
  const engineers = engineersQ.data ?? [];
  const criticalTasks = criticalQ.data ?? [];
  const deleteMut = trpc.softDelete.task.useMutation({
    onSuccess: () => { utils.tasks.stats.invalidate(); utils.tasks.list.invalidate(); filteredQ.refetch(); toast.success("تم حذف المهمة"); setDeleteTaskTarget(null); },
    onError: () => toast.error("حدث خطأ"),
  });
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<number | null>(null);
  const filteredTasks = useMemo(() => {
    let t = rawTasks;
    if (!useFilteredQuery && viewMode === "engineer" && selectedEngineer)
      t = t.filter((task: any) => task.engineerId === Number(selectedEngineer));
    return t;
  }, [rawTasks, viewMode, selectedEngineer, useFilteredQuery]);
  const hasActiveFilters = filterEngineer || filterTaskType || filterStatus || timeFilter.dateRange !== "today";
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
      {/* ── Time Filter Bar (only in tasks tab) ── */}
      {activeTab === "tasks" && (
        <div className="space-y-3">
          <TimeFilterBar value={timeFilter} onChange={(v) => { setTimeFilter(v); if (v.dateRange === "today") { setCurrentDate(new Date()); } }} />
          {/* Advanced Filters Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                showFilters || hasActiveFilters
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              <Filter className="h-3 w-3" />
              فلترة متقدمة
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
            </button>
            {/* List / Timeline Toggle */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                onClick={() => setListViewMode("list")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  listViewMode === "list" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" /> قائمة
              </button>
              <button
                onClick={() => setListViewMode("timeline")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  listViewMode === "timeline" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> تقويم زمني
              </button>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => { setFilterEngineer(""); setFilterTaskType(""); setFilterStatus(""); setTimeFilter({ dateRange: "today" }); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20"
              >
                <X className="h-3 w-3" /> مسح الفلاتر
              </button>
            )}
          </div>
          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">المهندس</Label>
                <Select value={filterEngineer} onValueChange={setFilterEngineer}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="" className="text-white hover:bg-white/10 text-xs">الكل</SelectItem>
                    {engineers.map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10 text-xs">{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">نوع المهمة</Label>
                <Select value={filterTaskType} onValueChange={setFilterTaskType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="" className="text-white hover:bg-white/10 text-xs">الكل</SelectItem>
                    {[{v:'meeting_2d',l:'ميتينج 2D'},{v:'meeting_3d',l:'ميتينج 3D'},{v:'meeting_quotation',l:'ميتينج عرض سعر'},{v:'meeting_closing',l:'ميتينج إغلاق'},{v:'design_3d',l:'تصميم 3D'},{v:'design_2d',l:'تصميم 2D'},{v:'quotation',l:'عرض سعر'},{v:'negotiation',l:'تفاوض/إغلاق'},{v:'other',l:'أخرى'}].map(({v,l}) => (
                      <SelectItem key={v} value={v} className="text-white hover:bg-white/10 text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">الحالة</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="" className="text-white hover:bg-white/10 text-xs">الكل</SelectItem>
                    {[{v:'planned',l:'مخططة'},{v:'completed',l:'منجزة'},{v:'delayed',l:'متأخرة'},{v:'not_done',l:'لم تُنفذ'},{v:'client_delay',l:'تأخير العميل'}].map(({v,l}) => (
                      <SelectItem key={v} value={v} className="text-white hover:bg-white/10 text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit flex-wrap">
        {[
          { key: "tasks",       label: "قائمة المهام" },
          { key: "calendar",    label: "📅 التقويم الزمني" },
          { key: "distribution", label: "📊 توزيع العمل" },
          { key: "ranking",     label: "ترتيب المهندسين" },
          { key: "critical",    label: `المهام الحرجة${criticalTasks.length > 0 ? ` (${criticalTasks.length})` : ""}` },
          { key: "admin_sales", label: "مهام Admin Sales" },
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
          {/* Timeline View */}
          {listViewMode === "timeline" ? (
            <DailyTimeline
              dateStr={dateStr}
              engineerId={filterEngineer ? Number(filterEngineer) : (viewMode === "engineer" && selectedEngineer ? Number(selectedEngineer) : undefined)}
              engineers={engineers}
              viewMode={viewMode}
              onTaskAdded={() => { statsQ.refetch(); listQ.refetch(); filteredQ.refetch(); }}
            />
          ) : (
          // List View
          <>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد مهام في هذا النطاق</p>
              {viewMode === "admin" && <p className="text-xs mt-2">اضغط "إضافة مهمة" أو غيّر الفلاتر</p>}
            </div>
          ) : filteredTasks.map((task: any) => {
            const eng = engineers.find((e: any) => e.id === task.engineerId);
            const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.planned;
            const priorityCfg = PRIORITY_CONFIG[task.priority ?? "medium"];
            // Task type color
            const TASK_TYPE_COLORS: Record<string, string> = {
              meeting_2d: "bg-blue-500/20 border-blue-500/30 text-blue-300",
              meeting_3d: "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
              meeting_quotation: "bg-violet-500/20 border-violet-500/30 text-violet-300",
              meeting_closing: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
              design_3d: "bg-amber-500/20 border-amber-500/30 text-amber-300",
              design_2d: "bg-orange-500/20 border-orange-500/30 text-orange-300",
              quotation: "bg-pink-500/20 border-pink-500/30 text-pink-300",
              negotiation: "bg-rose-500/20 border-rose-500/30 text-rose-300",
              other: "bg-slate-500/20 border-slate-500/30 text-slate-300",
            };
            const TASK_TYPE_LABELS: Record<string, string> = {
              meeting_2d: "ميتينج 2D", meeting_3d: "ميتينج 3D",
              meeting_quotation: "ميتينج عرض سعر", meeting_closing: "ميتينج إغلاق",
              design_3d: "تصميم 3D", design_2d: "تصميم 2D",
              quotation: "عرض سعر", negotiation: "تفاوض/إغلاق", other: "أخرى",
            };
            // Critical alert styling
            const isCriticalAlert = task.status === "not_done" || task.status === "delayed" || task.isCritical;
            return (
              <div key={task.id} className={`p-4 rounded-xl border transition-all ${
                task.status === "not_done" ? "border-red-500/40 bg-red-500/8" :
                task.status === "completed" ? "border-emerald-500/30 bg-emerald-500/5" :
                task.status === "delayed" ? "border-amber-500/40 bg-amber-500/8" :
                "border-white/10 bg-white/3"
              }`}>
                {isCriticalAlert && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-red-400 font-medium">
                      {task.status === "not_done" ? "لم تُنفذ" : task.status === "delayed" ? "متأخرة" : "حرجة"}
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-white text-sm">{task.title}</p>
                      <Badge className={`text-xs border ${statusCfg.color}`}>
                        {statusCfg.icon}<span className="mr-1">{statusCfg.label}</span>
                      </Badge>
                      {priorityCfg && <span className={`text-xs font-medium ${priorityCfg.color}`}>{priorityCfg.label}</span>}
                      {task.taskType && task.taskType !== "other" && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${TASK_TYPE_COLORS[task.taskType] ?? TASK_TYPE_COLORS.other}`}>
                          {TASK_TYPE_LABELS[task.taskType] ?? task.taskType}
                        </span>
                      )}
                      {task.category === 'closing' && !task.taskType && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">إغلاق بيع</span>}
                      {task.category === 'meeting' && !task.taskType && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400">ميتينج</span>}
                    </div>
                    {task.description && <p className="text-xs text-white/40 mb-2">{task.description}</p>}
                    <div className="flex items-center gap-3 flex-wrap text-xs text-white/40">
                      {eng && <span>{(eng as any).name}</span>}
                      {/* Time info */}
                      {task.startTime && task.endTime && (
                        <span className="flex items-center gap-1 text-indigo-400">
                          <Clock className="h-3 w-3" />
                          {task.startTime} - {task.endTime}
                          {task.durationMinutes && <span className="text-white/30">({task.durationMinutes < 60 ? `${task.durationMinutes}د` : `${Math.round(task.durationMinutes/60*10)/10}س`})</span>}
                        </span>
                      )}
                      {task.plannedHours && !task.startTime && <span>{task.plannedHours} ساعة</span>}
                      {task.delayDays && task.delayDays > 0 && <span className="text-amber-400">{task.delayDays} {task.delayDays === 1 ? "يوم" : "أيام"} تأخير</span>}
                      {task.notes && <span className="text-white/30 truncate max-w-[200px]">{task.notes}</span>}
                      {(task.category === 'closing' || task.category === 'meeting') && (
                        task.meetingRecordingLink
                          ? <span className="text-emerald-400 flex items-center gap-1"><Video className="h-3 w-3" /> تسجيل مرفوع</span>
                          : <span className="text-amber-400 flex items-center gap-1"><Video className="h-3 w-3" /> بدون تسجيل</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Review Panel for Closing/Meeting tasks */}
                    {(task.category === 'closing' || task.category === 'meeting') && task.meetingRecordingLink && (
                      <MeetingReviewPanel
                        taskId={task.id}
                        engineerId={task.engineerId}
                        recordingLink={task.meetingRecordingLink}
                      />
                    )}
                    {viewMode === "admin" && (
                      <>
                        <UpdateStatusDialog task={task} onDone={() => { statsQ.refetch(); listQ.refetch(); criticalQ.refetch(); }} />
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                          onClick={() => setDeleteTaskTarget(task.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </>
          )}
        </div>
      )}

      {/* ── Tab: Ranking ── */}
      {activeTab === "ranking" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-white/10 bg-white/3">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" /> الأفضل أداءً
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
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: "critical",      label: "حرجة",               count: criticalTasks.filter((t: any) => t.alertType === "critical").length,      color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
              { type: "not_done",      label: "لم تُنفذ",            count: criticalTasks.filter((t: any) => t.alertType === "not_done").length,      color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
              { type: "stale_planned", label: "مخططة قديمة",        count: criticalTasks.filter((t: any) => t.alertType === "stale_planned").length, color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
            ].map(s => (
              <div key={s.type} className={`p-3 rounded-xl border ${s.bg} text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {criticalTasks.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد مهام تحتاج انتباهاً حالياً</p>
            </div>
          ) : criticalTasks.map((task: any) => {
            const alertStyles: Record<string, { border: string; bg: string; icon: React.ReactNode; label: string; color: string }> = {
              critical:      { border: "border-red-500/40",    bg: "bg-red-500/8",    icon: <Flame className="h-4 w-4 text-red-400" />,         label: "حرجة",         color: "text-red-400" },
              not_done:      { border: "border-orange-500/40", bg: "bg-orange-500/8", icon: <XCircle className="h-4 w-4 text-orange-400" />,    label: "لم تُنفذ",      color: "text-orange-400" },
              stale_planned: { border: "border-amber-500/40",  bg: "bg-amber-500/8",  icon: <Clock className="h-4 w-4 text-amber-400" />,       label: "مخططة قديمة",  color: "text-amber-400" },
            };
            const alertStyle = alertStyles[task.alertType ?? "critical"] ?? alertStyles.critical;
            const TASK_TYPE_LABELS: Record<string, string> = {
              meeting_2d: "ميتينج 2D", meeting_3d: "ميتينج 3D",
              meeting_quotation: "ميتينج عرض سعر", meeting_closing: "ميتينج إغلاق",
              design_3d: "تصميم 3D", design_2d: "تصميم 2D",
              quotation: "عرض سعر", negotiation: "تفاوض/إغلاق", other: "أخرى",
            };
            return (
              <div key={task.id} className={`p-4 rounded-xl border ${alertStyle.border} ${alertStyle.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      {alertStyle.icon}
                      <p className="font-semibold text-white text-sm">{task.title}</p>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/10 ${alertStyle.color}`}>{alertStyle.label}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                      <span className="text-white/50">{task.engineerName}</span>
                      {task.taskType && task.taskType !== "other" && (
                        <span className="text-white/40">{TASK_TYPE_LABELS[task.taskType] ?? task.taskType}</span>
                      )}
                      {task.startTime && task.endTime && (
                        <span className="text-indigo-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />{task.startTime} - {task.endTime}
                        </span>
                      )}
                      <span className={`${alertStyle.color} font-medium`}>
                        {task.ageHours < 24 ? `منذ ${task.ageHours} ساعة` : `منذ ${Math.floor(task.ageHours/24)} يوم`}
                      </span>
                      <span className="text-white/30">{new Date(task.taskDate).toLocaleDateString("ar-EG")}</span>
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

      {/* ── Tab: Calendar View ── */}
      {activeTab === "calendar" && (
        <TaskCalendarView
          viewMode={viewMode}
          engineers={engineers}
          currentEngineerIdForEngineerView={viewMode === "engineer" && selectedEngineer ? Number(selectedEngineer) : undefined}
        />
      )}

      {/* ── Tab: Work Distribution (Actual vs Target) ── */}
      {activeTab === "distribution" && (
        <WorkDistributionTab engineers={engineers} currentDate={currentDate} />
      )}
      {/* ── Tab: Admin Sales Tasks ── */}
      {activeTab === "admin_sales" && (
        <AdminSalesTab engineers={engineers} currentDate={currentDate} />
      )}

      {/* Delete Task Confirm */}
      <DeleteConfirmDialog
        open={deleteTaskTarget !== null}
        onClose={() => setDeleteTaskTarget(null)}
        onConfirm={(reason: DeleteReason, reasonCustom?: string) => {
          if (deleteTaskTarget !== null) deleteMut.mutate({ id: deleteTaskTarget, reason, reasonCustom });
        }}
        title="حذف المهمة"
        description="هل أنت متأكد من حذف هذه المهمة؟ سيتم إخفاؤها مع الاحتفاظ بالبيانات."
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
