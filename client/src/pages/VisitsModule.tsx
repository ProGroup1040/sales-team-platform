import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MapPin, CheckCircle, Clock, XCircle, Star, Plus, AlertTriangle,
  Upload, Users, DollarSign, BarChart3, Calendar, RefreshCw, Shield
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;

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

function RateCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-3xl font-bold" style={{ color }}>{value}%</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function VisitsModule() {
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [newVisit, setNewVisit] = useState({ engineerId: '', clientName: '', clientPhone: '', address: '', scheduledAt: '', feeAmount: '' });
  const [updateDialog, setUpdateDialog] = useState<{ id: number; status: string } | null>(null);
  const [updateQuality, setUpdateQuality] = useState('successful');
  const [updateDelayMinutes, setUpdateDelayMinutes] = useState('');

  const utils = trpc.useUtils();
  const { data: stats } = trpc.visits.stats.useQuery({ year: YEAR, month: MONTH });
  const { data: visitsData } = trpc.visits.list.useQuery({ limit: 30, status: filterStatus !== 'all' ? filterStatus : undefined });
  const { data: engineers } = trpc.engineers.list.useQuery();

  const createMutation = trpc.visits.create.useMutation({
    onSuccess: () => {
      toast.success('تم إضافة المعاينة');
      setShowAdd(false);
      setNewVisit({ engineerId: '', clientName: '', clientPhone: '', address: '', scheduledAt: '', feeAmount: '' });
      utils.visits.list.invalidate();
      utils.visits.stats.invalidate();
    },
    onError: () => toast.error('حدث خطأ أثناء الإضافة'),
  });

  const updateMutation = trpc.visits.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الحالة');
      setUpdateDialog(null);
      utils.visits.list.invalidate();
      utils.visits.stats.invalidate();
    },
    onError: () => toast.error('حدث خطأ'),
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
    });
  };

  const qualityPieData = stats ? [
    { name: 'ناجحة', value: stats.successful, fill: '#10b981' },
    { name: 'بها مشاكل', value: stats.withIssues, fill: '#f59e0b' },
    { name: 'مرفوضة', value: stats.designRejected, fill: '#ef4444' },
    { name: 'مكررة', value: stats.repeated, fill: '#8b5cf6' },
  ].filter(d => d.value > 0) : [];

  const executionBarData = stats ? [
    { name: 'مكتملة', value: stats.completed, fill: '#10b981' },
    { name: 'متأخرة', value: stats.delayed, fill: '#f59e0b' },
    { name: 'ملغاة', value: stats.cancelled, fill: '#ef4444' },
    { name: 'مؤجلة', value: stats.rescheduled, fill: '#8b5cf6' },
    { name: 'مجدولة', value: stats.scheduled, fill: '#6366f1' },
  ] : [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">موديول المعاينات</h1>
          <p className="text-sm text-muted-foreground">دورة العمل الكاملة — من الحجز حتى التسليم للتصميم</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />إضافة معاينة
        </Button>
      </div>

      {/* KPI Rates Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: 'نسبة التأكيد', value: stats?.confirmationRate ?? 0, color: '#6366f1' },
          { label: 'نسبة الإتمام', value: stats?.completionRate ?? 0, color: '#10b981' },
          { label: 'نسبة التأخير', value: stats?.delayRate ?? 0, color: '#f59e0b' },
          { label: 'رفع نفس اليوم', value: stats?.uploadSameDayRate ?? 0, color: '#3b82f6' },
          { label: 'نسبة الإلغاء', value: stats?.cancellationRate ?? 0, color: '#ef4444' },
          { label: 'نسبة التكرار', value: stats?.revisitRate ?? 0, color: '#8b5cf6' },
          { label: 'نسبة التحصيل', value: stats?.collectionRate ?? 0, color: '#14b8a6' },
        ].map(r => (
          <RateCard key={r.label} label={r.label} value={r.value} color={r.color} />
        ))}
      </div>

      {/* Tabs for 7 Stages */}
      <Tabs defaultValue="booking">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 h-auto gap-1 p-1">
          <TabsTrigger value="booking" className="text-xs py-1.5">📋 الحجز</TabsTrigger>
          <TabsTrigger value="confirmation" className="text-xs py-1.5">✅ التأكيد</TabsTrigger>
          <TabsTrigger value="execution" className="text-xs py-1.5">🏃 التنفيذ</TabsTrigger>
          <TabsTrigger value="upload" className="text-xs py-1.5">📤 الرفع</TabsTrigger>
          <TabsTrigger value="quality" className="text-xs py-1.5">⭐ الجودة</TabsTrigger>
          <TabsTrigger value="admin" className="text-xs py-1.5">🛡️ الأدمن</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs py-1.5">💰 المالي</TabsTrigger>
        </TabsList>

        {/* 1. Booking & Assignment */}
        <TabsContent value="booking" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-500" />
              الحجز والتوزيع
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="معاينات محجوزة" value={stats?.booked ?? 0} icon={Calendar} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <KpiCard label="معاينات موزعة" value={stats?.assigned ?? 0} icon={Users} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
              <KpiCard label="تأخير في التوزيع" value={stats?.assignedDelayCount ?? 0} icon={AlertTriangle} color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
            </div>
            {(stats?.assignedDelayCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm text-yellow-800 dark:text-yellow-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>يوجد {stats?.assignedDelayCount} معاينة تأخر توزيعها على المهندسين — يرجى المراجعة</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 2. Confirmation */}
        <TabsContent value="confirmation" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-yellow-500" />
              التأكيد — KPI مستقل
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="تأكيد نفس اليوم" value={stats?.confirmedSameDay ?? 0} icon={CheckCircle} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="تأكيد متأخر" value={stats?.confirmedLate ?? 0} icon={Clock} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="لم يتم التأكيد" value={stats?.notConfirmed ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">نسبة التأكيد الكلية</span>
                  <span className="text-2xl font-bold text-indigo-600">{stats?.confirmationRate ?? 0}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${stats?.confirmationRate ?? 0}%` }} />
                </div>
                {(stats?.notConfirmed ?? 0) > 0 && (
                  <p className="text-xs text-red-600 mt-2">⚠️ {stats?.notConfirmed} معاينة لم يتم تأكيدها — تحتاج متابعة فورية</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. Execution */}
        <TabsContent value="execution" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              التنفيذ الميداني
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard label="مكتملة" value={stats?.completed ?? 0} icon={CheckCircle} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="متأخرة" value={stats?.delayed ?? 0} icon={Clock} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="ملغاة" value={stats?.cancelled ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <KpiCard label="مؤجلة" value={stats?.rescheduled ?? 0} icon={RefreshCw} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
              <KpiCard label="مجدولة" value={stats?.scheduled ?? 0} icon={Calendar} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            </div>
            {executionBarData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع حالات التنفيذ</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={executionBarData} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {executionBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 4. Upload & Delivery */}
        <TabsContent value="upload" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              الرفع والتسليم
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="رفع نفس اليوم" value={stats?.uploadedSameDay ?? 0} icon={Upload} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="رفع متأخر" value={stats?.uploadedLate ?? 0} icon={Clock} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="لم يُرفع" value={stats?.notUploaded ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <KpiCard label="تم التسليم للأدمن" value={stats?.deliveredToAdmin ?? 0} icon={CheckCircle} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
              <KpiCard label="تأخير في التسليم" value={stats?.deliveryDelayCount ?? 0} icon={AlertTriangle} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">معدل الرفع نفس اليوم</span>
                  <span className="text-xl font-bold text-blue-600">{stats?.uploadSameDayRate ?? 0}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats?.uploadSameDayRate ?? 0}%` }} />
                </div>
                {(stats?.notUploaded ?? 0) > 0 && (
                  <p className="text-xs text-red-600 mt-2">⚠️ {stats?.notUploaded} معاينة لم يتم رفعها بعد</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. Quality */}
        <TabsContent value="quality" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-500" />
              جودة المعاينات
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="ناجحة" value={stats?.successful ?? 0} icon={Star} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="بها مشاكل" value={stats?.withIssues ?? 0} icon={AlertTriangle} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="مرفوضة من التصميم" value={stats?.designRejected ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <KpiCard label="مكررة (إعادة زيارة)" value={stats?.repeated ?? 0} icon={RefreshCw} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
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

        {/* 6. Admin Handling */}
        <TabsContent value="admin" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              كفاءة الأدمن
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="جروب في الوقت" value={stats?.groupOnTime ?? 0} icon={CheckCircle} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="جروب متأخر" value={stats?.groupDelayed ?? 0} icon={Clock} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <KpiCard label="لم يُحوَّل للمصمم" value={stats?.notAssignedToDesigner ?? 0} icon={AlertTriangle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            </div>
            {(stats?.notAssignedToDesigner ?? 0) > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-800 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{stats?.notAssignedToDesigner} معاينة لم يتم تحويلها للمصمم — تحتاج إجراء فوري</span>
              </div>
            )}
            {(stats?.groupDelayed ?? 0) > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{stats?.groupDelayed} جروب تأخر إنشاؤه عن الموعد المحدد</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 7. Financial */}
        <TabsContent value="financial" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-500" />
              المالي — رسوم المعاينات
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="إجمالي الرسوم"
                value={`${(stats?.totalFeeAmount ?? 0).toLocaleString('ar-EG')} ج.م`}
                icon={DollarSign}
                color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
              />
              <KpiCard
                label="المحصّل"
                value={`${(stats?.feeCollectedAmount ?? 0).toLocaleString('ar-EG')} ج.م`}
                icon={CheckCircle}
                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              />
              <KpiCard label="معاينات مدفوعة" value={stats?.feeCollectedCount ?? 0} icon={CheckCircle} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <KpiCard label="معاينات غير مدفوعة" value={stats?.feeNotCollectedCount ?? 0} icon={XCircle} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">نسبة التحصيل</span>
                  <span className="text-xl font-bold text-teal-600">{stats?.collectionRate ?? 0}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${stats?.collectionRate ?? 0}%` }} />
                </div>
                {(stats?.feeNotCollectedCount ?? 0) > 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ {stats?.feeNotCollectedCount} معاينة لم يتم تحصيل رسومها
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Visits List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              قائمة المعاينات
            </CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(visitsData?.data?.length ?? 0) > 0 ? visitsData?.data?.map(visit => (
              <div key={visit.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{visit.clientName}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[visit.status] ?? ''}`}>
                      {STATUS_LABELS[visit.status] ?? visit.status}
                    </Badge>
                    {visit.quality && (
                      <Badge variant="outline" className="text-xs">
                        {visit.quality === 'successful' ? '✓ ناجحة' : visit.quality === 'with_issues' ? '⚠ مشاكل' : visit.quality === 'design_rejected' ? '✗ مرفوضة' : '🔄 مكررة'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {visit.address && <span>📍 {visit.address}</span>}
                    <span>📅 {new Date(visit.scheduledAt).toLocaleDateString('ar-EG')}</span>
                    {visit.delayMinutes && visit.delayMinutes > 0 && (
                      <span className="text-amber-600">⏰ تأخير {visit.delayMinutes} د</span>
                    )}
                  </div>
                </div>
                {(visit.status === 'scheduled' || visit.status === 'delayed') && (
                  <Button size="sm" variant="outline" className="text-xs h-7 shrink-0"
                    onClick={() => setUpdateDialog({ id: visit.id, status: 'completed' })}>
                    تحديث
                  </Button>
                )}
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
                  {engineers?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>اسم العميل *</Label>
              <Input value={newVisit.clientName} onChange={e => setNewVisit(p => ({ ...p, clientName: e.target.value }))} placeholder="اسم العميل" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الهاتف</Label>
                <Input value={newVisit.clientPhone} onChange={e => setNewVisit(p => ({ ...p, clientPhone: e.target.value }))} placeholder="01x..." />
              </div>
              <div><Label>موعد المعاينة *</Label>
                <Input type="datetime-local" value={newVisit.scheduledAt} onChange={e => setNewVisit(p => ({ ...p, scheduledAt: e.target.value }))} />
              </div>
            </div>
            <div><Label>العنوان</Label>
              <Input value={newVisit.address} onChange={e => setNewVisit(p => ({ ...p, address: e.target.value }))} placeholder="العنوان التفصيلي" />
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

      {/* Update Status Dialog */}
      <Dialog open={!!updateDialog} onOpenChange={() => setUpdateDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تحديث حالة المعاينة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الحالة الجديدة</Label>
              <Select value={updateDialog?.status ?? 'completed'}
                onValueChange={v => setUpdateDialog(d => d ? { ...d, status: v } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">مكتملة ✓</SelectItem>
                  <SelectItem value="delayed">متأخرة ⏰</SelectItem>
                  <SelectItem value="cancelled">ملغاة ✗</SelectItem>
                  <SelectItem value="rescheduled">مؤجلة 🔄</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(updateDialog?.status === 'completed' || updateDialog?.status === 'delayed') && (
              <div>
                <Label>جودة المعاينة</Label>
                <Select value={updateQuality} onValueChange={setUpdateQuality}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="successful">ناجحة ✓</SelectItem>
                    <SelectItem value="with_issues">بها مشاكل ⚠</SelectItem>
                    <SelectItem value="rejected">مرفوضة ✗</SelectItem>
                    <SelectItem value="repeated">مكررة 🔄</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {updateDialog?.status === 'delayed' && (
              <div>
                <Label>دقائق التأخير</Label>
                <Input type="number" value={updateDelayMinutes}
                  onChange={e => setUpdateDelayMinutes(e.target.value)} placeholder="مثال: 30" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialog(null)}>إلغاء</Button>
            <Button
              onClick={() => updateDialog && updateMutation.mutate({
                id: updateDialog.id,
                status: updateDialog.status as any,
                quality: (updateDialog.status === 'completed' || updateDialog.status === 'delayed') ? updateQuality as any : undefined,
                delayMinutes: updateDialog.status === 'delayed' && updateDelayMinutes ? parseInt(updateDelayMinutes) : undefined,
              })}
              disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري التحديث...' : 'تحديث'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
