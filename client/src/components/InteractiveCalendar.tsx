/**
 * InteractiveCalendar - Google Calendar / ClickUp style
 * Features: Day/Week/Month/Timeline views, Drag & Drop, Time Slots, Task Modal
 */
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Clock,
  LayoutGrid, List, AlignLeft, Loader2, AlertCircle,
  RefreshCw, X, Edit2, Trash2, User, Tag, Bell
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type ViewMode = 'day' | 'week' | 'month' | 'timeline';
type TaskStatus = 'planned' | 'completed' | 'delayed' | 'not_done' | 'client_delay';
type TaskType = 'design_2d' | 'design_3d' | 'render' | 'quotation' | 'meeting_modeling' |
  'meeting_presentation' | 'meeting_closing' | 'contract' | 'work_order' |
  'meeting_2d' | 'meeting_3d' | 'meeting_quotation' | 'closing' | 'negotiation' | 'other';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface CalendarTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  taskDate: string | Date;
  engineerId: number;
  engineerName: string;
  description?: string | null;
  plannedHours?: number | null;
  notes?: string | null;
  category?: string | null;
  taskType?: TaskType | string | null;
  isCritical?: number;
  startTime?: string | null;
  endTime?: string | null;
  clientName?: string | null;
  reminderMinutes?: number | null;
  // Admin Sales specific fields
  isAdminSalesTask?: boolean;
  taskKey?: string | null;
  kpiWeight?: number | null;
  kpiImpact?: string | null;
  adminCategory?: string | null;
  originalStatus?: string | null;
}

interface Engineer {
  id: number;
  name: string;
  role?: string;
}

