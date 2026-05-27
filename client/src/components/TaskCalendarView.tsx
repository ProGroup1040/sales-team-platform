import React, { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle2, Clock, XCircle, Calendar, Users, Flame, AlertTriangle,
  ChevronLeft, ChevronRight, Video, Star, RefreshCw, Filter,
  Briefcase, PenTool, Box, FileText, Presentation, TrendingUp,
  LayoutGrid, List, CalendarDays, AlertCircle,
} from "lucide-react";

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; error?: Error }
class CalendarErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CalendarErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4" dir="rtl">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <div>
            <p className="text-white font-semibold text-lg mb-1">حدث خطأ في عرض التقويم</p>
            <p className="text-white/40 text-sm mb-4">{this.state.error?.message ?? "خطأ غير معروف"}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false })}
              className="gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalendarTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  taskDate: string | Date;
  engineerId: number;
  engineerName: string;
  description?: string | null;
  plannedHours?: number | null;
  delayDays?: number | null;
  notes?: string | null;
  category?: string | null;
  taskType?: string | null;
  isCritical?: number | null;
  completedAt?: string | Date | null;
  meetingRecordingLink?: string | null;
  startTime?: string | null;
  endTime?: string | null;
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

// ─── Validation ───────────────────────────────────────────────────────────────
function validateTask(task: unknown): task is CalendarTask {
  if (!task || typeof task !== "object") return false;
  const t = task as Record<string, unknown>;
  if (typeof t.id !== "number") return false;
  if (typeof t.title !== "string" || !t.title.trim()) return false;
  if (!t.taskDate) return false;
  if (typeof t.engineerId !== "number") return false;
  return true;
}

function safeDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// ─── Task Type Config ─────────────────────────────────────────────────────────
const TASK_TYPE_CONFIG: Record<string, { label: string; icon: ReactNode; color: string }> = {
  design_2d:            { label: "2D تصميم",       icon: <PenTool className="h-3 w-3" />,       color: "text-cyan-400" },
  design_3d:            { label: "3D نمذجة",        icon: <Box className="h-3 w-3" />,            color: "text-violet-400" },
  render:               { label: "رندر",             icon: <Star className="h-3 w-3" />,           color: "text-amber-400" },
  quotation:            { label: "عرض سعر",          icon: <FileText className="h-3 w-3" />,       color: "text-blue-400" },
  meeting_modeling:     { label: "اجتماع نمذجة",     icon: <Users className="h-3 w-3" />,          color: "text-indigo-400" },
  meeting_presentation: { label: "عرض تقديمي",       icon: <Presentation className="h-3 w-3" />,   color: "text-purple-400" },
  meeting_closing:      { label: "اجتماع إغلاق",     icon: <TrendingUp className="h-3 w-3" />,     color: "text-emerald-400" },
  meeting_2d:           { label: "اجتماع 2D",        icon: <Users className="h-3 w-3" />,          color: "text-cyan-300" },
  meeting_3d:           { label: "اجتماع 3D",        icon: <Users className="h-3 w-3" />,          color: "text-violet-300" },
  meeting_quotation:    { label: "اجتماع عرض سعر",   icon: <Users className="h-3 w-3" />,          color: "text-blue-300" },
  closing:              { label: "إغلاق صفقة",        icon: <TrendingUp className="h-3 w-3" />,     color: "text-green-400" },
  negotiation:          { label: "تفاوض",             icon: <Briefcase className="h-3 w-3" />,      color: "text-orange-400" },
  meeting:              { label: "اجتماع",            icon: <Users className="h-3 w-3" />,          color: "text-indigo-400" },
  other:                { label: "أخرى",              icon: <Briefcase className="h-3 w-3" />,      color: "text-slate-400" },
};

