import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker, getCurrentMonthFilter, type DateFilter } from "@/components/DateRangePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MapPin, CheckCircle, Clock, XCircle, Star, Plus, AlertTriangle,
  Upload, Users, DollarSign, BarChart3, Calendar, RefreshCw,
  Trash2, CreditCard, Bell, Activity, TrendingUp, Eye, AlertCircle
} from "lucide-react";
import { DeleteConfirmDialog, type DeleteReason } from "@/components/DeleteConfirmDialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const now = new Date();
const TODAY = now.toISOString().split('T')[0];

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'مجدولة', completed: 'مكتملة', delayed: 'متأخرة',
  cancelled: 'ملغاة', rescheduled: 'مؤجلة'
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  delayed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rescheduled: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};
const BOOKING_STATUS_LABELS: Record<string, string> = {
  booked: 'محجوزة', distributed: 'موزعة', distribution_delayed: 'تأخير توزيع'
};
const CONFIRMATION_LABELS: Record<string, string> = {
  confirmed_same_day: 'تأكيد نفس اليوم', confirmed_late: 'تأكيد متأخر', not_confirmed: 'لم يتأكد'
};
const UPLOAD_LABELS: Record<string, string> = {
  uploaded_same_day: 'رفع نفس اليوم', uploaded_late: 'رفع متأخر', not_uploaded: 'لم يُرفع'
};