interface Props {
  engineers: Engineer[];
  currentUserRole?: string;
  currentEngineerId?: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const TASK_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  meeting_modeling:     { label: 'اجتماع نمذجة',    color: 'text-blue-300',   bg: 'bg-blue-900/60',   border: 'border-blue-500' },
  meeting_presentation: { label: 'عرض تقديمي',      color: 'text-orange-300', bg: 'bg-orange-900/60', border: 'border-orange-500' },
  meeting_closing:      { label: 'إغلاق',            color: 'text-green-300',  bg: 'bg-green-900/60',  border: 'border-green-500' },
  design_2d:            { label: '2D تصميم',         color: 'text-cyan-300',   bg: 'bg-cyan-900/60',   border: 'border-cyan-500' },
  design_3d:            { label: '3D نمذجة',         color: 'text-pink-300',   bg: 'bg-pink-900/60',   border: 'border-pink-500' },
  render:               { label: 'رندر',             color: 'text-purple-300', bg: 'bg-purple-900/60', border: 'border-purple-500' },
  quotation:            { label: 'عرض سعر',          color: 'text-gray-300',   bg: 'bg-gray-700/60',   border: 'border-gray-500' },
  contract:             { label: 'عقد',              color: 'text-yellow-300', bg: 'bg-yellow-900/60', border: 'border-yellow-500' },
  work_order:           { label: 'أمر شغل',          color: 'text-teal-300',   bg: 'bg-teal-900/60',   border: 'border-teal-500' },
  closing:              { label: 'إغلاق صفقة',       color: 'text-green-300',  bg: 'bg-green-900/60',  border: 'border-green-500' },
  other:                { label: 'أخرى',             color: 'text-slate-300',  bg: 'bg-slate-700/60',  border: 'border-slate-500' },
  meeting_2d:           { label: 'اجتماع 2D',        color: 'text-blue-300',   bg: 'bg-blue-900/60',   border: 'border-blue-500' },
  meeting_3d:           { label: 'اجتماع 3D',        color: 'text-pink-300',   bg: 'bg-pink-900/60',   border: 'border-pink-500' },
  meeting_quotation:    { label: 'اجتماع عرض سعر',   color: 'text-gray-300',   bg: 'bg-gray-700/60',   border: 'border-gray-500' },
  negotiation:          { label: 'تفاوض',            color: 'text-amber-300',  bg: 'bg-amber-900/60',  border: 'border-amber-500' },
  // Admin Sales Task Types (from adminSalesTasks.taskType)
  daily:                { label: 'مهمة يومية',       color: 'text-violet-300', bg: 'bg-violet-900/60', border: 'border-violet-500' },
  weekly:               { label: 'مهمة أسبوعية',     color: 'text-indigo-300', bg: 'bg-indigo-900/60', border: 'border-indigo-500' },
  monthly:              { label: 'مهمة شهرية',       color: 'text-fuchsia-300',bg: 'bg-fuchsia-900/60',border: 'border-fuchsia-500' },
  meeting:              { label: 'اجتماع إداري',     color: 'text-rose-300',   bg: 'bg-rose-900/60',   border: 'border-rose-500' },
  // Admin Sales Categories (for color differentiation)
  crm_data:             { label: 'CRM بيانات',        color: 'text-sky-300',    bg: 'bg-sky-900/60',    border: 'border-sky-500' },
  financial_collection: { label: 'تحصيل مالي',       color: 'text-emerald-300',bg: 'bg-emerald-900/60',border: 'border-emerald-500' },
  operations:           { label: 'عمليات',            color: 'text-orange-300', bg: 'bg-orange-900/60', border: 'border-orange-500' },
  reporting:            { label: 'تقارير',            color: 'text-lime-300',   bg: 'bg-lime-900/60',   border: 'border-lime-500' },
  coordination:         { label: 'تنسيق',             color: 'text-cyan-300',   bg: 'bg-cyan-900/60',   border: 'border-cyan-500' },
  meetings:             { label: 'اجتماعات',          color: 'text-rose-300',   bg: 'bg-rose-900/60',   border: 'border-rose-500' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  planned:      { label: 'مخططة',       color: 'text-blue-400',   dot: 'bg-blue-400' },
  completed:    { label: 'منجزة',       color: 'text-green-400',  dot: 'bg-green-400' },
  delayed:      { label: 'متأخرة',      color: 'text-red-400',    dot: 'bg-red-400' },
  not_done:     { label: 'لم تُنفذ',    color: 'text-gray-400',   dot: 'bg-gray-400' },
  client_delay: { label: 'تأخير عميل', color: 'text-yellow-400', dot: 'bg-yellow-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'عاجلة',   color: 'text-red-400' },
  high:   { label: 'عالية',   color: 'text-orange-400' },
  medium: { label: 'متوسطة',  color: 'text-yellow-400' },
  low:    { label: 'منخفضة',  color: 'text-green-400' },
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

const TASK_TYPES: Array<{ value: TaskType; label: string }> = [
  { value: 'design_2d',            label: '2D Design' },
  { value: 'design_3d',            label: '3D Modeling' },
  { value: 'render',               label: 'Render' },
  { value: 'quotation',            label: 'Quotation' },
  { value: 'meeting_modeling',     label: 'Meeting - Modeling' },
  { value: 'meeting_presentation', label: 'Meeting - Presentation' },
  { value: 'meeting_closing',      label: 'Meeting - Closing' },
  { value: 'contract',             label: 'Contract' },
  { value: 'work_order',           label: 'Work Order' },
  { value: 'closing',              label: 'Closing' },
  { value: 'other',                label: 'Other' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function safeDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  try {
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  } catch { return null; }
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDateAr(d: Date): string {
  return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getWeekDays(anchor: Date): Date[] {
  const day = anchor.getDay(); // 0=Sun
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getMonthDays(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function getTaskColor(task: CalendarTask) {
  // Admin Sales tasks: use category for color if available
  if (task.isAdminSalesTask) {
    const cat = task.adminCategory || task.category || '';
    if (cat && TASK_TYPE_CONFIG[cat]) return TASK_TYPE_CONFIG[cat];
    const type = task.taskType as string || 'daily';
    return TASK_TYPE_CONFIG[type] || TASK_TYPE_CONFIG['daily'];
  }
  const type = task.taskType as string || 'other';
  return TASK_TYPE_CONFIG[type] || TASK_TYPE_CONFIG['other'];
}

// ─── Task Block Component ───────────────────────────────────────────────────────
function TaskBlock({
  task,
  compact = false,
  onClick,
  isDragging = false,
}: {
  task: CalendarTask;
  compact?: boolean;
  onClick?: (task: CalendarTask) => void;
  isDragging?: boolean;
}) {
  const cfg = getTaskColor(task);
  const statusDot = STATUS_CONFIG[task.status]?.dot || 'bg-gray-400';

  return (
    <div
      onClick={() => onClick?.(task)}
      className={`
        rounded-md border-l-4 px-2 py-1 cursor-pointer select-none
        transition-all duration-150 hover:brightness-110 hover:scale-[1.02]
        ${cfg.bg} ${cfg.border}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${task.status === 'completed' ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-center gap-1 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
        <span className={`text-xs font-medium truncate ${cfg.color}`}>
          {task.title}
        </span>
        {task.isCritical === 1 && <span className="text-red-400 text-xs flex-shrink-0">🔴</span>}
        {task.isAdminSalesTask && <span className="text-violet-400 text-[9px] flex-shrink-0 bg-violet-900/40 px-1 rounded">إداري</span>}
      </div>
      {!compact && (
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.startTime && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {task.startTime}{task.endTime ? `–${task.endTime}` : ''}
            </span>
          )}
          <span className="text-[10px] text-slate-400 truncate">{task.engineerName}</span>
          {task.clientName && (
            <span className="text-[10px] text-slate-500 truncate">• {task.clientName}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Draggable Task ─────────────────────────────────────────────────────────────
function DraggableTask({ task, compact, onClick }: { task: CalendarTask; compact?: boolean; onClick?: (t: CalendarTask) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
      <TaskBlock task={task} compact={compact} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

// ─── Droppable Day Cell ─────────────────────────────────────────────────────────
function DroppableCell({
  id,
  children,
  className,
  onClick,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`${className} ${isOver ? 'ring-2 ring-blue-400 ring-inset bg-blue-900/20' : ''} transition-colors`}
    >
      {children}
    </div>
  );
}

// ─── Task Modal ─────────────────────────────────────────────────────────────────
interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: CalendarTask | null;
  defaultDate?: string;
  defaultStartTime?: string;
  engineers: Engineer[];
  onSaved: () => void;
  currentUserRole?: string;
  currentEngineerId?: number;
  isAdminSalesMode?: boolean;
  adminSalesEngineerId?: number;
}

function TaskModal({
  open, onClose, task, defaultDate, defaultStartTime,
  engineers, onSaved, currentUserRole, currentEngineerId,
  isAdminSalesMode, adminSalesEngineerId,
}: TaskModalProps) {
  const isAdmin = currentUserRole === 'admin';
  const isEdit = !!task;

  const [form, setForm] = useState({
    title: '',
    taskType: '' as TaskType | string | '',
    engineerId: '' as string,
    clientName: '',
    taskDate: '',
    startTime: '',
    endTime: '',
    priority: '' as Priority | '',
    status: 'planned' as TaskStatus,
    notes: '',
    reminderMinutes: '0',
    plannedHours: '',
  });

  useEffect(() => {
    if (open) {
      if (task) {
        const d = safeDate(task.taskDate);
        setForm({
          title: task.title || '',
          taskType: task.taskType || '',
          engineerId: String(task.engineerId || ''),
          clientName: task.clientName || '',
          taskDate: d ? toDateStr(d) : '',
          startTime: task.startTime || '',
          endTime: task.endTime || '',
          priority: task.priority || '',
          status: task.status || 'planned',
          notes: task.notes || '',
          reminderMinutes: String(task.reminderMinutes || 0),
          plannedHours: String(task.plannedHours || ''),
        });
      } else {
        setForm({
          title: '',
          taskType: '',
          engineerId: isAdmin ? '' : String(currentEngineerId || ''),
          clientName: '',
          taskDate: defaultDate || toDateStr(new Date()),
          startTime: defaultStartTime || '',
          endTime: '',
          priority: '',
          status: 'planned',
          notes: '',
          reminderMinutes: '0',
          plannedHours: '',
        });
      }
    }
  }, [open, task, defaultDate, defaultStartTime]);

  // Admin Sales form state
  const [adminForm, setAdminForm] = useState({
    taskTitle: '',
    taskType: 'daily' as 'daily' | 'weekly' | 'monthly' | 'meeting',
    taskDate: '',
    category: 'operations' as 'crm_data' | 'financial_collection' | 'operations' | 'reporting' | 'coordination' | 'meetings',
    notes: '',
    kpiWeight: '0',
  });
  useEffect(() => {
    if (open && isAdminSalesMode) {
      if (task && task.isAdminSalesTask) {
        const d = safeDate(task.taskDate);
        setAdminForm({
          taskTitle: task.title || '',
          taskType: (task.taskType as any) || 'daily',
          taskDate: d ? toDateStr(d) : '',
          category: (task.adminCategory as any) || 'operations',
          notes: task.notes || '',
          kpiWeight: String(task.kpiWeight || 0),
        });
      } else {
        setAdminForm({
          taskTitle: '',
          taskType: 'daily',
          taskDate: defaultDate || toDateStr(new Date()),
          category: 'operations',
          notes: '',
          kpiWeight: '0',
        });
      }
    }
  }, [open, task, defaultDate, isAdminSalesMode]);
  const createMutation = trpc.tasks.createWithTime.useMutation({
    onSuccess: () => { toast.success('تم إضافة المهمة'); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message || 'خطأ في الإضافة'),
  });
  const updateMutation = trpc.tasks.updateFull.useMutation({
    onSuccess: () => { toast.success('تم تحديث المهمة'); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message || 'خطأ في التحديث'),
  });

   const createAdminMutation = trpc.adminSalesTasks.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة مهمة Admin Sales'); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message || 'خطأ في الإضافة'),
  });
  const updateAdminMutation = trpc.adminSalesTasks.updateFull.useMutation({
    onSuccess: () => { toast.success('تم تحديث مهمة Admin Sales'); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message || 'خطأ في التحديث'),
  });
  const isSaving = createMutation.isPending || updateMutation.isPending || createAdminMutation.isPending || updateAdminMutation.isPending;
  const handleSave = () => {
    if (isAdminSalesMode) {
      if (!adminForm.taskTitle.trim()) { toast.error('يجب إدخال عنوان المهمة'); return; }
      if (!adminForm.taskDate) { toast.error('يجب تحديد تاريخ المهمة'); return; }
      const engId = adminSalesEngineerId || task?.engineerId;
      if (!engId) { toast.error('يجب تحديد مهندس Admin Sales'); return; }
      if (isEdit && task && task.isAdminSalesTask) {
        updateAdminMutation.mutate({ id: task.id, taskTitle: adminForm.taskTitle.trim(), taskType: adminForm.taskType, taskDate: adminForm.taskDate, category: adminForm.category, notes: adminForm.notes || undefined, kpiWeight: Number(adminForm.kpiWeight) || 0 });
      } else {
        createAdminMutation.mutate({ engineerId: engId, taskTitle: adminForm.taskTitle.trim(), taskType: adminForm.taskType, taskDate: adminForm.taskDate, category: adminForm.category, notes: adminForm.notes || undefined, kpiWeight: Number(adminForm.kpiWeight) || 0 });
      }
      return;
    }
    if (!form.title.trim()) { toast.error('يجب إدخال عنوان المهمة'); return; }
    if (!form.engineerId) { toast.error('يجب اختيار المهندس'); return; }
    if (!form.taskDate) { toast.error('يجب تحديد تاريخ المهمة'); return; }

    if (isEdit && task) {
      updateMutation.mutate({
        id: task.id,
        title: form.title.trim(),
        taskType: form.taskType as TaskType || undefined,
        engineerId: Number(form.engineerId),
        clientName: form.clientName || undefined,
        taskDate: form.taskDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        priority: form.priority as Priority || undefined,
        status: form.status,
        notes: form.notes || undefined,
        reminderMinutes: Number(form.reminderMinutes) || 0,
        plannedHours: form.plannedHours ? Number(form.plannedHours) : undefined,
      });
    } else {
      createMutation.mutate({
        title: form.title.trim(),
        engineerId: Number(form.engineerId),
        taskDate: form.taskDate,
        taskType: form.taskType as TaskType || undefined,
        clientName: form.clientName || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        priority: form.priority as Priority || undefined,
        notes: form.notes || undefined,
        reminderMinutes: Number(form.reminderMinutes) || 0,
        plannedHours: form.plannedHours ? Number(form.plannedHours) : undefined,
      });
    }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEdit ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isAdminSalesMode ? (
            /* ── Admin Sales Form ── */
            <>
              {/* Task Title */}
              <div>
                <Label className="text-slate-300 text-sm">عنوان المهمة *</Label>
                <Input
                  value={adminForm.taskTitle}
                  onChange={e => setAdminForm(f => ({ ...f, taskTitle: e.target.value }))}
                  placeholder="أدخل عنوان المهمة..."
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                />
              </div>
              {/* Task Type */}
              <div>
                <Label className="text-slate-300 text-sm">نوع المهمة</Label>
                <Select value={adminForm.taskType} onValueChange={v => setAdminForm(f => ({ ...f, taskType: v as any }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="daily" className="text-white">يومية</SelectItem>
                    <SelectItem value="weekly" className="text-white">أسبوعية</SelectItem>
                    <SelectItem value="monthly" className="text-white">شهرية</SelectItem>
                    <SelectItem value="meeting" className="text-white">اجتماع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Category */}
              <div>
                <Label className="text-slate-300 text-sm">التصنيف</Label>
                <Select value={adminForm.category} onValueChange={v => setAdminForm(f => ({ ...f, category: v as any }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="crm_data" className="text-white">بيانات CRM</SelectItem>
                    <SelectItem value="financial_collection" className="text-white">تحصيل مالي</SelectItem>
                    <SelectItem value="operations" className="text-white">عمليات</SelectItem>
                    <SelectItem value="reporting" className="text-white">تقارير</SelectItem>
                    <SelectItem value="coordination" className="text-white">تنسيق</SelectItem>
                    <SelectItem value="meetings" className="text-white">اجتماعات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Date */}
              <div>
                <Label className="text-slate-300 text-sm">تاريخ التنفيذ *</Label>
                <Input
                  type="date"
                  value={adminForm.taskDate}
                  onChange={e => setAdminForm(f => ({ ...f, taskDate: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                />
              </div>
              {/* KPI Weight */}
              <div>
                <Label className="text-slate-300 text-sm">وزن KPI (%)</Label>
                <Input
                  type="number"
                  min="0" max="100"
                  value={adminForm.kpiWeight}
                  onChange={e => setAdminForm(f => ({ ...f, kpiWeight: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  placeholder="0"
                />
              </div>
              {/* Notes */}
              <div>
                <Label className="text-slate-300 text-sm">ملاحظات</Label>
                <Textarea
                  value={adminForm.notes}
                  onChange={e => setAdminForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="أدخل ملاحظات إضافية..."
                  className="bg-slate-800 border-slate-600 text-white mt-1 resize-none"
                  rows={3}
                />
              </div>
            </>
          ) : (
            /* ── Sales Engineer Form ── */
            <>
          {/* Title */}
          <div>
            <Label className="text-slate-300 text-sm">عنوان المهمة *</Label>
            <Input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="أدخل عنوان المهمة..."
              className="bg-slate-800 border-slate-600 text-white mt-1"
            />
          </div>

          {/* Task Type */}
          <div>
            <Label className="text-slate-300 text-sm">نوع المهمة</Label>
            <Select value={form.taskType || 'all'} onValueChange={v => set('taskType', v === 'all' ? '' : v)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="اختر نوع المهمة..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-slate-400">— اختر نوع المهمة —</SelectItem>
                {TASK_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Engineer */}
          <div>
            <Label className="text-slate-300 text-sm">المهندس المسؤول *</Label>
            <Select
              value={form.engineerId || 'none'}
              onValueChange={v => set('engineerId', v === 'none' ? '' : v)}
              disabled={!isAdmin && !!currentEngineerId}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="اختر المهندس..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="none" className="text-slate-400">— اختر المهندس —</SelectItem>
                {engineers.map(e => (
                  <SelectItem key={e.id} value={String(e.id)} className="text-white">{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div>
            <Label className="text-slate-300 text-sm">العميل المرتبط</Label>
            <Input
              value={form.clientName}
              onChange={e => set('clientName', e.target.value)}
              placeholder="اسم العميل (اختياري)..."
              className="bg-slate-800 border-slate-600 text-white mt-1"
            />
          </div>

          {/* Date */}
          <div>
            <Label className="text-slate-300 text-sm">تاريخ التنفيذ *</Label>
            <Input
              type="date"
              value={form.taskDate}
              onChange={e => set('taskDate', e.target.value)}
              className="bg-slate-800 border-slate-600 text-white mt-1"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-sm">وقت البداية</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">وقت النهاية</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
          </div>

          {/* Duration display */}
          {form.startTime && form.endTime && (
            <div className="text-xs text-slate-400 text-center">
              المدة: {Math.max(0, timeToMinutes(form.endTime) - timeToMinutes(form.startTime))} دقيقة
            </div>
          )}

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-sm">الأولوية</Label>
              <Select value={form.priority || 'none'} onValueChange={v => set('priority', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue placeholder="اختر الأولوية..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="none" className="text-slate-400">— اختر —</SelectItem>
                  <SelectItem value="urgent" className="text-red-400">عاجلة 🔴</SelectItem>
                  <SelectItem value="high" className="text-orange-400">عالية 🟠</SelectItem>
                  <SelectItem value="medium" className="text-yellow-400">متوسطة 🟡</SelectItem>
                  <SelectItem value="low" className="text-green-400">منخفضة 🟢</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-sm">الحالة</Label>
              <Select value={form.status} onValueChange={v => set('status', v as TaskStatus)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="planned" className="text-blue-400">مخططة</SelectItem>
                  <SelectItem value="completed" className="text-green-400">منجزة</SelectItem>
                  <SelectItem value="delayed" className="text-red-400">متأخرة</SelectItem>
                  <SelectItem value="not_done" className="text-gray-400">لم تُنفذ</SelectItem>
                  <SelectItem value="client_delay" className="text-yellow-400">تأخير عميل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reminder */}
          <div>
            <Label className="text-slate-300 text-sm flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" /> تنبيه قبل المهمة
            </Label>
            <Select value={form.reminderMinutes} onValueChange={v => set('reminderMinutes', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="0" className="text-slate-400">بدون تنبيه</SelectItem>
                <SelectItem value="15" className="text-white">قبل 15 دقيقة</SelectItem>
                <SelectItem value="30" className="text-white">قبل 30 دقيقة</SelectItem>
                <SelectItem value="60" className="text-white">قبل ساعة</SelectItem>
                <SelectItem value="120" className="text-white">قبل ساعتين</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-slate-300 text-sm">ملاحظات</Label>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="أدخل ملاحظات إضافية..."
              className="bg-slate-800 border-slate-600 text-white mt-1 resize-none"
              rows={3}
             />
          </div>
            </>
          )}
        </div>
        <DialogFooter className="gap-2 flex-row-reverse">
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isEdit ? 'حفظ التعديلات' : 'إضافة المهمة'}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Detail Modal ──────────────────────────────────────────────────────────
function TaskDetailModal({
  task, open, onClose, onEdit, onDelete, canEdit,
}: {
  task: CalendarTask | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  if (!task) return null;
  const cfg = getTaskColor(task);
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['planned'];
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['medium'];
  const d = safeDate(task.taskDate);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white" dir="rtl">
        <DialogHeader>
          <div className={`flex items-center gap-2 p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
            <span className={`text-sm font-semibold ${cfg.color}`}>{task.title}</span>
            {task.isCritical === 1 && <Badge className="bg-red-600 text-white text-xs">حرج</Badge>}
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-400 text-xs mb-1">الحالة</div>
              <div className={`flex items-center gap-1.5 ${statusCfg.color}`}>
                <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-400 text-xs mb-1">الأولوية</div>
              <div className={priorityCfg.color}>{priorityCfg.label}</div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-2">
            <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><User className="w-3 h-3" /> المهندس</div>
            <div className="text-white">{task.engineerName}</div>
          </div>

          {task.clientName && (
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-400 text-xs mb-1">العميل</div>
              <div className="text-white">{task.clientName}</div>
            </div>
          )}

          <div className="bg-slate-800 rounded-lg p-2">
            <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> التاريخ</div>
            <div className="text-white">{d ? formatDateAr(d) : '—'}</div>
          </div>

          {(task.startTime || task.endTime) && (
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> الوقت</div>
              <div className="text-white">
                {task.startTime || '—'} {task.endTime ? `← ${task.endTime}` : ''}
                {task.startTime && task.endTime && (
                  <span className="text-slate-400 text-xs mr-2">
                    ({Math.max(0, timeToMinutes(task.endTime) - timeToMinutes(task.startTime))} دقيقة)
                  </span>
                )}
              </div>
            </div>
          )}

          {task.taskType && (
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> النوع</div>
              <div className={cfg.color}>{TASK_TYPE_CONFIG[task.taskType]?.label || task.taskType}</div>
            </div>
          )}

          {task.notes && (
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-400 text-xs mb-1">ملاحظات</div>
              <div className="text-slate-300 text-xs whitespace-pre-wrap">{task.notes}</div>
            </div>
          )}

          {task.reminderMinutes && task.reminderMinutes > 0 ? (
            <div className="bg-slate-800 rounded-lg p-2">
              <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Bell className="w-3 h-3" /> تنبيه</div>
              <div className="text-white text-xs">قبل {task.reminderMinutes} دقيقة</div>
            </div>
          ) : null}
          {/* Admin Sales specific info */}
          {task.isAdminSalesTask && (
            <>
              {task.adminCategory && (
                <div className="bg-slate-800 rounded-lg p-2">
                  <div className="text-slate-400 text-xs mb-1">تصنيف Admin Sales</div>
                  <div className="text-violet-300">{TASK_TYPE_CONFIG[task.adminCategory]?.label || task.adminCategory}</div>
                </div>
              )}
              {task.kpiWeight && task.kpiWeight > 0 ? (
                <div className="bg-slate-800 rounded-lg p-2">
                  <div className="text-slate-400 text-xs mb-1">وزن KPI</div>
                  <div className="text-emerald-300">{task.kpiWeight}%</div>
                </div>
              ) : null}
              {task.kpiImpact && (
                <div className="bg-slate-800 rounded-lg p-2">
                  <div className="text-slate-400 text-xs mb-1">تأثير KPI</div>
                  <div className="text-yellow-300 text-xs">{task.kpiImpact}</div>
                </div>
              )}
            </>
          )}
        </div>

        {canEdit && (
          <DialogFooter className="gap-2 flex-row-reverse">
            <Button onClick={onEdit} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
              <Edit2 className="w-3.5 h-3.5" /> تعديل
            </Button>
            <Button onClick={onDelete} size="sm" variant="destructive" className="gap-1">
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </Button>
            <Button variant="outline" onClick={onClose} size="sm" className="border-slate-600 text-slate-300">
              إغلاق
            </Button>
          </DialogFooter>
        )}
        {!canEdit && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} size="sm" className="border-slate-600 text-slate-300">
              إغلاق
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Day View ───────────────────────────────────────────────────────────────────
function DayView({
  date, tasks, onTimeSlotClick, onTaskClick, isAdmin,
}: {
  date: Date;
  tasks: CalendarTask[];
  onTimeSlotClick: (date: string, time: string) => void;
  onTaskClick: (task: CalendarTask) => void;
  isAdmin: boolean;
}) {
  const dateStr = toDateStr(date);
  const timedTasks = tasks.filter(t => t.startTime);
  const untimedTasks = tasks.filter(t => !t.startTime);

  function getTaskTop(startTime: string): number {
    const mins = timeToMinutes(startTime) - 8 * 60;
    return Math.max(0, (mins / 60) * 64);
  }

  function getTaskHeight(startTime: string, endTime?: string | null): number {
    if (!endTime) return 64;
    const duration = timeToMinutes(endTime) - timeToMinutes(startTime);
    return Math.max(32, (duration / 60) * 64);
  }

  return (
    <div className="flex gap-3 h-full">
      {/* Time column */}
      <div className="w-16 flex-shrink-0">
        {HOURS.map(h => (
          <div key={h} className="h-16 flex items-start justify-end pr-2 pt-1">
            <span className="text-xs text-slate-500">{h}:00</span>
          </div>
        ))}
      </div>

      {/* Events column */}
      <div className="flex-1 relative border-r border-slate-700/50">
        {/* Hour lines */}
        {HOURS.map(h => (
          <DroppableCell
            key={h}
            id={`${dateStr}-${h}:00`}
            className="h-16 border-t border-slate-700/30 hover:bg-slate-800/30 cursor-pointer"
            onClick={() => onTimeSlotClick(dateStr, `${String(h).padStart(2, '0')}:00`)}
          >
            <div className="h-full" />
          </DroppableCell>
        ))}

        {/* Timed tasks (absolute positioned) */}
        {timedTasks.map(task => (
          <div
            key={task.id}
            className="absolute left-1 right-1 z-10"
            style={{
              top: getTaskTop(task.startTime!),
              height: getTaskHeight(task.startTime!, task.endTime),
              minHeight: 28,
            }}
          >
            <DraggableTask task={task} onClick={onTaskClick} />
          </div>
        ))}
      </div>

      {/* Untimed tasks sidebar */}
      {untimedTasks.length > 0 && (
        <div className="w-48 flex-shrink-0 space-y-1 overflow-y-auto">
          <div className="text-xs text-slate-400 mb-2 font-medium">بدون وقت محدد</div>
          {untimedTasks.map(task => (
            <DraggableTask key={task.id} task={task} compact onClick={onTaskClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Week View ──────────────────────────────────────────────────────────────────
function WeekView({
  weekDays, tasksByDate, onTimeSlotClick, onTaskClick,
}: {
  weekDays: Date[];
  tasksByDate: Map<string, CalendarTask[]>;
  onTimeSlotClick: (date: string, time: string) => void;
  onTaskClick: (task: CalendarTask) => void;
}) {
  const today = toDateStr(new Date());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <div className="w-16" />
          {weekDays.map(d => {
            const ds = toDateStr(d);
            const isToday = ds === today;
            return (
              <div key={ds} className={`p-2 text-center border-r border-slate-700 ${isToday ? 'bg-blue-900/30' : ''}`}>
                <div className="text-xs text-slate-400">{d.toLocaleDateString('ar-EG', { weekday: 'short' })}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-blue-400' : 'text-white'}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Time rows */}
        {HOURS.map(h => (
          <div key={h} className="grid grid-cols-8 border-t border-slate-700/30">
            <div className="w-16 flex items-start justify-end pr-2 pt-1 h-16">
              <span className="text-xs text-slate-500">{h}:00</span>
            </div>
            {weekDays.map(d => {
              const ds = toDateStr(d);
              const dayTasks = (tasksByDate.get(ds) || []).filter(t =>
                t.startTime && Math.floor(timeToMinutes(t.startTime) / 60) === h
              );
              return (
                <DroppableCell
                  key={ds}
                  id={`${ds}-${h}:00`}
                  className="border-r border-slate-700/30 h-16 p-0.5 space-y-0.5 overflow-hidden hover:bg-slate-800/20 cursor-pointer"
                  onClick={() => onTimeSlotClick(ds, `${String(h).padStart(2, '0')}:00`)}
                >
                  {dayTasks.map(task => (
                    <DraggableTask key={task.id} task={task} compact onClick={onTaskClick} />
                  ))}
                </DroppableCell>
              );
            })}
          </div>
        ))}

        {/* All-day / untimed row */}
        <div className="grid grid-cols-8 border-t-2 border-slate-600 bg-slate-800/30">
          <div className="w-16 flex items-center justify-end pr-2">
            <span className="text-xs text-slate-400">طوال اليوم</span>
          </div>
          {weekDays.map(d => {
            const ds = toDateStr(d);
            const untimedTasks = (tasksByDate.get(ds) || []).filter(t => !t.startTime);
            return (
              <DroppableCell
                key={ds}
                id={`${ds}-allday`}
                className="border-r border-slate-700/30 p-1 min-h-[40px] space-y-0.5"
                onClick={() => onTimeSlotClick(ds, '')}
              >
                {untimedTasks.slice(0, 3).map(task => (
                  <DraggableTask key={task.id} task={task} compact onClick={onTaskClick} />
                ))}
                {untimedTasks.length > 3 && (
                  <div className="text-xs text-slate-400 text-center">+{untimedTasks.length - 3}</div>
                )}
              </DroppableCell>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Month View ─────────────────────────────────────────────────────────────────
function MonthView({
  year, month, tasksByDate, onDayClick, onTaskClick,
}: {
  year: number;
  month: number;
  tasksByDate: Map<string, CalendarTask[]>;
  onDayClick: (date: string) => void;
  onTaskClick: (task: CalendarTask) => void;
}) {
  const cells = getMonthDays(year, month);
  const today = toDateStr(new Date());
  const weekDayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-slate-700 mb-1">
        {weekDayNames.map(d => (
          <div key={d} className="p-2 text-center text-xs text-slate-400 font-medium">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-px bg-slate-700/30">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="bg-slate-900/50 min-h-[100px]" />;
          const ds = toDateStr(d);
          const dayTasks = tasksByDate.get(ds) || [];
          const isToday = ds === today;

          return (
            <DroppableCell
              key={ds}
              id={`${ds}-allday`}
              className={`bg-slate-900 min-h-[100px] p-1 cursor-pointer hover:bg-slate-800/50 ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
              onClick={() => onDayClick(ds)}
            >
              <div className={`text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full
                ${isToday ? 'bg-blue-500 text-white' : 'text-slate-300'}`}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 4).map(task => (
                  <div
                    key={task.id}
                    onClick={e => { e.stopPropagation(); onTaskClick(task); }}
                  >
                    <TaskBlock task={task} compact />
                  </div>
                ))}
                {dayTasks.length > 4 && (
                  <div className="text-xs text-slate-400 text-center py-0.5">
                    +{dayTasks.length - 4} مزيد
                  </div>
                )}
              </div>
            </DroppableCell>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timeline View ──────────────────────────────────────────────────────────────
function TimelineView({
  days, onTaskClick, onDayClick,
}: {
  days: Array<{ date: string; dayNum: number; dayName: string; isToday: boolean; tasks: CalendarTask[] }>;
  onTaskClick: (task: CalendarTask) => void;
  onDayClick: (date: string) => void;
}) {
  return (
    <div className="space-y-2">
      {days.map(day => (
        <div key={day.date} className={`rounded-lg border ${day.isToday ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700 bg-slate-800/30'}`}>
          <div
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-700/20"
            onClick={() => onDayClick(day.date)}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
              ${day.isToday ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
              {day.dayNum}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{day.dayName}</div>
              <div className="text-xs text-slate-400">{day.date}</div>
            </div>
            <div className="flex gap-2 mr-auto flex-wrap">
              {day.tasks.length === 0 ? (
                <span className="text-xs text-slate-500">لا توجد مهام</span>
              ) : (
                <>
                  <Badge className="bg-slate-700 text-slate-300 text-xs">{day.tasks.length} مهمة</Badge>
                  {day.tasks.filter(t => t.status === 'completed').length > 0 && (
                    <Badge className="bg-green-900/50 text-green-400 text-xs">
                      {day.tasks.filter(t => t.status === 'completed').length} منجزة
                    </Badge>
                  )}
                  {day.tasks.filter(t => t.status === 'delayed').length > 0 && (
                    <Badge className="bg-red-900/50 text-red-400 text-xs">
                      {day.tasks.filter(t => t.status === 'delayed').length} متأخرة
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          {day.tasks.length > 0 && (
            <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {day.tasks.map(task => (
                <DraggableTask key={task.id} task={task} onClick={onTaskClick} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function InteractiveCalendar({ engineers, currentUserRole, currentEngineerId }: Props) {
  const isAdmin = currentUserRole === 'admin';
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterEngineerId, setFilterEngineerId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  // Modals
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: CalendarTask | null; defaultDate?: string; defaultStartTime?: string }>({ open: false });
  const [detailModal, setDetailModal] = useState<{ open: boolean; task: CalendarTask | null }>({ open: false, task: null });
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  // Drag
  const [activeTask, setActiveTask] = useState<CalendarTask | null>(null);

  // تحديد Role المهندس المختار لتحديد مصدر البيانات
  const queryEngineerId = filterEngineerId === 'all' ? undefined : Number(filterEngineerId);
  const selectedEngineerObj = filterEngineerId === 'all' ? null : engineers.find(e => e.id === queryEngineerId);
  const isAdminSalesMode = selectedEngineerObj?.role === 'admin_sales';

  // الشهر الحالي للفلتر
  const currentMonth = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentDate]);

  // Query للمهندسين العاديين (Sales Engineers / Specialists)
  const { data: salesData, isLoading: salesLoading, isError: salesError, refetch: salesRefetch } = trpc.tasks.calendarView.useQuery(
    { engineerId: queryEngineerId },
    { enabled: !isAdminSalesMode, refetchOnWindowFocus: false }
  );

  // Query للمهندسين الإداريين (Admin Sales)
  const { data: adminData, isLoading: adminLoading, isError: adminError, refetch: adminRefetch } = trpc.tasks.calendarViewAdmin.useQuery(
    { engineerId: queryEngineerId, month: currentMonth },
    { enabled: isAdminSalesMode, refetchOnWindowFocus: false }
  );

  // توحيد البيانات
  const data = isAdminSalesMode ? adminData : salesData;
  const isLoading = isAdminSalesMode ? adminLoading : salesLoading;
  const isError = isAdminSalesMode ? adminError : salesError;
  const refetch = isAdminSalesMode ? adminRefetch : salesRefetch;

  const moveMutation = trpc.tasks.moveTask.useMutation({
    onSuccess: () => { toast.success('تم نقل المهمة'); refetch(); },
    onError: (e) => toast.error(e.message || 'خطأ في نقل المهمة'),
  });
  const moveAdminMutation = trpc.adminSalesTasks.updateFull.useMutation({
    onSuccess: () => { toast.success('تم نقل مهمة Admin Sales'); refetch(); },
    onError: (e) => toast.error(e.message || 'خطأ في نقل المهمة'),
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => { toast.success('تم حذف المهمة'); refetch(); detailModal.open && setDetailModal({ open: false, task: null }); },
    onError: (e) => toast.error(e.message || 'خطأ في الحذف'),
  });

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Process data
  const allTasks = useMemo((): CalendarTask[] => {
    if (!data?.days) return [];
    const tasks: CalendarTask[] = [];
    for (const day of data.days) {
      for (const t of day.tasks) {
        if (!t.id || !t.title) continue;
        if (filterStatus !== 'all' && t.status !== filterStatus) continue;
        if (filterType !== 'all' && t.taskType !== filterType) continue;
        tasks.push(t as CalendarTask);
      }
    }
    return tasks;
  }, [data, filterStatus, filterType]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of allTasks) {
      const d = safeDate(task.taskDate);
      if (!d) continue;
      const key = toDateStr(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [allTasks]);

  // Navigation
  const navigate = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Handlers
  const handleTimeSlotClick = (date: string, time: string) => {
    setTaskModal({ open: true, defaultDate: date, defaultStartTime: time });
  };

  const handleDayClick = (date: string) => {
    setTaskModal({ open: true, defaultDate: date });
  };

  const handleTaskClick = (task: CalendarTask) => {
    setDetailModal({ open: true, task });
  };

  const handleEditTask = () => {
    if (detailModal.task) {
      setEditingTask(detailModal.task);
      setDetailModal({ open: false, task: null });
      setTaskModal({ open: true, task: detailModal.task });
    }
  };

  const handleDeleteTask = () => {
    if (!detailModal.task) return;
    if (!window.confirm('هل تريد حذف هذه المهمة؟')) return;
    if (detailModal.task.isAdminSalesTask) {
      // Admin Sales tasks: تحديث الحالة إلى not_done بدلاً من الحذف (للحفاظ على سجل KPI)
      moveAdminMutation.mutate({ id: detailModal.task.id, status: 'not_done' });
      toast.info('تم تحديث حالة المهمة إلى لم تُنفذ');
      setDetailModal({ open: false, task: null });
    } else {
      deleteMutation.mutate({ id: detailModal.task.id });
    }
  };

  const canEditTask = (task: CalendarTask) => {
    if (isAdmin) return true;
    return task.engineerId === currentEngineerId;
  };

  // Drag & Drop
  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as CalendarTask;
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !active.data.current?.task) return;

    const task = active.data.current.task as CalendarTask;
    const overId = String(over.id);

    // Parse drop target: "YYYY-MM-DD-HH:MM" or "YYYY-MM-DD-allday"
    const parts = overId.split('-');
    if (parts.length < 3) return;

    const newDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
    const timeStr = parts[3] || '';
    const newTime = timeStr === 'allday' ? undefined : timeStr;

    const currentDate = safeDate(task.taskDate);
    const currentDateStr = currentDate ? toDateStr(currentDate) : '';

    if (newDate === currentDateStr && newTime === (task.startTime || undefined)) return;

    if (task.isAdminSalesTask) {
      moveAdminMutation.mutate({ id: task.id, taskDate: newDate });
    } else {
      moveMutation.mutate({ id: task.id, newDate, newStartTime: newTime });
    }
  };

  // Header title
  const headerTitle = useMemo(() => {
    if (viewMode === 'day') return formatDateAr(currentDate);
    if (viewMode === 'week') {
      const days = getWeekDays(currentDate);
      return `${days[0].toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} — ${days[6].toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate]);

  const summary = data?.summary;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden" dir="rtl">
      {/* ── Top Bar ── */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-700 bg-slate-800/50">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-slate-400 hover:text-white text-xs px-2 h-8">
            اليوم
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)} className="text-slate-400 hover:text-white h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Title */}
        <h2 className="text-sm font-semibold text-white flex-1 min-w-0 truncate">{headerTitle}</h2>

        {/* View Switcher */}
        <div className="flex items-center gap-0.5 bg-slate-700/50 rounded-lg p-0.5">
          {([
            { id: 'day', icon: AlignLeft, label: 'يوم' },
            { id: 'week', icon: List, label: 'أسبوع' },
            { id: 'month', icon: LayoutGrid, label: 'شهر' },
            { id: 'timeline', icon: Calendar, label: 'جدول' },
          ] as const).map(v => (
            <Button
              key={v.id}
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(v.id)}
              className={`h-7 px-2 text-xs gap-1 ${viewMode === v.id ? 'bg-blue-600 text-white hover:bg-blue-600' : 'text-slate-400 hover:text-white'}`}
            >
              <v.icon className="w-3 h-3" />
              {v.label}
            </Button>
          ))}
        </div>

        {/* Add Button */}
        <Button
          size="sm"
          onClick={() => setTaskModal({ open: true, defaultDate: toDateStr(currentDate) })}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1 h-8"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة مهمة
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-700/50 bg-slate-800/30">
        {isAdmin && (
          <Select value={filterEngineerId} onValueChange={setFilterEngineerId}>
            <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-white w-36">
              <SelectValue placeholder="جميع المهندسين" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-slate-300 text-xs">جميع المهندسين</SelectItem>
              {engineers.map(e => (
                <SelectItem key={e.id} value={String(e.id)} className="text-white text-xs">{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-white w-32">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-slate-300 text-xs">جميع الحالات</SelectItem>
            <SelectItem value="planned" className="text-blue-400 text-xs">مخططة</SelectItem>
            <SelectItem value="completed" className="text-green-400 text-xs">منجزة</SelectItem>
            <SelectItem value="delayed" className="text-red-400 text-xs">متأخرة</SelectItem>
            <SelectItem value="not_done" className="text-gray-400 text-xs">لم تُنفذ</SelectItem>
            <SelectItem value="client_delay" className="text-yellow-400 text-xs">تأخير عميل</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-white w-36">
            <SelectValue placeholder="جميع الأنواع" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-slate-300 text-xs">جميع الأنواع</SelectItem>
            {isAdminSalesMode ? (
              // Admin Sales task types
              <>
                <SelectItem value="daily" className="text-violet-300 text-xs">مهام يومية</SelectItem>
                <SelectItem value="weekly" className="text-indigo-300 text-xs">مهام أسبوعية</SelectItem>
                <SelectItem value="monthly" className="text-fuchsia-300 text-xs">مهام شهرية</SelectItem>
                <SelectItem value="meeting" className="text-rose-300 text-xs">اجتماعات</SelectItem>
              </>
            ) : (
              // Sales Engineer / Specialist task types
              TASK_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-white text-xs">{t.label}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {/* Admin Sales mode indicator */}
        {isAdminSalesMode && (
          <Badge className="bg-violet-900/50 text-violet-300 text-xs h-6 border border-violet-700">
            📊 تقويم Admin Sales
          </Badge>
        )}

        {/* Summary badges */}
        {summary && (
          <div className="flex gap-1.5 flex-wrap mr-auto">
            <Badge className="bg-slate-700 text-slate-300 text-xs h-6">{summary.total} إجمالي</Badge>
            <Badge className="bg-green-900/50 text-green-400 text-xs h-6">{summary.completed} منجزة</Badge>
            <Badge className="bg-red-900/50 text-red-400 text-xs h-6">{summary.delayed} متأخرة</Badge>
            <Badge className="bg-blue-900/50 text-blue-400 text-xs h-6">{summary.planned} مخططة</Badge>
            <Badge className="bg-slate-700 text-white text-xs h-6 font-bold">{('completionRate' in summary ? summary.completionRate : 0)}%</Badge>
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-7 w-7 text-slate-400 hover:text-white">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading && (
          <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جاري تحميل التقويم...</span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p>حدث خطأ في تحميل البيانات</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-600 text-slate-300 gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> إعادة المحاولة
            </Button>
          </div>
        )}

        {!isLoading && !isError && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {viewMode === 'day' && (
              <DayView
                date={currentDate}
                tasks={tasksByDate.get(toDateStr(currentDate)) || []}
                onTimeSlotClick={handleTimeSlotClick}
                onTaskClick={handleTaskClick}
                isAdmin={isAdmin}
              />
            )}

            {viewMode === 'week' && (
              <WeekView
                weekDays={getWeekDays(currentDate)}
                tasksByDate={tasksByDate}
                onTimeSlotClick={handleTimeSlotClick}
                onTaskClick={handleTaskClick}
              />
            )}

            {viewMode === 'month' && (
              <MonthView
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                tasksByDate={tasksByDate}
                onDayClick={handleDayClick}
                onTaskClick={handleTaskClick}
              />
            )}

            {viewMode === 'timeline' && (
              <TimelineView
                days={data?.days?.map(d => ({
                  ...d,
                  tasks: d.tasks.filter(t => {
                    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
                    if (filterType !== 'all' && t.taskType !== filterType) return false;
                    if (filterEngineerId !== 'all' && t.engineerId !== Number(filterEngineerId)) return false;
                    return true;
                  }) as CalendarTask[],
                })) || []}
                onTaskClick={handleTaskClick}
                onDayClick={handleDayClick}
              />
            )}

            {/* Drag Overlay */}
            <DragOverlay>
              {activeTask && (
                <div className="opacity-90 rotate-2 shadow-2xl">
                  <TaskBlock task={activeTask} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {!isLoading && !isError && allTasks.length === 0 && data && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-500">
            <Calendar className="w-8 h-8" />
            <p className="text-sm">لا توجد مهام في هذه الفترة</p>
            <Button
              size="sm"
              onClick={() => setTaskModal({ open: true, defaultDate: toDateStr(currentDate) })}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1 mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة أول مهمة
            </Button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <TaskModal
        open={taskModal.open}
        onClose={() => { setTaskModal({ open: false }); setEditingTask(null); }}
        task={taskModal.task}
        defaultDate={taskModal.defaultDate}
        defaultStartTime={taskModal.defaultStartTime}
        engineers={engineers}
        onSaved={() => refetch()}
        currentUserRole={currentUserRole}
        currentEngineerId={currentEngineerId}
        isAdminSalesMode={isAdminSalesMode}
        adminSalesEngineerId={isAdminSalesMode ? queryEngineerId : undefined}
      />

      <TaskDetailModal
        task={detailModal.task}
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, task: null })}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        canEdit={detailModal.task ? canEditTask(detailModal.task) : false}
      />
    </div>
  );
}