function getTaskTypeLabel(taskType?: string | null, category?: string | null): { label: string; icon: ReactNode; color: string } {
  if (taskType && TASK_TYPE_CONFIG[taskType]) return TASK_TYPE_CONFIG[taskType];
  if (category === "meeting") return TASK_TYPE_CONFIG.meeting;
  if (category === "closing") return TASK_TYPE_CONFIG.closing;
  return { label: "مهمة", icon: <Briefcase className="h-3 w-3" />, color: "text-slate-400" };
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  planned:      { label: "مخططة",       color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30",       dot: "bg-blue-400" },
  completed:    { label: "منجزة",        color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-400" },
  delayed:      { label: "متأخرة",       color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30",     dot: "bg-amber-400" },
  not_done:     { label: "لم تُنفذ",     color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30",         dot: "bg-red-400" },
  client_delay: { label: "تأخير العميل", color: "text-purple-400",  bg: "bg-purple-500/15 border-purple-500/30",   dot: "bg-purple-400" },
  in_progress:  { label: "جارية",        color: "text-sky-400",     bg: "bg-sky-500/15 border-sky-500/30",         dot: "bg-sky-400" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: "منخفضة", color: "text-slate-400" },
  medium: { label: "متوسطة", color: "text-blue-400" },
  high:   { label: "عالية",  color: "text-amber-400" },
  urgent: { label: "عاجلة",  color: "text-red-400" },
};

// ─── Task Detail Dialog ───────────────────────────────────────────────────────
function TaskDetailDialog({ task, open, onClose }: { task: CalendarTask | null; open: boolean; onClose: () => void }) {
  if (!task) return null;
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.planned;
  const priorityCfg = PRIORITY_CONFIG[task.priority ?? "medium"] ?? PRIORITY_CONFIG.medium;
  const typeCfg = getTaskTypeLabel(task.taskType, task.category);
  const taskDateObj = safeDate(task.taskDate);
  const completedAtObj = safeDate(task.completedAt);

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
            <div className="flex items-center gap-2 mb-2">
              <span className={typeCfg.color}>{typeCfg.icon}</span>
              <span className={`text-xs font-medium ${typeCfg.color}`}>{typeCfg.label}</span>
            </div>
            <p className="font-semibold text-white text-base mb-1">{task.title}</p>
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
              <p className="text-sm text-white font-medium">{task.engineerName || "غير معروف"}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-1">التاريخ</p>
              <p className="text-sm text-white">
                {taskDateObj ? taskDateObj.toLocaleDateString("ar-EG") : "—"}
              </p>
            </div>
          </div>

          {/* Time */}
          {(task.startTime || task.endTime) && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-1">الوقت</p>
              <p className="text-sm text-white">
                {task.startTime ?? "—"} {task.endTime ? `← ${task.endTime}` : ""}
              </p>
            </div>
          )}

          {/* Extra Info */}
          <div className="space-y-2">
            {task.plannedHours != null && task.plannedHours > 0 && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Clock className="h-4 w-4" />
                <span>الساعات المخططة: {task.plannedHours} ساعة</span>
              </div>
            )}
            {task.delayDays != null && task.delayDays > 0 && (
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
            {completedAtObj && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>تم الإنجاز: {completedAtObj.toLocaleString("ar-EG")}</span>
              </div>
            )}
            {(task.category === "closing" || task.taskType?.includes("meeting") || task.taskType?.includes("closing")) && (
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
  if (!validateTask(task)) return null;
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.planned;
  const typeCfg = getTaskTypeLabel(task.taskType, task.category);

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
            <span className={`text-[10px] flex items-center gap-0.5 ${typeCfg.color}`}>
              {typeCfg.icon}
              {typeCfg.label}
            </span>
            {task.isCritical === 1 && <Flame className="h-2.5 w-2.5 text-red-400" />}
            {task.delayDays != null && task.delayDays > 0 && (
              <span className="text-[10px] text-amber-400">{task.delayDays}د</span>
            )}
          </div>
          <p className="text-[10px] text-white/40 truncate mt-0.5">{task.engineerName || "—"}</p>
          {(task.startTime) && (
            <p className="text-[10px] text-white/30 mt-0.5">{task.startTime}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────
function DayColumn({ day, onTaskClick }: { day: CalendarDay; onTaskClick: (task: CalendarTask) => void }) {
  if (!day || !day.date) return null;
  const hasCompleted = (day.summary?.completed ?? 0) > 0;
  const hasDelayed = (day.summary?.delayed ?? 0) > 0;
  const hasNotDone = (day.summary?.not_done ?? 0) > 0;
  const total = day.summary?.total ?? 0;

  const headerBg = day.isToday
    ? "bg-indigo-600/30 border-indigo-500/50"
    : total === 0
    ? "bg-white/3 border-white/5"
    : hasNotDone
    ? "bg-red-500/5 border-red-500/20"
    : hasDelayed
    ? "bg-amber-500/5 border-amber-500/20"
    : hasCompleted && (day.summary?.completed ?? 0) === total
    ? "bg-emerald-500/5 border-emerald-500/20"
    : "bg-white/5 border-white/10";

  const validTasks = (day.tasks ?? []).filter(validateTask);

  return (
    <div className={`flex flex-col min-w-[120px] max-w-[140px] rounded-xl border overflow-hidden ${headerBg}`}>
      {/* Day Header */}
      <div className={`p-2 text-center border-b ${day.isToday ? "border-indigo-500/30 bg-indigo-600/20" : "border-white/10 bg-white/5"}`}>
        <p className={`text-xs font-bold ${day.isToday ? "text-indigo-300" : "text-white/80"}`}>
          {day.dayName ?? ""}
        </p>
        <p className={`text-lg font-bold leading-tight ${day.isToday ? "text-indigo-200" : "text-white"}`}>
          {day.dayNum ?? ""}
        </p>
        {day.isToday && (
          <span className="text-[9px] text-indigo-400 font-semibold">اليوم</span>
        )}
        {/* Mini summary dots */}
        {total > 0 && (
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {(day.summary?.completed ?? 0) > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`${day.summary.completed} منجزة`} />
            )}
            {(day.summary?.delayed ?? 0) > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${day.summary.delayed} متأخرة`} />
            )}
            {(day.summary?.not_done ?? 0) > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" title={`${day.summary.not_done} لم تُنفذ`} />
            )}
            {(day.summary?.planned ?? 0) > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title={`${day.summary.planned} مخططة`} />
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="p-1.5 space-y-1.5 flex-1 min-h-[60px]">
        {validTasks.length === 0 ? (
          <div className="flex items-center justify-center h-8">
            <span className="text-[10px] text-white/20">لا مهام</span>
          </div>
        ) : (
          validTasks.map(task => (
            <TaskBlock key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))
        )}
      </div>

      {/* Day Footer Count */}
      {total > 0 && (
        <div className="px-2 pb-2">
          <div className="text-[10px] text-white/30 text-center">
            {total} مهمة
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ days, onTaskClick }: { days: CalendarDay[]; onTaskClick: (task: CalendarTask) => void }) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const weekDays = days.filter(d => {
    const date = safeDate(d.date);
    if (!date) return false;
    return date >= startOfWeek && date <= endOfWeek;
  });

  if (weekDays.length === 0) {
    return (
      <div className="text-center py-12 text-white/30">
        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>لا توجد مهام هذا الأسبوع</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-4">
      {weekDays.map(day => (
        <div key={day.date} data-today={day.isToday ? "true" : "false"} className="flex-1 min-w-[140px]">
          <DayColumn day={day} onTaskClick={onTaskClick} />
        </div>
      ))}
    </div>
  );
}

// ─── Month Grid View ──────────────────────────────────────────────────────────
function MonthGridView({ days, onTaskClick }: { days: CalendarDay[]; onTaskClick: (task: CalendarTask) => void }) {
  if (days.length === 0) {
    return (
      <div className="text-center py-12 text-white/30">
        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>لا توجد مهام هذا الشهر</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Day names header */}
      {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map(d => (
        <div key={d} className="text-center text-[10px] text-white/30 py-1 font-medium">{d}</div>
      ))}
      {/* Empty cells before first day */}
      {(() => {
        const firstDay = safeDate(days[0]?.date);
        const offset = firstDay ? firstDay.getDay() : 0;
        return Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />);
      })()}
      {/* Day cells */}
      {days.map(day => {
        const validTasks = (day.tasks ?? []).filter(validateTask);
        const total = day.summary?.total ?? 0;
        return (
          <div
            key={day.date}
            className={`min-h-[60px] rounded-lg border p-1 ${
              day.isToday
                ? "border-indigo-500/50 bg-indigo-600/20"
                : total === 0
                ? "border-white/5 bg-white/2"
                : "border-white/10 bg-white/5"
            }`}
          >
            <p className={`text-xs font-bold text-center mb-1 ${day.isToday ? "text-indigo-300" : "text-white/60"}`}>
              {day.dayNum}
            </p>
            <div className="space-y-0.5">
              {validTasks.slice(0, 3).map(task => {
                const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.planned;
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`w-full text-right px-1 py-0.5 rounded text-[9px] truncate border ${statusCfg.bg} ${statusCfg.color} hover:brightness-110`}
                  >
                    {task.title}
                  </button>
                );
              })}
              {validTasks.length > 3 && (
                <p className="text-[9px] text-white/30 text-center">+{validTasks.length - 3} أخرى</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Calendar Component ──────────────────────────────────────────────────
interface TaskCalendarViewProps {
  viewMode: "admin" | "engineer";
  engineers: Array<{ id: number; name: string; role?: string }>;
  currentEngineerIdForEngineerView?: number;
}

function TaskCalendarViewInner({ viewMode, engineers, currentEngineerIdForEngineerView }: TaskCalendarViewProps) {
  const [filterEngineerId, setFilterEngineerId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTaskType, setFilterTaskType] = useState<string>("all");
  const [calendarMode, setCalendarMode] = useState<"timeline" | "week" | "month">("timeline");
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // في Engineer View: نستخدم ID المهندس الحالي
  const engineerIdForQuery = viewMode === "engineer"
    ? currentEngineerIdForEngineerView
    : (filterEngineerId && filterEngineerId !== "all") ? Number(filterEngineerId) : undefined;

  const calendarQ = trpc.tasks.calendarView.useQuery(
    { engineerId: engineerIdForQuery },
    {
      refetchInterval: 60_000,
      retry: 2,
      retryDelay: 1000,
    }
  );

  const calendarData = calendarQ.data;
  const rawDays: unknown[] = (calendarData as any)?.days ?? [];

  // Validate days
  const allDays: CalendarDay[] = rawDays
    .filter((d): d is CalendarDay => {
      if (!d || typeof d !== "object") return false;
      const day = d as Record<string, unknown>;
      return typeof day.date === "string" && typeof day.dayNum === "number";
    })
    .map(day => ({
      ...day,
      tasks: (day.tasks ?? []).filter(validateTask),
    }));

  const summary = (calendarData as any)?.summary ?? {
    total: 0, completed: 0, delayed: 0, not_done: 0, planned: 0, client_delay: 0, completionRate: 0
  };

  // فلترة المهام حسب الحالة ونوع المهمة
  const filteredDays = allDays.map(day => {
    let tasks = day.tasks;
    if (filterStatus !== "all") tasks = tasks.filter(t => t.status === filterStatus);
    if (filterTaskType !== "all") {
      tasks = tasks.filter(t => {
        if (filterTaskType === "meeting") return t.taskType?.includes("meeting") || t.category === "meeting";
        if (filterTaskType === "closing") return t.taskType === "closing" || t.category === "closing";
        if (filterTaskType === "design_2d") return t.taskType === "design_2d";
        if (filterTaskType === "design_3d") return t.taskType === "design_3d";
        if (filterTaskType === "render") return t.taskType === "render";
        if (filterTaskType === "quotation") return t.taskType === "quotation";
        return t.taskType === filterTaskType;
      });
    }
    return {
      ...day,
      tasks,
      summary: {
        ...day.summary,
        total: tasks.length,
        completed: tasks.filter(t => t.status === "completed").length,
        delayed: tasks.filter(t => t.status === "delayed").length,
        not_done: tasks.filter(t => t.status === "not_done").length,
        planned: tasks.filter(t => t.status === "planned").length,
        client_delay: tasks.filter(t => t.status === "client_delay").length,
      },
    };
  });

  // Scroll للـ اليوم الحالي عند التحميل
  useEffect(() => {
    if (scrollRef.current && calendarMode === "timeline") {
      const todayEl = scrollRef.current.querySelector('[data-today="true"]');
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [allDays.length, calendarMode]);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });

  const now = new Date();
  const monthName = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  const completionRate = typeof summary.completionRate === "number" ? summary.completionRate : 0;

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
            {viewMode === "engineer"
              ? "مهامك من بداية الشهر حتى اليوم"
              : `${monthName} — من اليوم الأول حتى اليوم`}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setCalendarMode("timeline")}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-all ${calendarMode === "timeline" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"}`}
          >
            <List className="h-3 w-3" />
            Timeline
          </button>
          <button
            onClick={() => setCalendarMode("week")}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-all ${calendarMode === "week" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"}`}
          >
            <CalendarDays className="h-3 w-3" />
            أسبوع
          </button>
          <button
            onClick={() => setCalendarMode("month")}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-all ${calendarMode === "month" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"}`}
          >
            <LayoutGrid className="h-3 w-3" />
            شهر
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-white/40 shrink-0" />

        {/* Engineer Filter - Admin only */}
        {viewMode === "admin" && (
          <Select value={filterEngineerId} onValueChange={setFilterEngineerId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm w-44 h-8">
                <SelectValue placeholder="جميع المهندسين" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">جميع المهندسين</SelectItem>
              {(engineers ?? []).map(e => (
                <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10">{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm w-36 h-8">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all" className="text-white hover:bg-white/10">جميع الحالات</SelectItem>
            <SelectItem value="planned" className="text-blue-400 hover:bg-white/10">مخططة</SelectItem>
            <SelectItem value="completed" className="text-emerald-400 hover:bg-white/10">منجزة</SelectItem>
            <SelectItem value="delayed" className="text-amber-400 hover:bg-white/10">متأخرة</SelectItem>
            <SelectItem value="not_done" className="text-red-400 hover:bg-white/10">لم تُنفذ</SelectItem>
            <SelectItem value="client_delay" className="text-purple-400 hover:bg-white/10">تأخير العميل</SelectItem>
            <SelectItem value="in_progress" className="text-sky-400 hover:bg-white/10">جارية</SelectItem>
          </SelectContent>
        </Select>

        {/* Task Type Filter */}
        <Select value={filterTaskType} onValueChange={setFilterTaskType}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm w-40 h-8">
            <SelectValue placeholder="جميع الأنواع" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all" className="text-white hover:bg-white/10">جميع الأنواع</SelectItem>
            <SelectItem value="meeting" className="text-indigo-400 hover:bg-white/10">اجتماعات</SelectItem>
            <SelectItem value="closing" className="text-emerald-400 hover:bg-white/10">إغلاق صفقة</SelectItem>
            <SelectItem value="quotation" className="text-blue-400 hover:bg-white/10">عروض أسعار</SelectItem>
            <SelectItem value="design_2d" className="text-cyan-400 hover:bg-white/10">تصميم 2D</SelectItem>
            <SelectItem value="design_3d" className="text-violet-400 hover:bg-white/10">نمذجة 3D</SelectItem>
            <SelectItem value="render" className="text-amber-400 hover:bg-white/10">رندر</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => calendarQ.refetch()}
          disabled={calendarQ.isFetching}
          className="h-8 px-2 text-white/50 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${calendarQ.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── MTD Summary Bar ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "إجمالي المهام", value: summary.total,         color: "text-white",       bg: "bg-white/5 border-white/10" },
          { label: "منجزة",         value: summary.completed,     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "متأخرة",        value: summary.delayed,       color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "لم تُنفذ",      value: summary.not_done,      color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
          { label: "مخططة",         value: summary.planned,       color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
          {
            label: "نسبة الإنجاز",
            value: `${completionRate}%`,
            color: completionRate >= 80 ? "text-emerald-400" : completionRate >= 60 ? "text-amber-400" : "text-red-400",
            bg: "bg-white/5 border-white/10",
          },
        ].map((kpi, i) => (
          <div key={i} className={`p-2 rounded-lg border text-center ${kpi.bg}`}>
            <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-white/40 text-[10px]">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-white/40">الحالات:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className={cfg.color}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar Content ── */}
      {calendarQ.isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/30 gap-3">
          <Clock className="h-8 w-8 animate-spin" />
          <span>جاري تحميل التقويم...</span>
        </div>
      ) : calendarQ.isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-white/60">فشل تحميل التقويم</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarQ.refetch()}
            className="gap-2 border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      ) : filteredDays.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد مهام في هذا الشهر حتى الآن</p>
          {(filterStatus !== "all" || filterTaskType !== "all") && (
            <button
              onClick={() => { setFilterStatus("all"); setFilterTaskType("all"); }}
              className="mt-2 text-indigo-400 text-sm underline hover:text-indigo-300"
            >
              إزالة الفلاتر
            </button>
          )}
        </div>
      ) : calendarMode === "month" ? (
        <MonthGridView days={filteredDays} onTaskClick={setSelectedTask} />
      ) : calendarMode === "week" ? (
        <WeekView days={filteredDays} onTaskClick={setSelectedTask} />
      ) : (
        /* Timeline Mode */
        <div className="relative">
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
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-4 px-8"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="flex gap-2 min-w-max">
              {filteredDays.map(day => (
                <div key={day.date} data-today={day.isToday ? "true" : "false"}>
                  <DayColumn day={day} onTaskClick={setSelectedTask} />
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

// ─── Exported Component with Error Boundary ───────────────────────────────────
export default function TaskCalendarView(props: TaskCalendarViewProps) {
  return (
    <CalendarErrorBoundary>
      <TaskCalendarViewInner {...props} />
    </CalendarErrorBoundary>
  );
}
