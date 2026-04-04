import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, CheckCircle, Clock, XCircle, Star, Plus } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;

const STATUS_LABELS: Record<string, string> = { scheduled: 'مجدولة', completed: 'مكتملة', delayed: 'متأخرة', cancelled: 'ملغاة' };
const STATUS_COLORS: Record<string, string> = { scheduled: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700', delayed: 'bg-amber-100 text-amber-700', cancelled: 'bg-red-100 text-red-700' };
const QUALITY_LABELS: Record<string, string> = { successful: 'ناجحة ✓', with_issues: 'بها مشاكل ⚠', rejected: 'مرفوضة ✗', repeated: 'مكررة 🔄' };
const QUALITY_COLORS: Record<string, string> = { successful: 'bg-emerald-100 text-emerald-700', with_issues: 'bg-amber-100 text-amber-700', rejected: 'bg-red-100 text-red-700', repeated: 'bg-purple-100 text-purple-700' };
const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function VisitsModule() {
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [newVisit, setNewVisit] = useState({ engineerId: '', clientName: '', clientPhone: '', address: '', scheduledAt: '' });
  const [updateDialog, setUpdateDialog] = useState<{ id: number; status: string } | null>(null);
  const [updateQuality, setUpdateQuality] = useState('successful');

  const utils = trpc.useUtils();
  const { data: stats } = trpc.visits.stats.useQuery({ year: YEAR, month: MONTH });
  const { data: visitsData } = trpc.visits.list.useQuery({ limit: 20, status: filterStatus !== 'all' ? filterStatus : undefined });
  const { data: engineers } = trpc.engineers.list.useQuery();

  const createMutation = trpc.visits.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة المعاينة'); setShowAdd(false); utils.visits.list.invalidate(); utils.visits.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });
  const updateMutation = trpc.visits.updateStatus.useMutation({
    onSuccess: () => { toast.success('تم تحديث الحالة'); setUpdateDialog(null); utils.visits.list.invalidate(); utils.visits.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });

  const qualityData = stats ? [
    { name: 'ناجحة', value: stats.successful, fill: '#10b981' },
    { name: 'بها مشاكل', value: stats.with_issues, fill: '#f59e0b' },
    { name: 'مرفوضة', value: stats.rejected, fill: '#ef4444' },
    { name: 'مكررة', value: stats.repeated, fill: '#8b5cf6' },
  ].filter(d => d.value > 0) : [];

  const rateData = stats ? [
    { name: 'معدل الإتمام', value: stats.completionRate, fill: '#6366f1' },
    { name: 'معدل النجاح', value: stats.successRate, fill: '#10b981' },
    { name: 'معدل التأخير', value: stats.delayRate, fill: '#f59e0b' },
    { name: 'معدل المشاكل', value: stats.issueRate, fill: '#ef4444' },
  ] : [];

  const handleCreate = () => {
    if (!newVisit.engineerId || !newVisit.clientName || !newVisit.scheduledAt) return toast.error('يرجى ملء الحقول المطلوبة');
    createMutation.mutate({ engineerId: parseInt(newVisit.engineerId), clientName: newVisit.clientName, clientPhone: newVisit.clientPhone, address: newVisit.address, scheduledAt: new Date(newVisit.scheduledAt) });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">موديول المعاينات</h1>
          <p className="text-sm text-muted-foreground">متابعة المعاينات الميدانية وجودتها</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />إضافة معاينة</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'المجدولة', val: stats?.scheduled ?? 0, icon: MapPin, color: 'text-indigo-600 bg-indigo-100' },
          { label: 'المكتملة', val: stats?.completed ?? 0, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'المتأخرة', val: stats?.delayed ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-100' },
          { label: 'الناجحة', val: stats?.successful ?? 0, icon: Star, color: 'text-purple-600 bg-purple-100' },
        ].map(({ label, val, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${color.split(' ')[1]}`}><Icon className={`w-5 h-5 ${color.split(' ')[0]}`} /></div>
            <div><p className="text-2xl font-bold">{val}</p><p className="text-xs text-muted-foreground">{label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Rates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {rateData.map(r => (
          <Card key={r.name}><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold" style={{ color: r.fill }}>{r.value}%</div>
            <div className="text-xs text-muted-foreground mt-1">{r.name}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">توزيع جودة المعاينات</CardTitle></CardHeader>
          <CardContent>
            {qualityData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={qualityData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                      {qualityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {qualityData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                      <span className="text-muted-foreground">{d.name}: <span className="font-semibold text-foreground">{d.value}</span></span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">لا توجد بيانات</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">ملخص الحالات</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: 'مجدولة', val: stats?.scheduled ?? 0, color: 'bg-indigo-500' },
              { label: 'مكتملة', val: stats?.completed ?? 0, color: 'bg-emerald-500' },
              { label: 'متأخرة', val: stats?.delayed ?? 0, color: 'bg-amber-500' },
              { label: 'ملغاة', val: stats?.cancelled ?? 0, color: 'bg-red-500' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-20 text-sm text-muted-foreground">{label}</div>
                <div className="flex-1 bg-muted rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${stats?.scheduled ? (val / stats.scheduled) * 100 : 0}%` }} />
                </div>
                <div className="w-8 text-sm font-semibold text-right">{val}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Visits List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">قائمة المعاينات</CardTitle>
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
            {visitsData?.data?.map(visit => (
              <div key={visit.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{visit.clientName}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[visit.status]}`}>{STATUS_LABELS[visit.status]}</Badge>
                    {visit.quality && <Badge className={`text-xs ${QUALITY_COLORS[visit.quality]}`}>{QUALITY_LABELS[visit.quality]}</Badge>}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    {visit.address && <span>📍 {visit.address}</span>}
                    <span>📅 {new Date(visit.scheduledAt).toLocaleDateString('ar-EG')}</span>
                    {visit.delayMinutes && visit.delayMinutes > 0 && <span className="text-amber-600">⏰ تأخير {visit.delayMinutes} د</span>}
                  </div>
                </div>
                {visit.status === 'scheduled' && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setUpdateDialog({ id: visit.id, status: 'completed' })}>
                    تحديث الحالة
                  </Button>
                )}
              </div>
            )) ?? <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>}
          </div>
        </CardContent>
      </Card>

      {/* Add Visit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة معاينة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>المهندس *</Label>
              <Select value={newVisit.engineerId} onValueChange={v => setNewVisit(p => ({ ...p, engineerId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
                <SelectContent>{engineers?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>اسم العميل *</Label><Input value={newVisit.clientName} onChange={e => setNewVisit(p => ({ ...p, clientName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الهاتف</Label><Input value={newVisit.clientPhone} onChange={e => setNewVisit(p => ({ ...p, clientPhone: e.target.value }))} /></div>
              <div><Label>موعد المعاينة *</Label><Input type="datetime-local" value={newVisit.scheduledAt} onChange={e => setNewVisit(p => ({ ...p, scheduledAt: e.target.value }))} /></div>
            </div>
            <div><Label>العنوان</Label><Input value={newVisit.address} onChange={e => setNewVisit(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={!!updateDialog} onOpenChange={() => setUpdateDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تحديث حالة المعاينة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الحالة</Label>
              <Select value={updateDialog?.status ?? 'completed'} onValueChange={v => setUpdateDialog(d => d ? { ...d, status: v } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'scheduled').map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {updateDialog?.status === 'completed' && (
              <div><Label>جودة المعاينة</Label>
                <Select value={updateQuality} onValueChange={setUpdateQuality}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(QUALITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialog(null)}>إلغاء</Button>
            <Button onClick={() => updateDialog && updateMutation.mutate({ id: updateDialog.id, status: updateDialog.status as any, quality: updateDialog.status === 'completed' ? updateQuality as any : undefined })} disabled={updateMutation.isPending}>تحديث</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
