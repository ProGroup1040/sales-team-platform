import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_LABELS: Record<string, string> = { on_track: 'في الموعد', due_soon: 'يستحق قريباً', overdue: 'متأخر', completed: 'مكتمل' };
const STATUS_COLORS: Record<string, string> = { on_track: 'bg-emerald-100 text-emerald-700', due_soon: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700', completed: 'bg-blue-100 text-blue-700' };

export default function CollectionsModule() {
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [updateDialog, setUpdateDialog] = useState<{ id: number; collectedAmount: string; status: string } | null>(null);
  const [newCollection, setNewCollection] = useState({ clientName: '', contractAmount: '', collectedAmount: '0', dueDate: '', notes: '' });

  const utils = trpc.useUtils();
  const { data: stats } = trpc.collections.stats.useQuery();
  const { data: collectionsData } = trpc.collections.list.useQuery({ limit: 20, status: filterStatus !== 'all' ? filterStatus : undefined });

  const createMutation = trpc.collections.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة العقد'); setShowAdd(false); utils.collections.list.invalidate(); utils.collections.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });
  const updateMutation = trpc.collections.update.useMutation({
    onSuccess: () => { toast.success('تم تحديث التحصيل'); setUpdateDialog(null); utils.collections.list.invalidate(); utils.collections.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });

  const chartData = [
    { name: 'إجمالي العقود', value: stats?.totalContracts ?? 0, fill: '#6366f1' },
    { name: 'المحصّل', value: stats?.totalCollected ?? 0, fill: '#10b981' },
    { name: 'المستحق', value: stats?.outstanding ?? 0, fill: '#f59e0b' },
    { name: 'المتأخر', value: stats?.overdue ?? 0, fill: '#ef4444' },
  ];

  const handleCreate = () => {
    if (!newCollection.clientName || !newCollection.contractAmount) return toast.error('يرجى ملء الحقول المطلوبة');
    createMutation.mutate({ clientName: newCollection.clientName, contractAmount: parseFloat(newCollection.contractAmount), collectedAmount: parseFloat(newCollection.collectedAmount || '0'), dueDate: newCollection.dueDate, notes: newCollection.notes });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">موديول التحصيل المالي</h1>
          <p className="text-sm text-muted-foreground">متابعة التحصيل والمبالغ المستحقة</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />إضافة عقد</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-indigo-100"><DollarSign className="w-4 h-4 text-indigo-600" /></div>
            <p className="text-xs text-muted-foreground">إجمالي العقود</p>
          </div>
          <p className="text-xl font-bold">{(stats?.totalContracts ?? 0).toLocaleString('ar-EG')}</p>
          <p className="text-xs text-muted-foreground">ج.م</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-emerald-100"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
            <p className="text-xs text-muted-foreground">المحصّل</p>
          </div>
          <p className="text-xl font-bold text-emerald-600">{(stats?.totalCollected ?? 0).toLocaleString('ar-EG')}</p>
          <p className="text-xs text-muted-foreground">{stats?.collectionRate ?? 0}% من الإجمالي</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-100"><CheckCircle className="w-4 h-4 text-amber-600" /></div>
            <p className="text-xs text-muted-foreground">المستحق</p>
          </div>
          <p className="text-xl font-bold text-amber-600">{(stats?.outstanding ?? 0).toLocaleString('ar-EG')}</p>
          <p className="text-xs text-muted-foreground">ج.م</p>
        </CardContent></Card>
        <Card className={`${(stats?.overdue ?? 0) > 0 ? 'border-red-200 bg-red-50/30 dark:bg-red-950/10' : ''}`}><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-red-100"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
            <p className="text-xs text-muted-foreground">المتأخر</p>
          </div>
          <p className="text-xl font-bold text-red-600">{(stats?.overdue ?? 0).toLocaleString('ar-EG')}</p>
          <p className="text-xs text-muted-foreground">ج.م - يحتاج متابعة</p>
        </CardContent></Card>
      </div>

      {/* Collection Rate Progress */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">معدل التحصيل الإجمالي</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">نسبة التحصيل</span>
            <span className="font-bold text-lg">{stats?.collectionRate ?? 0}%</span>
          </div>
          <Progress value={stats?.collectionRate ?? 0} className="h-4" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>محصّل: {(stats?.totalCollected ?? 0).toLocaleString('ar-EG')} ج.م</span>
            <span>الفرق: {((stats?.totalContracts ?? 0) - (stats?.totalCollected ?? 0)).toLocaleString('ar-EG')} ج.م</span>
            <span>إجمالي: {(stats?.totalContracts ?? 0).toLocaleString('ar-EG')} ج.م</span>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">مقارنة المبيعات والتحصيل</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString('ar-EG')} ج.م`]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Collections List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">قائمة العقود والتحصيل</CardTitle>
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
            {collectionsData?.data?.map(col => {
              const contract = parseFloat(col.contractAmount);
              const collected = parseFloat(col.collectedAmount ?? '0');
              const pct = contract > 0 ? Math.round((collected / contract) * 100) : 0;
              return (
                <div key={col.id} className="p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{col.clientName}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[col.status]}`}>{STATUS_LABELS[col.status]}</Badge>
                      {col.status === 'overdue' && <span className="text-xs text-red-600 font-medium">⚠ متأخر</span>}
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setUpdateDialog({ id: col.id, collectedAmount: col.collectedAmount ?? '0', status: col.status })}>
                      تحديث
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>العقد: {contract.toLocaleString('ar-EG')} ج.م</span>
                    <span>المحصّل: <span className="font-semibold text-foreground">{collected.toLocaleString('ar-EG')} ج.م</span></span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  {col.dueDate && (
                    <p className="text-xs text-muted-foreground mt-1">📅 الاستحقاق: {new Date(col.dueDate).toLocaleDateString('ar-EG')}</p>
                  )}
                </div>
              );
            }) ?? <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>}
          </div>
        </CardContent>
      </Card>

      {/* Add Collection Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة عقد جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم العميل *</Label><Input value={newCollection.clientName} onChange={e => setNewCollection(p => ({ ...p, clientName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>قيمة العقد (ج.م) *</Label><Input type="number" value={newCollection.contractAmount} onChange={e => setNewCollection(p => ({ ...p, contractAmount: e.target.value }))} /></div>
              <div><Label>المحصّل حتى الآن</Label><Input type="number" value={newCollection.collectedAmount} onChange={e => setNewCollection(p => ({ ...p, collectedAmount: e.target.value }))} /></div>
            </div>
            <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={newCollection.dueDate} onChange={e => setNewCollection(p => ({ ...p, dueDate: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={!!updateDialog} onOpenChange={() => setUpdateDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تحديث التحصيل</DialogTitle></DialogHeader>
          {updateDialog && (
            <div className="space-y-3">
              <div><Label>المبلغ المحصّل (ج.م)</Label><Input type="number" value={updateDialog.collectedAmount} onChange={e => setUpdateDialog(d => d ? { ...d, collectedAmount: e.target.value } : null)} /></div>
              <div><Label>الحالة</Label>
                <Select value={updateDialog.status} onValueChange={v => setUpdateDialog(d => d ? { ...d, status: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialog(null)}>إلغاء</Button>
            <Button onClick={() => updateDialog && updateMutation.mutate({ id: updateDialog.id, collectedAmount: parseFloat(updateDialog.collectedAmount), status: updateDialog.status as any })} disabled={updateMutation.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
