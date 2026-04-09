import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Clock, TrendingUp, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { DeleteConfirmDialog, type DeleteReason } from "@/components/DeleteConfirmDialog";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;

const STATUS_LABELS: Record<string, string> = { new: 'جديد', contacted: 'تم التواصل', qualified: 'مؤهل', unqualified: 'غير مؤهل', converted: 'تحول لصفقة' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-indigo-100 text-indigo-700', qualified: 'bg-emerald-100 text-emerald-700', unqualified: 'bg-slate-100 text-slate-600', converted: 'bg-purple-100 text-purple-700' };
const SOURCE_LABELS: Record<string, string> = { website: 'الموقع', referral: 'إحالة', social_media: 'سوشيال ميديا', call: 'اتصال', walk_in: 'زيارة مباشرة', other: 'أخرى' };
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function LeadsModule() {
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', source: 'other', assignedEngineerId: '', notes: '' });
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: stats } = trpc.leads.stats.useQuery({ year: YEAR, month: MONTH });
  const { data: leadsData } = trpc.leads.list.useQuery({ limit: 20, status: filterStatus !== 'all' ? filterStatus : undefined });
  const { data: engineers } = trpc.engineers.list.useQuery();

  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة العميل المحتمل'); setShowAdd(false); utils.leads.list.invalidate(); utils.leads.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });
  const updateMutation = trpc.leads.updateStatus.useMutation({
    onSuccess: () => { toast.success('تم تحديث الحالة'); utils.leads.list.invalidate(); utils.leads.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });
  const softDeleteMut = trpc.softDelete.lead.useMutation({
    onSuccess: () => { toast.success('تم حذف العميل المحتمل'); setDeleteTarget(null); utils.leads.list.invalidate(); utils.leads.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ في الحذف'),
  });

  const sourceChartData = stats?.bySource?.map((s, i) => ({
    name: SOURCE_LABELS[s.source] ?? s.source,
    value: s.count,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  })) ?? [];

  const funnelData = stats ? [
    { name: 'إجمالي العملاء المحتملين', value: stats.total, fill: '#6366f1' },
    { name: 'تم التواصل', value: stats.contacted, fill: '#8b5cf6' },
    { name: 'مؤهل', value: stats.qualified, fill: '#10b981' },
    { name: 'تحول لصفقة', value: stats.converted, fill: '#f59e0b' },
  ] : [];

  const handleCreate = () => {
    if (!newLead.name) return toast.error('الاسم مطلوب');
    createMutation.mutate({ ...newLead, assignedEngineerId: newLead.assignedEngineerId ? parseInt(newLead.assignedEngineerId) : undefined });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">موديول العملاء المحتملين</h1>
          <p className="text-sm text-muted-foreground">متابعة العملاء المحتملين وسرعة الاستجابة</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />إضافة عميل محتمل</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-blue border"><CardContent className="p-5">
          <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-indigo-100"><Users className="w-5 h-5 text-indigo-600" /></div>
          <div><p className="text-2xl font-bold">{stats?.total ?? 0}</p><p className="text-xs text-muted-foreground">إجمالي العملاء المحتملين</p></div></div>
        </CardContent></Card>
        <Card className="kpi-green border"><CardContent className="p-5">
          <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-emerald-100"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{stats?.contacted ?? 0}</p><p className="text-xs text-muted-foreground">تم التواصل</p></div></div>
        </CardContent></Card>
        <Card className="kpi-amber border"><CardContent className="p-5">
          <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-amber-100"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{stats?.avgResponseMinutes ?? 0} د</p><p className="text-xs text-muted-foreground">متوسط وقت الرد</p></div></div>
        </CardContent></Card>
        <Card className={`border ${(stats?.delayedRate ?? 0) > 30 ? 'kpi-red' : 'kpi-green'}`}><CardContent className="p-5">
          <div className="flex items-center gap-3"><div className={`p-2.5 rounded-xl ${(stats?.delayedRate ?? 0) > 30 ? 'bg-red-100' : 'bg-emerald-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${(stats?.delayedRate ?? 0) > 30 ? 'text-red-600' : 'text-emerald-600'}`} /></div>
          <div><p className="text-2xl font-bold">{stats?.delayedRate ?? 0}%</p><p className="text-xs text-muted-foreground">نسبة التأخير في الرد</p></div></div>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">مصادر العملاء المحتملين</CardTitle></CardHeader>
          <CardContent>
            {sourceChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={sourceChartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {sourceChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">لا توجد بيانات</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">مسار التحويل</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" name="العدد" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leads List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">قائمة العملاء المحتملين</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leadsData?.data?.map(lead => (
              <div key={lead.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{lead.name}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</Badge>
                    <Badge variant="outline" className="text-xs">{SOURCE_LABELS[lead.source] ?? lead.source}</Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    {lead.phone && <span>📞 {lead.phone}</span>}
                    {lead.responseTimeMinutes && <span>⏱ رد بعد {lead.responseTimeMinutes} دقيقة {lead.responseTimeMinutes > 60 ? '⚠️' : '✓'}</span>}
                  </div>
                </div>
                {lead.status === 'new' && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateMutation.mutate({ id: lead.id, status: 'contacted', responseTimeMinutes: Math.floor(Math.random() * 30) + 5 })}>
                    تم التواصل
                  </Button>
                )}
                {lead.status === 'contacted' && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600" onClick={() => updateMutation.mutate({ id: lead.id, status: 'qualified' })}>مؤهل</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-slate-500" onClick={() => updateMutation.mutate({ id: lead.id, status: 'unqualified' })}>غير مؤهل</Button>
                  </div>
                )}
                {lead.status === 'qualified' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 text-purple-600" onClick={() => updateMutation.mutate({ id: lead.id, status: 'converted' })}>تحويل لصفقة</Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 shrink-0" onClick={() => setDeleteTarget(lead.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )) ?? <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>}
          </div>
        </CardContent>
      </Card>

      {/* Add Lead Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة عميل محتمل جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={newLead.name} onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الهاتف</Label><Input value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>البريد</Label><Input value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المصدر</Label>
                <Select value={newLead.source} onValueChange={v => setNewLead(p => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>المهندس المسؤول</Label>
                <Select value={newLead.assignedEngineerId} onValueChange={v => setNewLead(p => ({ ...p, assignedEngineerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{engineers?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason: DeleteReason, reasonCustom?: string) => {
          if (deleteTarget !== null) softDeleteMut.mutate({ id: deleteTarget, reason, reasonCustom });
        }}
        title="حذف العميل المحتمل"
        description="هل أنت متأكد من حذف هذا العميل المحتمل؟ سيتم إخفاؤه مع الاحتفاظ ببياناته."
        isLoading={softDeleteMut.isPending}
      />
    </div>
  );
}