function KpiCard({ label, value, icon: Icon, color, sub }: { label: string; value: number | string; icon: any; color: string; sub?: string }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const clr = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${clr}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ─── Full Update Dialog ────────────────────────────────────────────────────────
function FullUpdateDialog({ visit, onClose, onSuccess }: { visit: any; onClose: () => void; onSuccess: () => void }) {
  // تحويل scheduledAt إلى صيغة datetime-local
  const toDatetimeLocal = (d: any) => {
    if (!d) return '';
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };
  const [form, setForm] = useState({
    status: visit.status ?? 'scheduled',
    bookingStatus: visit.bookingStatus ?? 'booked',
    confirmationStatus: visit.confirmationStatus ?? 'not_confirmed',
    confirmationDelayHours: String(visit.confirmationDelayHours ?? 0),
    uploadStatus: visit.uploadStatus ?? 'not_uploaded',
    quality: visit.quality ?? 'pending',
    delayMinutes: String(visit.delayMinutes ?? 0),
    feeAmount: String(visit.feeAmount ?? 0),
    feeCollected: visit.feeCollected ? '1' : '0',
    paymentScreenshotUrl: visit.paymentScreenshotUrl ?? '',
    debtFollowedUp: visit.debtFollowedUp ? '1' : '0',
    notes: visit.notes ?? '',
    scheduledAt: toDatetimeLocal(visit.scheduledAt),
  });

  const updateMutation = trpc.visits.updateFull.useMutation({
    onSuccess: () => { toast.success('تم تحديث المعاينة'); onSuccess(); onClose(); },
    onError: () => toast.error('حدث خطأ'),
  });

  const handleSave = () => {
    if (form.feeCollected === '1' && !form.paymentScreenshotUrl.trim()) {
      return toast.error('يجب إرفاق رابط Screenshot التحويل عند تسجيل الدفع');
    }
    updateMutation.mutate({
      id: visit.id,
      status: form.status as any,
      bookingStatus: form.bookingStatus as any,
      confirmationStatus: form.confirmationStatus as any,
      confirmationDelayHours: parseInt(form.confirmationDelayHours) || 0,
      uploadStatus: form.uploadStatus as any,
      quality: form.quality as any,
      delayMinutes: parseInt(form.delayMinutes) || 0,
      feeAmount: parseFloat(form.feeAmount) || 0,
      feeCollected: form.feeCollected === '1',
      paymentScreenshotUrl: form.paymentScreenshotUrl || undefined,
      debtFollowedUp: form.debtFollowedUp === '1',
      notes: form.notes || undefined,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            تحديث شامل — {visit.clientName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Date */}
          <div className="p-3 rounded-xl border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📅 تاريخ المعاينة</p>
            <div>
              <Label className="text-xs">تاريخ ووقت المعاينة</Label>
              <Input type="datetime-local" className="h-8 text-sm" value={form.scheduledAt}
                onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
            </div>
          </div>
          {/* Booking */}
          <div className="p-3 rounded-xl border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📋 الحجز والتوزيع</p>
            <div>
              <Label className="text-xs">حالة الحجز</Label>
              <Select value={form.bookingStatus} onValueChange={v => setForm(p => ({ ...p, bookingStatus: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="booked">محجوزة</SelectItem>
                  <SelectItem value="distributed">موزعة</SelectItem>
                  <SelectItem value="distribution_delayed">تأخير في التوزيع</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Confirmation */}
          <div className="p-3 rounded-xl border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">✅ التأكيد</p>
            <div>
              <Label className="text-xs">حالة التأكيد</Label>
              <Select value={form.confirmationStatus} onValueChange={v => setForm(p => ({ ...p, confirmationStatus: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed_same_day">تم التأكيد نفس اليوم ✓</SelectItem>
                  <SelectItem value="confirmed_late">تم التأكيد متأخر ⏰</SelectItem>
                  <SelectItem value="not_confirmed">لم يتم التأكيد ✗</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.confirmationStatus === 'confirmed_late' && (
              <div>
                <Label className="text-xs">ساعات التأخير</Label>
                <Input type="number" className="h-8 text-sm" value={form.confirmationDelayHours}
                  onChange={e => setForm(p => ({ ...p, confirmationDelayHours: e.target.value }))} />
              </div>
            )}
          </div>

          {/* Execution */}
          <div className="p-3 rounded-xl border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🏃 التنفيذ</p>
            <div>
              <Label className="text-xs">حالة التنفيذ</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">مجدولة</SelectItem>
                  <SelectItem value="completed">تمت ✓</SelectItem>
                  <SelectItem value="delayed">متأخرة ⏰</SelectItem>
                  <SelectItem value="cancelled">ملغية ✗</SelectItem>
                  <SelectItem value="rescheduled">مؤجلة 🔄</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === 'delayed' && (
              <div>
                <Label className="text-xs">دقائق التأخير</Label>
                <Input type="number" className="h-8 text-sm" value={form.delayMinutes}
                  onChange={e => setForm(p => ({ ...p, delayMinutes: e.target.value }))} />
              </div>
            )}
          </div>

          {/* Upload */}
          <div className="p-3 rounded-xl border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📤 الرفع والتسليم</p>
            <div>
              <Label className="text-xs">حالة الرفع</Label>
              <Select value={form.uploadStatus} onValueChange={v => setForm(p => ({ ...p, uploadStatus: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uploaded_same_day">تم الرفع نفس اليوم ✓</SelectItem>
                  <SelectItem value="uploaded_late">تم الرفع متأخر ⏰</SelectItem>
                  <SelectItem value="not_uploaded">لم يتم الرفع ✗</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quality */}
          <div className="p-3 rounded-xl border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">⭐ الجودة</p>
            <div>
              <Label className="text-xs">جودة المعاينة</Label>
              <Select value={form.quality} onValueChange={v => setForm(p => ({ ...p, quality: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="successful">ناجحة ✓</SelectItem>
                  <SelectItem value="with_issues">بها مشاكل ⚠</SelectItem>
                  <SelectItem value="repeated">مكررة 🔄</SelectItem>
                  <SelectItem value="design_rejected">مرفوضة ✗</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial */}
          <div className="p-3 rounded-xl border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">💰 المالي</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">رسوم المعاينة (ج.م)</Label>
                <Input type="number" className="h-8 text-sm" value={form.feeAmount}
                  onChange={e => setForm(p => ({ ...p, feeAmount: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">حالة الدفع</Label>
                <Select value={form.feeCollected} onValueChange={v => setForm(p => ({ ...p, feeCollected: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">لم يتم الدفع ✗</SelectItem>
                    <SelectItem value="1">تم الدفع ✓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.feeCollected === '1' && (
              <div>
                <Label className="text-xs">رابط Screenshot التحويل (إجباري) *</Label>
                <Input className="h-8 text-sm" value={form.paymentScreenshotUrl}
                  onChange={e => setForm(p => ({ ...p, paymentScreenshotUrl: e.target.value }))}
                  placeholder="https://..." />
                <p className="text-xs text-amber-600 mt-1">⚠ لا يمكن تسجيل الدفع بدون رابط Screenshot</p>
              </div>
            )}
            {form.feeCollected === '0' && parseFloat(form.feeAmount) > 0 && (
              <div>
                <Label className="text-xs">متابعة المديونية</Label>
                <Select value={form.debtFollowedUp} onValueChange={v => setForm(p => ({ ...p, debtFollowedUp: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">لم تتم المتابعة</SelectItem>
                    <SelectItem value="1">تمت المتابعة ✓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">ملاحظات</Label>
            <Textarea className="text-sm resize-none" rows={2} value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="ملاحظات إضافية..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التحديث'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Visit Delete Confirm (using shared DeleteConfirmDialog) ───────────────────────────────────────────────────────────────────────────────────
function VisitDeleteConfirm({ deleteVisit, onClose, onSuccess }: {
  deleteVisit: { id: number; clientName: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const deleteMutation = trpc.softDelete.visit.useMutation({
    onSuccess: () => { toast.success('تم حذف المعاينة'); onSuccess(); onClose(); },
    onError: () => toast.error('حدث خطأ'),
  });
  return (
    <DeleteConfirmDialog
      open={deleteVisit !== null}
      onClose={onClose}
      onConfirm={(reason: DeleteReason, reasonCustom?: string) => {
        if (deleteVisit) deleteMutation.mutate({ id: deleteVisit.id, reason, reasonCustom });
      }}
      title="حذف المعاينة"
      description={`هل أنت متأكد من حذف معاينة ${deleteVisit?.clientName ?? ''}? سيتم إخفاؤها مع الاحتفاظ بالبيانات.`}
      isLoading={deleteMutation.isPending}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────────────────────────────
export default function VisitsModule() {
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("daily");
  const [updateVisit, setUpdateVisit] = useState<any | null>(null);
  const [deleteVisit, setDeleteVisit] = useState<{ id: number; clientName: string } | null>(null);
  const [newVisit, setNewVisit] = useState({
    engineerId: '', clientName: '', clientPhone: '', address: '', scheduledAt: '', feeAmount: ''
  });

  const utils = trpc.useUtils();
  const [dateFilter, setDateFilter] = useState<DateFilter>(getCurrentMonthFilter());
  const YEAR = dateFilter.mode === 'month' ? dateFilter.year : dateFilter.startDate.getFullYear();
  const MONTH = dateFilter.mode === 'month' ? dateFilter.month : dateFilter.startDate.getMonth() + 1;
  const { data: stats } = trpc.visits.stats.useQuery({ year: YEAR, month: MONTH });
  // فلترة القائمة حسب الـ tab النشط - كل tab يستخدم filterType مختلف
  const listFilterType = useMemo(() => {
    if (activeTab === 'execution') return 'execution' as const;
    if (activeTab === 'upload') return 'upload' as const;
    if (activeTab === 'financial') return 'collection' as const;
    return 'booking' as const;
  }, [activeTab]);
  const { data: visitsData } = trpc.visits.list.useQuery({
    limit: 100,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    year: YEAR,
    month: MONTH,
    filterType: listFilterType,
  });
  const { data: engineers } = trpc.engineers.list.useQuery();
  const { data: alerts } = trpc.visits.alerts.useQuery({ year: YEAR, month: MONTH });
  const { data: debtVisits } = trpc.visits.debt.useQuery({ year: YEAR, month: MONTH });
  const { data: dailyTracking } = trpc.visits.dailyTracking.useQuery({ date: TODAY });
  const { data: adminKPI } = trpc.visits.adminSalesKPI.useQuery({ year: YEAR, month: MONTH });
  const { data: needingAction } = trpc.visits.needingAction.useQuery({ year: YEAR, month: MONTH });

  const invalidateAll = () => {
    utils.visits.list.invalidate();
    utils.visits.stats.invalidate();
    utils.visits.alerts.invalidate();
    utils.visits.debt.invalidate();
    utils.visits.dailyTracking.invalidate();
    utils.visits.adminSalesKPI.invalidate();
    utils.visits.needingAction.invalidate();
  };

  const createMutation = trpc.visits.create.useMutation({
    onSuccess: () => {
      toast.success('تم إضافة المعاينة');
      setShowAdd(false);
      setNewVisit({ engineerId: '', clientName: '', clientPhone: '', address: '', scheduledAt: '', feeAmount: '' });
      invalidateAll();
    },
    onError: () => toast.error('حدث خطأ أثناء الإضافة'),
  });

  const handleCreate = () => {
    if (!newVisit.engineerId || !newVisit.clientName || !newVisit.scheduledAt)
      return toast.error('يرجى ملء الحقول المطلوبة');
    createMutation.mutate({
      engineerId: parseInt(newVisit.engineerId),
      clientName: newVisit.clientName,
      clientPhone: newVisit.clientPhone || undefined,
      address: newVisit.address || undefined,
      scheduledAt: new Date(newVisit.scheduledAt),
      feeAmount: newVisit.feeAmount ? parseFloat(newVisit.feeAmount) : undefined,
    });
  };

  const alertsCount = (alerts?.notConfirmed?.length ?? 0) + (alerts?.notUploaded?.length ?? 0) + (alerts?.debt?.length ?? 0);

  const qualityPieData = stats ? [
    { name: 'ناجحة', value: stats.successful, fill: '#10b981' },
    { name: 'بها مشاكل', value: stats.withIssues, fill: '#f59e0b' },
    { name: 'مرفوضة', value: stats.designRejected, fill: '#ef4444' },
    { name: 'مكررة', value: stats.repeated, fill: '#8b5cf6' },
  ].filter(d => d.value > 0) : [];

  const activeVisits = useMemo(() =>
    (visitsData?.data ?? []).filter((v: any) =>
      !v.isDeleted &&
      (!searchQuery || v.clientName?.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [visitsData, searchQuery]
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المعاينات</h1>
          <p className="text-sm text-muted-foreground">نظام تشغيل يومي إلزامي — من الحجز حتى التحصيل</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateFilter} onChange={setDateFilter} />
          {alertsCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Bell className="w-3 h-3" />{alertsCount} تنبيه
            </Badge>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />إضافة معاينة
          </Button>
        </div>
      </div>

      {/* Stage-Based Smart Notifications */}
      {needingAction && needingAction.summary.total > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            تنبيهات المرحلة النشطة ({needingAction.summary.total} معاينة تحتاج إجراء)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {needingAction.summary.needUpload > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">{needingAction.summary.needUpload} معاينة</p>
                  <p className="text-[11px] text-muted-foreground">مطلوب رفع</p>
                </div>
              </div>
            )}
            {needingAction.summary.needConfirmation > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">{needingAction.summary.needConfirmation} معاينة</p>
                  <p className="text-[11px] text-muted-foreground">لم يتم تأكيدها</p>
                </div>
              </div>
            )}
            {needingAction.summary.needExecution > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Activity className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{needingAction.summary.needExecution} معاينة</p>
                  <p className="text-[11px] text-muted-foreground">في انتظار التنفيذ</p>
                </div>
              </div>
            )}
            {needingAction.summary.needCollection > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <DollarSign className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">{needingAction.summary.needCollection} معاينة</p>
                  <p className="text-[11px] text-muted-foreground">مطلوب تحصيل</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : needingAction && needingAction.summary.total === 0 ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">✓ جميع المعاينات النشطة مكتملة المراحل — لا يوجد إجراء مطلوب</p>
        </div>
      ) : null}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="إجمالي المعاينات" value={stats?.booked ?? 0} icon={MapPin} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <KpiCard label="مكتملة" value={stats?.completed ?? 0} icon={CheckCircle} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <KpiCard label="متأخرة" value={stats?.delayed ?? 0} icon={Clock} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <KpiCard label="لم يتأكد" value={alerts?.notConfirmed?.length ?? 0} icon={AlertTriangle} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        <KpiCard
          label="مديونية"
          value={`${(debtVisits ?? []).reduce((s: number, v: any) => s + (parseFloat(v.feeAmount) || 0), 0).toLocaleString('ar-EG')} ج.م`}
          icon={DollarSign}
          color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
        <KpiCard label="نسبة التحصيل" value={`${stats?.collectionRate ?? 0}%`} icon={TrendingUp} color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto gap-1 p-1">
          <TabsTrigger value="daily" className="text-xs py-1.5">📊 يومي</TabsTrigger>
          <TabsTrigger value="booking" className="text-xs py-1.5">📋 الحجز</TabsTrigger>
          <TabsTrigger value="confirmation" className="text-xs py-1.5">✅ التأكيد</TabsTrigger>
          <TabsTrigger value="execution" className="text-xs py-1.5">🏃 التنفيذ</TabsTrigger>
          <TabsTrigger value="upload" className="text-xs py-1.5">📤 الرفع</TabsTrigger>
          <TabsTrigger value="quality" className="text-xs py-1.5">⭐ الجودة</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs py-1.5">💰 المالي</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs py-1.5 relative">
            🔔 تنبيهات
            {alertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {alertsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 0. Daily Tracking */}
        <TabsContent value="daily" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              متابعة يومية إلزامية — Admin Sales KPI
            </h3>
            {adminKPI ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">أداء Admin Sales — المعاينات</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <ScoreBar label="التحديث اليومي" value={adminKPI.dailyUpdateScore} />
                    <ScoreBar label="متابعة التحصيل (المديونية)" value={adminKPI.debtFollowupScore} />
                    <ScoreBar label="سرعة التوزيع" value={adminKPI.distributionScore} />
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">الإجمالي</span>
                        <span className={`text-lg font-bold ${adminKPI.overallScore >= 80 ? 'text-emerald-600' : adminKPI.overallScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {adminKPI.overallScore}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">إحصائيات الشهر</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي المعاينات</span><span className="font-semibold">{adminKPI.totalVisits}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">معاينات بمديونية</span><span className="font-semibold text-red-600">{adminKPI.debtVisits}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">تمت متابعة المديونية</span><span className="font-semibold text-emerald-600">{adminKPI.followedUpDebt}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">لم تتم المتابعة</span><span className="font-semibold text-amber-600">{Math.max(0, (adminKPI.debtVisits ?? 0) - (adminKPI.followedUpDebt ?? 0))}</span></div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد بيانات KPI لهذا الشهر بعد</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 1. Booking */}
        <TabsContent value="booking" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-500" />الحجز والتوزيع
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="معاينات محجوزة" value={stats?.booked ?? 0} icon={Calendar} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <KpiCard label="معاينات موزعة" value={stats?.assigned ?? 0} icon={Users} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
              <KpiCard label="تأخير في التوزيع" value={stats?.assignedDelayCount ?? 0} icon={AlertTriangle} color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
            </div>
            {(stats?.assignedDelayCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm text-yellow-800 dark:text-yellow-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>يوجد {stats?.assignedDelayCount} معاينة تأخر توزيعها — خصم KPI على Admin Sales</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 2. Confirmation */}
        <TabsContent value="confirmation" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-yellow-500" />التأكيد — KPI المهندس
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="تأكيد نفس اليوم" value={stats?.confirmedSameDay ?? 0} icon={CheckCircle} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="تأكيد متأخر" value={stats?.confirmedLate ?? 0} icon={Clock} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="لم يتم التأكيد" value={stats?.notConfirmed ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">نسبة التأكيد الكلية</span>
                  <span className="text-xl font-bold text-yellow-600">{stats?.confirmationRate ?? 0}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${stats?.confirmationRate ?? 0}%` }} />
                </div>
                {(stats?.notConfirmed ?? 0) > 0 && (
                  <p className="text-xs text-red-600 mt-2">⚠️ {stats?.notConfirmed} معاينة لم يتم تأكيدها — خصم KPI على المهندس</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. Execution */}
        <TabsContent value="execution" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />التنفيذ — KPI المهندس
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="تمت" value={stats?.completed ?? 0} icon={CheckCircle} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="متأخرة" value={stats?.delayed ?? 0} icon={Clock} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="ملغية" value={stats?.cancelled ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <KpiCard label="مؤجلة" value={stats?.rescheduled ?? 0} icon={RefreshCw} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
              <KpiCard label="مجدولة" value={stats?.scheduled ?? 0} icon={Calendar} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
              <KpiCard label="نسبة الإتمام" value={`${stats?.completionRate ?? 0}%`} icon={TrendingUp} color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
            </div>
          </div>
        </TabsContent>

        {/* 4. Upload */}
        <TabsContent value="upload" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />الرفع والتسليم — KPI المهندس
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="رفع نفس اليوم" value={stats?.uploadedSameDay ?? 0} icon={Upload} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="رفع متأخر" value={stats?.uploadedLate ?? 0} icon={Clock} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="لم يُرفع" value={stats?.notUploaded ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">نسبة الرفع نفس اليوم</span>
                  <span className="text-xl font-bold text-blue-600">{stats?.uploadSameDayRate ?? 0}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats?.uploadSameDayRate ?? 0}%` }} />
                </div>
                {(stats?.notUploaded ?? 0) > 0 && (
                  <p className="text-xs text-red-600 mt-2">⚠️ {stats?.notUploaded} معاينة لم يتم رفعها — خصم KPI على المهندس</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. Quality */}
        <TabsContent value="quality" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-500" />جودة المعاينات
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="ناجحة" value={stats?.successful ?? 0} icon={Star} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="بها مشاكل" value={stats?.withIssues ?? 0} icon={AlertTriangle} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="مرفوضة" value={stats?.designRejected ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <KpiCard label="مكررة" value={stats?.repeated ?? 0} icon={RefreshCw} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
            </div>
            {qualityPieData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع جودة المعاينات</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={qualityPieData} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                          {qualityPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {qualityPieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.fill }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="font-semibold mr-auto">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 6. Financial */}
        <TabsContent value="financial" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-500" />المتابعة المالية والمديونية
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="إجمالي الرسوم" value={`${(stats?.totalFeeAmount ?? 0).toLocaleString('ar-EG')} ج.م`} icon={DollarSign} color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
              <KpiCard label="المحصّل" value={`${(stats?.feeCollectedAmount ?? 0).toLocaleString('ar-EG')} ج.م`} icon={CheckCircle} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="معاينات مدفوعة" value={stats?.feeCollectedCount ?? 0} icon={CreditCard} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="مديونية" value={stats?.feeNotCollectedCount ?? 0} icon={AlertTriangle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            </div>
            {(debtVisits?.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    قائمة المديونية ({debtVisits?.length} معاينة)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {debtVisits?.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                        <div>
                          <p className="text-sm font-medium">{v.clientName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(v.scheduledAt).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">{(parseFloat(v.feeAmount) || 0).toLocaleString('ar-EG')} ج.م</p>
                          <Badge variant="outline" className="text-xs">
                            {v.debtFollowedUp ? '✓ تمت المتابعة' : '⚠ لم تتم المتابعة'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 7. Alerts */}
        <TabsContent value="alerts" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />التنبيهات — تحتاج تدخل فوري
            </h3>
            {alertsCount === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="text-sm font-medium">لا توجد تنبيهات — كل شيء على ما يرام ✓</p>
              </div>
            ) : (
              <>
                {(alerts?.notConfirmed?.length ?? 0) > 0 && (
                  <Card className="border-orange-200 dark:border-orange-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-orange-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        معاينات لم يتم تأكيدها ({alerts?.notConfirmed?.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {alerts?.notConfirmed?.map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                            <span>{v.clientName}</span>
                            <span className="text-xs text-muted-foreground">{new Date(v.scheduledAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {(alerts?.notUploaded?.length ?? 0) > 0 && (
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-blue-600 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        معاينات لم يتم رفعها ({alerts?.notUploaded?.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {alerts?.notUploaded?.map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <span>{v.clientName}</span>
                            <span className="text-xs text-muted-foreground">{new Date(v.scheduledAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {(alerts?.debt?.length ?? 0) > 0 && (
                  <Card className="border-red-200 dark:border-red-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        معاينات بمديونية غير محصّلة ({alerts?.debt?.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {alerts?.debt?.map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <span>{v.clientName}</span>
                            <span className="font-semibold text-red-600">{(parseFloat(v.feeAmount) || 0).toLocaleString('ar-EG')} ج.م</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Visits List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />قائمة المعاينات
                <Badge variant="outline" className="text-xs font-normal">
                  {listFilterType === 'booking' ? 'حسب شهر الحجز' :
                   listFilterType === 'execution' ? 'حسب شهر التنفيذ' :
                   listFilterType === 'upload' ? 'حسب شهر الرفع' :
                   'حسب شهر التحصيل'}
                </Badge>
                <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {new Date(YEAR, MONTH - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                </Badge>
              </CardTitle>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="🔍 بحث باسم العميل..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeVisits.length > 0 ? activeVisits.map((visit: any) => (
              <div key={visit.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{visit.clientName}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[visit.status] ?? ''}`}>
                      {STATUS_LABELS[visit.status] ?? visit.status}
                    </Badge>
                    {visit.bookingStatus && visit.bookingStatus !== 'booked' && (
                      <Badge variant="outline" className="text-xs">
                        {BOOKING_STATUS_LABELS[visit.bookingStatus]}
                      </Badge>
                    )}
                    {visit.feeCollected ? (
                      <Badge className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">✓ مدفوع</Badge>
                    ) : parseFloat(visit.feeAmount) > 0 ? (
                      <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">⚠ مديونية</Badge>
                    ) : null}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {visit.address && <span>📍 {visit.address}</span>}
                    <span>📅 {new Date(visit.scheduledAt).toLocaleDateString('ar-EG')}</span>
                    {visit.feeAmount && parseFloat(visit.feeAmount) > 0 && (
                      <span className={visit.feeCollected ? 'text-teal-600' : 'text-red-500'}>
                        💰 {(parseFloat(visit.feeAmount) || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                    )}
                    {visit.confirmationStatus && visit.confirmationStatus !== 'not_confirmed' && (
                      <span className="text-emerald-600">✓ {CONFIRMATION_LABELS[visit.confirmationStatus]}</span>
                    )}
                    {visit.uploadStatus && visit.uploadStatus !== 'not_uploaded' && (
                      <span className="text-blue-600">📤 {UPLOAD_LABELS[visit.uploadStatus]}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                    onClick={() => setUpdateVisit(visit)}>
                    <Eye className="w-3 h-3" />تحديث
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteVisit({ id: visit.id, clientName: visit.clientName })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد معاينات لعرضها</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Visit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة معاينة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>المهندس *</Label>
              <Select value={newVisit.engineerId} onValueChange={v => setNewVisit(p => ({ ...p, engineerId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
                <SelectContent>
                  {engineers?.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>اسم العميل *</Label>
              <Input value={newVisit.clientName} onChange={e => setNewVisit(p => ({ ...p, clientName: e.target.value }))} placeholder="اسم العميل" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الهاتف</Label>
                <Input value={newVisit.clientPhone} onChange={e => setNewVisit(p => ({ ...p, clientPhone: e.target.value }))} placeholder="01x..." />
              </div>
              <div>
                <Label>موعد المعاينة *</Label>
                <Input type="datetime-local" value={newVisit.scheduledAt} onChange={e => setNewVisit(p => ({ ...p, scheduledAt: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={newVisit.address} onChange={e => setNewVisit(p => ({ ...p, address: e.target.value }))} placeholder="العنوان التفصيلي" />
            </div>
            <div>
              <Label>رسوم المعاينة (ج.م)</Label>
              <Input type="number" value={newVisit.feeAmount} onChange={e => setNewVisit(p => ({ ...p, feeAmount: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Update Dialog */}
      {updateVisit && (
        <FullUpdateDialog
          visit={updateVisit}
          onClose={() => setUpdateVisit(null)}
          onSuccess={invalidateAll}
        />
      )}

      {/* Delete Dialog */}
      <VisitDeleteConfirm
        deleteVisit={deleteVisit}
        onClose={() => setDeleteVisit(null)}
        onSuccess={invalidateAll}
      />
    </div>
  );
}
