import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle2, Clock, XCircle, Calendar, Users, Flame, AlertTriangle,
  ChevronLeft, ChevronRight, Video, Star
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalendarTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  taskDate: string | Date;
  engineerId: number;
  engineerName: string;
  description?: string;
  plannedHours?: number;
  delayDays?: number;
  notes?: string;
  category?: string;
  isCritical?: number;
  completedAt?: string | Date | null;
  meetingRecordingLink?: string | null;
}

interface CalendarDay {
  date: string;
  dayNum: number;
  dayName: string;
  isToday: boolean;
  tasks: CalendarTask[];
  summary: {
    total: number;
    completed: number;
    delayed: number;
    not_done: number;
    planned: number;
    client_delay: number;
  };
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  planned:      { label: "مخططة",        color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30",    dot: "bg-blue-400" },
  completed:    { label: "منجزة",         color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-400" },
  delayed:      { label: "متأخرة",        color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30",  dot: "bg-amber-400" },
  not_done:     { label: "لم تُنفذ",      color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30",      dot: "bg-red-400" },
  client_delay: { label: "تأخير العميل",  color: "text-purple-400",  bg: "bg-purple-500/15 border-purple-500/30", dot: "bg-purple-400" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: "منخفضة", color: "text-slate-400" },
  medium: { label: "متوسطة", color: "text-blue-400" },
  high:   { label: "عالية",  color: "text-amber-400" },
  urgent: { label: "عاجلة",  color: "text-red-400" },
};

// ─── Task Detail Popup ────────────────────────────────────────────────────────
function TaskDetailDialog({ task, open, onClose }: { task: CalendarTask | null; open: boolean; onClose: () => void }) {
  if (!task) return null;
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.planned;
  const priorityCfg = PRIORITY_CONFIG[task.priority ?? "medium"];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-indigo-400" />
            تفاصيل المهمة
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Task Title */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="font-semibold text-white text-base mb-2">{task.title}</p>
            {task.description && <p className="text-sm text-white/50">{task.description}</p>}
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-1">الحالة</p>
              <Badge className={`text-xs border ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</Badge>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-1">الأولوية</p>
              <span className={`text-sm font-semibold ${priorityCfg.color}`}>{priorityCfg.label}</span>
            </div>
          </div>

          {/* Engineer & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-1">المهندس</p>
              <p className="text-sm text-white font-medium">{task.engineerName}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-1">التاريخ</p>
              <p className="text-sm text-white">{new Date(task.taskDate).toLocaleDateString("ar-EG")}</p>
            </div>
          </div>

          {/* Extra Info */}
          <div className="space-y-2">
            {task.plannedHours && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Clock className="h-4 w-4" />
                <span>الساعات المخططة: {task.plannedHours} ساعة</span>
              </div>
            )}
            {task.delayDays && task.delayDays > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>{task.delayDays} {task.delayDays === 1 ? "يوم" : "أيام"} تأخير</span>
              </div>
            )}
            {task.isCritical === 1 && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <Flame className="h-4 w-4" />
                <span>مهمة حرجة</span>
              </div>
            )}
            {task.completedAt && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>تم الإنجاز: {new Date(task.completedAt).toLocaleString("ar-EG")}</span>
              </div>
            )}
            {(task.category === 'closing' || task.category === 'meeting') && (
              <div className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-indigo-400" />
                {task.meetingRecordingLink
                  ? <a href={task.meetingRecordingLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline truncate">{task.meetingRecordingLink}</a>
                  : <span className="text-amber-400">لا يوجد رابط تسجيل</span>
                }
              </div>
            )}
            {task.notes && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-white/40 mb-1">ملاحظات</p>
                <p className="text-sm text-white/70">{task.notes}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Block ───────────────────────────────────────────────────────────────
function TaskBlock({ task, onClick }: { task: CalendarTask; onClick: () => void }) {
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.planned;
  const priorityCfg = PRIORITY_CONFIG[task.priority ?? "medium"];
  return (
    <button
      onClick={onClick}
      className={`w-full text-right p-2 rounded-lg border text-xs transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${statusCfg.bg}`}
    >
      <div className="flex items-start gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${statusCfg.dot}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${statusCfg.color} leading-tight`}>{task.title}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className={`text-[10px] ${priorityCfg.color}`}>{priorityCfg.label}</span>
            {task.isCritical === 1 && <Flame className="h-2.5 w-2.5 text-red-400" />}
            {(task.category === 'closing' || task.category === 'meeting') && (
              <Star className="h-2.5 w-2.5 text-amber-400" />
            )}
          </div>
          <p className="text-[10px] text-white/40 truncate mt-0.5">{task.engineerName}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────
function DayColumn({ day, onTaskClick }: { day: CalendarDay; onTaskClick: (task: CalendarTask) => void }) {
  const hasCompleted = day.summary.completed > 0;
  const hasDelayed = day.summary.delayed > 0;
  const hasNotDone = day.summary.not_done > 0;

  const headerBg = day.isToday
    ? "bg-indigo-600/30 border-indigo-500/50"
    : day.summary.total === 0
    ? "bg-white/3 border-white/5"
    : hasNotDone
    ? "bg-red-500/5 border-red-500/20"
    : hasDelayed
    ? "bg-amber-500/5 border-amber-500/20"
    : hasCompleted && day.summary.completed === day.summary.total
    ? "bg-emerald-500/5 border-emerald-500/20"
    : "bg-white/5 border-white/10";

  return (
    <div className={`flex flex-col min-w-[120px] max-w-[140px] rounded-xl border overflow-hidden ${headerBg}`}>
      {/* Day Header */}
      <div className={`p-2 text-center border-b ${day.isToday ? "border-indigo-500/30 bg-indigo-600/20" : "border-white/10 bg-white/5"}`}>
        <p className={`text-xs font-bold ${day.isToday ? "text-indigo-300" : "text-white/80"}`}>
          {day.dayName}
        </p>
        <p className={`text-lg font-bold leading-tight ${day.isToday ? "text-indigo-200" : "text-white"}`}>
          {day.dayNum}
        </p>
        {day.isToday && (
          <span className="text-[9px] text-indigo-400 font-semibold">اليوم</span>
        )}
        {/* Mini summary dots */}
        {day.summary.total > 0 && (
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {day.summary.completed > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`${day.summary.completed} منجزة`} />
            )}
            {day.summary.delayed > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${day.summary.delayed} متأخرة`} />
            )}
            {day.summary.not_done > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" title={`${day.summary.not_done} لم تُنفذ`} />
            )}
            {day.summary.planned > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title={`${day.summary.planned} مخططة`} />
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="p-1.5 space-y-1.5 flex-1 min-h-[60px]">
        {day.tasks.length === 0 ? (
          <div className="flex items-center justify-center h-8">
            <span className="text-[10px] text-white/20">لا مهام</span>
          </div>
        ) : (
          day.tasks.map(task => (
            <TaskBlock key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))
        )}
      </div>

      {/* Day Footer Count */}
      {day.summary.total > 0 && (
        <div className="px-2 pb-2">
          <div className="text-[10px] text-white/30 text-center">
            {day.summary.total} مهمة
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Calendar Component ──────────────────────────────────────────────────
interface TaskCalendarViewProps {
  viewMode: "admin" | "engineer";
  engineers: Array<{ id: number; name: string; role?: string }>;
  currentEngineerIdForEngineerView?: number;
}

export default function TaskCalendarView({ viewMode, engineers, currentEngineerIdForEngineerView }: TaskCalendarViewProps) {
  const [filterEngineerId, setFilterEngineerId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // في Engineer View: نستخدم ID المهندس الحالي
  const engineerIdForQuery = viewMode === "engineer"
    ? currentEngineerIdForEngineerView
    : filterEngineerId ? Number(filterEngineerId) : undefined;

  const calendarQ = trpc.tasks.calendarView.useQuery(
    { engineerId: engineerIdForQuery },
    { refetchInterval: 60_000 } // تحديث كل دقيقة
  );

  const calendarData = calendarQ.data;
  const allDays: CalendarDay[] = calendarData?.days ?? [];
  const summary = calendarData?.summary ?? { total: 0, completed: 0, delayed: 0, not_done: 0, planned: 0, client_delay: 0, completionRate: 0 };

  // فلترة المهام حسب الحالة
  const filteredDays = filterStatus === "all"
    ? allDays
    : allDays.map(day => ({
        ...day,
        tasks: day.tasks.filter(t => t.status === filterStatus),
        summary: {
          ...day.summary,
          total: day.tasks.filter(t => t.status === filterStatus).length,
        },
      }));

  // Scroll للـ اليوم الحالي عند التحميل
  useEffect(() => {
    if (scrollRef.current) {
      const todayEl = scrollRef.current.querySelector('[data-today="true"]');
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [allDays.length]);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  const now = new Date();
  const monthName = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            التقويم الزمني للمهام
          </h2>
          <p className="text-white/40 text-sm mt-0.5">
            {viewMode === "engineer" ? "مهامك من بداية الشهر حتى اليوم" : `${monthName} — من اليوم الأول حتى اليوم`}
          </p>
        </div>

        {/* Filters - Manager Only */}
        {viewMode === "admin" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterEngineerId} onValueChange={setFilterEngineerId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm w-44">
                <SelectValue placeholder="جميع المهندسين" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="" className="text-white hover:bg-white/10">جميع المهندسين</SelectItem>
                {engineers.map(e => (
                  <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10">{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm w-36">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">جميع الحالات</SelectItem>
                <SelectItem value="planned" className="text-blue-400 hover:bg-white/10">مخططة</SelectItem>
                <SelectItem value="completed" className="text-emerald-400 hover:bg-white/10">منجزة</SelectItem>
                <SelectItem value="delayed" className="text-amber-400 hover:bg-white/10">متأخرة</SelectItem>
                <SelectItem value="not_done" className="text-red-400 hover:bg-white/10">لم تُنفذ</SelectItem>
                <SelectItem value="client_delay" className="text-purple-400 hover:bg-white/10">تأخير العميل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── MTD Summary Bar ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "إجمالي المهام",  value: summary.total,          color: "text-white",       bg: "bg-white/5 border-white/10" },
          { label: "منجزة",          value: summary.completed,      color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "متأخرة",         value: summary.delayed,        color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "لم تُنفذ",       value: summary.not_done,       color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
          { label: "مخططة",          value: summary.planned,        color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "نسبة الإنجاز",   value: `${(summary as any).completionRate ?? 0}%`, color: (summary as any).completionRate >= 80 ? "text-emerald-400" : (summary as any).completionRate >= 60 ? "text-amber-400" : "text-red-400", bg: "bg-white/5 border-white/10" },
        ].map((kpi, i) => (
          <div key={i} className={`p-2 rounded-lg border text-center ${kpi.bg}`}>
            <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-white/40 text-[10px]">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-white/40">الألوان:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className={cfg.color}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar Timeline ── */}
      {calendarQ.isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/30">
          <Clock className="h-8 w-8 animate-spin mr-3" />
          <span>جاري تحميل التقويم...</span>
        </div>
      ) : filteredDays.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد مهام في هذا الشهر حتى الآن</p>
        </div>
      ) : (
        <div className="relative">
          {/* Scroll Buttons */}
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800/90 border border-white/10 hover:bg-slate-700 transition-all shadow-lg"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800/90 border border-white/10 hover:bg-slate-700 transition-all shadow-lg"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-4 px-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="flex gap-2 min-w-max">
              {filteredDays.map(day => (
                <div key={day.date} data-today={day.isToday ? "true" : "false"}>
                  <DayColumn
                    day={day}
                    onTaskClick={(task) => setSelectedTask(task)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Task Detail Dialog ── */}
      <TaskDetailDialog
        task={selectedTask}
        open={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
