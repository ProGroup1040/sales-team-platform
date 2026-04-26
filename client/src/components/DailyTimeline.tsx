import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Clock, Plus, AlertTriangle, CheckCircle2, XCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── Task Type Config ─────────────────────────────────────────────────────────
export const TASK_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  meeting_2d:        { label: "ميتينج 2D",       color: "text-blue-300",    bg: "bg-blue-500/20",    border: "border-blue-500/40",    dot: "bg-blue-400" },
  meeting_3d:        { label: "ميتينج 3D",        color: "text-cyan-300",    bg: "bg-cyan-500/20",    border: "border-cyan-500/40",    dot: "bg-cyan-400" },
  meeting_quotation: { label: "ميتينج عرض سعر",   color: "text-violet-300",  bg: "bg-violet-500/20",  border: "border-violet-500/40",  dot: "bg-violet-400" },
  meeting_closing:   { label: "ميتينج إغلاق",     color: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-500/40", dot: "bg-emerald-400" },
  design_3d:         { label: "تصميم 3D",          color: "text-amber-300",   bg: "bg-amber-500/20",   border: "border-amber-500/40",   dot: "bg-amber-400" },
  design_2d:         { label: "تصميم 2D",          color: "text-orange-300",  bg: "bg-orange-500/20",  border: "border-orange-500/40",  dot: "bg-orange-400" },
  quotation:         { label: "عرض سعر",           color: "text-pink-300",    bg: "bg-pink-500/20",    border: "border-pink-500/40",    dot: "bg-pink-400" },
  negotiation:       { label: "تفاوض/إغلاق",       color: "text-rose-300",    bg: "bg-rose-500/20",    border: "border-rose-500/40",    dot: "bg-rose-400" },
  other:             { label: "أخرى",              color: "text-slate-300",   bg: "bg-slate-500/20",   border: "border-slate-500/40",   dot: "bg-slate-400" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  planned:      { label: "مخططة",       icon: <Clock className="h-3 w-3" />,        color: "text-blue-400" },
  completed:    { label: "منجزة",        icon: <CheckCircle2 className="h-3 w-3" />, color: "text-emerald-400" },
  delayed:      { label: "متأخرة",       icon: <Clock className="h-3 w-3" />,        color: "text-amber-400" },
  not_done:     { label: "لم تُنفذ",     icon: <XCircle className="h-3 w-3" />,      color: "text-red-400" },
  client_delay: { label: "تأخير العميل", icon: <Users className="h-3 w-3" />,        color: "text-purple-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} دقيقة`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}س ${m}د` : `${h} ساعة`;
}

// ─── Add Task with Time Dialog ────────────────────────────────────────────────
interface AddTimeTaskDialogProps {
  engineers: any[];
  dateStr: string;
  onDone: () => void;
  prefillStart?: string;
}

function AddTimeTaskDialog({ engineers, dateStr, onDone, prefillStart }: AddTimeTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const EMPTY = {
    engineerId: "", title: "", description: "", priority: "medium",
    taskType: "other", startTime: prefillStart ?? "09:00", endTime: "10:00",
    category: "general", meetingRecordingLink: "",
  };
  const [form, setForm] = useState(EMPTY);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const durationMinutes = useMemo(() => {
    if (!form.startTime || !form.endTime) return 0;
    const diff = timeToMinutes(form.endTime) - timeToMinutes(form.startTime);
    return diff > 0 ? diff : 0;
  }, [form.startTime, form.endTime]);

  // Auto-set endTime when startTime changes (keep same duration)
  const handleStartChange = (v: string) => {
    const start = timeToMinutes(v);
    const end = start + durationMinutes || start + 60;
    setForm(f => ({ ...f, startTime: v, endTime: minutesToTime(Math.min(end, 23 * 60 + 59)) }));
    setOverlapError(null);
  };

  const createMut = trpc.tasks.createWithTime.useMutation({
    onSuccess: () => {
      utils.tasks.timeline.invalidate();
      utils.tasks.stats.invalidate();
      utils.tasks.list.invalidate();
      toast.success("تمت إضافة المهمة");
      setOpen(false); setForm(EMPTY); onDone();
    },
    onError: (err) => {
      if (err.message.includes("تداخل")) {
        setOverlapError(err.message);
      } else {
        toast.error("حدث خطأ أثناء الإضافة");
      }
    },
  });

  const isDisabled = createMut.isPending || !form.engineerId || !form.title || durationMinutes <= 0;

  return (
    <>
      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> إضافة مهمة
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-white">إضافة مهمة بوقت محدد</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Engineer */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">المهندس *</Label>
              <Select value={form.engineerId} onValueChange={v => setForm(f => ({ ...f, engineerId: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {engineers.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10">{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">عنوان المهمة *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="bg-white/5 border-white/10 text-white" placeholder="أدخل عنوان المهمة" />
            </div>
            {/* Task Type */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">نوع المهمة</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(TASK_TYPE_CONFIG).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setForm(f => ({ ...f, taskType: k }))}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all ${
                      form.taskType === k ? `${v.bg} ${v.border} ${v.color}` : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                    }`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${v.dot}`} />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">وقت البداية *</Label>
                <Input type="time" value={form.startTime} onChange={e => handleStartChange(e.target.value)}
                  className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">وقت النهاية *</Label>
                <Input type="time" value={form.endTime} onChange={e => { setForm(f => ({ ...f, endTime: e.target.value })); setOverlapError(null); }}
                  className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            {/* Duration display */}
            {durationMinutes > 0 && (
              <div className="text-xs text-indigo-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                المدة: {formatDuration(durationMinutes)}
              </div>
            )}
            {/* Overlap error */}
            {overlapError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {overlapError}
              </div>
            )}
            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">الأولوية</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {[{v:'low',l:'منخفضة'},{v:'medium',l:'متوسطة'},{v:'high',l:'عالية'},{v:'urgent',l:'عاجلة'}].map(({v,l}) => (
                    <SelectItem key={v} value={v} className="text-white hover:bg-white/10">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">الوصف (اختياري)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white resize-none h-16 text-sm" placeholder="تفاصيل..." />
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isDisabled}
              onClick={() => createMut.mutate({
                engineerId: Number(form.engineerId), taskDate: dateStr, title: form.title,
                description: form.description || undefined, priority: form.priority as any,
                plannedHours: durationMinutes / 60, category: form.category,
                startTime: form.startTime, endTime: form.endTime,
                taskType: form.taskType as any,
              })}>
              {createMut.isPending ? "جاري الإضافة..." : "إضافة المهمة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Timeline Task Block ──────────────────────────────────────────────────────
function TimelineBlock({ task, hourHeight, startHour }: { task: any; hourHeight: number; startHour: number }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!task.startTime || !task.endTime) return null;

  const startMin = timeToMinutes(task.startTime);
  const endMin   = timeToMinutes(task.endTime);
  const dayStart = startHour * 60;

  const top    = ((startMin - dayStart) / 60) * hourHeight;
  const height = Math.max(((endMin - startMin) / 60) * hourHeight, 24);

  const cfg = TASK_TYPE_CONFIG[task.taskType ?? "other"] ?? TASK_TYPE_CONFIG.other;
  const statusCfg = STATUS_CONFIG[task.status ?? "planned"] ?? STATUS_CONFIG.planned;

  return (
    <>
      <div
        className={`absolute left-1 right-1 rounded-lg border cursor-pointer transition-all hover:brightness-110 hover:z-10 overflow-hidden ${cfg.bg} ${cfg.border}`}
        style={{ top: `${top}px`, height: `${height}px` }}
        onClick={() => setShowDetail(true)}
      >
        <div className="p-1.5 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
              <span className={`text-[10px] font-semibold truncate ${cfg.color}`}>{task.title}</span>
            </div>
            {height > 40 && (
              <p className="text-[9px] text-white/50 truncate">{cfg.label}</p>
            )}
          </div>
          {height > 50 && (
            <div className={`text-[9px] font-medium ${statusCfg.color}`}>
              {task.startTime} - {task.endTime}
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
              {task.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs mb-1">النوع</p>
                <p className={`font-medium ${cfg.color}`}>{cfg.label}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs mb-1">الحالة</p>
                <p className={`font-medium flex items-center gap-1 ${statusCfg.color}`}>
                  {statusCfg.icon}{statusCfg.label}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs mb-1">الوقت</p>
                <p className="text-white font-medium text-xs">{task.startTime} - {task.endTime}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs mb-1">المدة</p>
                <p className="text-white font-medium">{formatDuration(task.durationMinutes)}</p>
              </div>
            </div>
            {task.engineerName && (
              <div className="text-xs text-white/50 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {task.engineerName}
              </div>
            )}
            {task.description && (
              <p className="text-xs text-white/40 bg-white/5 p-2.5 rounded-lg border border-white/10">{task.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Daily Timeline View ──────────────────────────────────────────────────────
interface DailyTimelineProps {
  dateStr: string;
  engineerId?: number;
  engineers: any[];
  viewMode: "admin" | "engineer";
  onTaskAdded?: () => void;
}

const HOUR_HEIGHT = 64; // px per hour
const START_HOUR  = 7;  // 7am
const END_HOUR    = 22; // 10pm

export default function DailyTimeline({ dateStr, engineerId, engineers, viewMode, onTaskAdded }: DailyTimelineProps) {
  const timelineQ = trpc.tasks.timeline.useQuery({ date: dateStr, engineerId });
  const tasks = timelineQ.data ?? [];

  // Hours array
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const totalHeight = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT;

  // Tasks with time only
  const timedTasks = tasks.filter(t => t.startTime && t.endTime);
  const untimedTasks = tasks.filter(t => !t.startTime || !t.endTime);

  // Summary
  const totalMinutes = timedTasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const byCategory: Record<string, number> = { meetings: 0, design_3d: 0, design_2d: 0, quotation: 0, other: 0 };
  timedTasks.forEach(t => {
    const cat = t.taskCategory ?? "other";
    byCategory[cat] = (byCategory[cat] ?? 0) + (t.durationMinutes ?? 0);
  });
  const pct = (cat: string) => totalMinutes > 0 ? Math.round((byCategory[cat] / totalMinutes) * 100) : 0;

  const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    meetings:  { label: "Meetings",  color: "text-blue-400" },
    design_3d: { label: "3D Design", color: "text-amber-400" },
    design_2d: { label: "2D Design", color: "text-orange-400" },
    quotation: { label: "Quotation", color: "text-pink-400" },
    other:     { label: "أخرى",      color: "text-slate-400" },
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header + Add button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">التقويم الزمني اليومي</h3>
          <p className="text-white/40 text-xs mt-0.5">{timedTasks.length} مهمة بوقت محدد • {untimedTasks.length} بدون وقت</p>
        </div>
        {viewMode === "admin" && (
          <AddTimeTaskDialog engineers={engineers} dateStr={dateStr} onDone={() => { timelineQ.refetch(); onTaskAdded?.(); }} />
        )}
      </div>

      {/* Summary Bar */}
      {totalMinutes > 0 && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-xs">إجمالي الوقت اليوم</span>
            <span className="text-white font-bold text-sm">{Math.round(totalMinutes / 60 * 10) / 10} ساعة</span>
          </div>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-white/10">
            {Object.entries(byCategory).map(([cat, min]) => {
              const w = totalMinutes > 0 ? (min / totalMinutes) * 100 : 0;
              if (w < 1) return null;
              const colors: Record<string, string> = { meetings: "bg-blue-500", design_3d: "bg-amber-500", design_2d: "bg-orange-500", quotation: "bg-pink-500", other: "bg-slate-500" };
              return <div key={cat} className={`${colors[cat] ?? "bg-slate-500"} transition-all`} style={{ width: `${w}%` }} />;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(CATEGORY_LABELS).map(([cat, cfg]) => {
              const p = pct(cat);
              if (p === 0) return null;
              return (
                <div key={cat} className="flex items-center gap-1 text-xs">
                  <span className={`font-bold ${cfg.color}`}>{p}%</span>
                  <span className="text-white/40">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline Grid */}
      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/3">
        <div className="flex" style={{ minHeight: `${totalHeight}px` }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 border-l border-white/10">
            {hours.map(h => (
              <div key={h} className="flex items-start justify-center border-b border-white/5 text-white/30 text-[10px] pt-1"
                style={{ height: `${HOUR_HEIGHT}px` }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {/* Tasks area */}
          <div className="flex-1 relative">
            {/* Hour lines */}
            {hours.map(h => (
              <div key={h} className="border-b border-white/5 absolute w-full"
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }} />
            ))}
            {/* Half-hour lines */}
            {hours.map(h => (
              <div key={`${h}-half`} className="border-b border-white/3 absolute w-full border-dashed"
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }} />
            ))}
            {/* Task blocks */}
            {timedTasks.map(task => (
              <TimelineBlock key={task.id} task={task} hourHeight={HOUR_HEIGHT} startHour={START_HOUR} />
            ))}
            {/* Current time indicator */}
            {(() => {
              const now = new Date();
              const todayStr2 = now.toISOString().split("T")[0];
              if (todayStr2 !== dateStr) return null;
              const nowMin = now.getHours() * 60 + now.getMinutes();
              const top = ((nowMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
              if (top < 0 || top > totalHeight) return null;
              return (
                <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    <div className="flex-1 h-px bg-red-400/60" />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Untimed tasks */}
      {untimedTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-white/40 text-xs font-medium">مهام بدون وقت محدد ({untimedTasks.length})</p>
          {untimedTasks.map(task => {
            const cfg = TASK_TYPE_CONFIG[task.taskType ?? "other"] ?? TASK_TYPE_CONFIG.other;
            const statusCfg = STATUS_CONFIG[task.status ?? "planned"] ?? STATUS_CONFIG.planned;
            return (
              <div key={task.id} className={`p-3 rounded-lg border flex items-center gap-3 ${cfg.bg} ${cfg.border}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${cfg.color}`}>{task.title}</p>
                  <p className="text-xs text-white/40">{cfg.label}</p>
                </div>
                <span className={`text-xs ${statusCfg.color} flex items-center gap-1`}>
                  {statusCfg.icon}{statusCfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tasks.length === 0 && !timelineQ.isLoading && (
        <div className="text-center py-12 text-white/30">
          <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لا توجد مهام لهذا اليوم</p>
          {viewMode === "admin" && <p className="text-xs mt-1">اضغط "إضافة مهمة" لإضافة مهمة بوقت محدد</p>}
        </div>
      )}
    </div>
  );
}
