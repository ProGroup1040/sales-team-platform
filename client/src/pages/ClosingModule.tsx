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
import { TrendingUp, DollarSign, Zap, CheckCircle, Plus, ChevronRight } from "lucide-react";
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from "recharts";

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;

const STAGE_LABELS: Record<string, string> = {
  proposal: 'عرض سعر', negotiation: 'تفاوض',
  contract_sent: 'عقد مرسل', closed_won: 'مغلق ✓', closed_lost: 'خسارة ✗',
};
const STAGE_COLORS: Record<string, string> = {
  proposal: 'bg-blue-100 text-blue-700',
  negotiation: 'bg-indigo-100 text-indigo-700',
  contract_sent: 'bg-amber-100 text-amber-700',
  closed_won: 'bg-emerald-100 text-emerald-700',
  closed_lost: 'bg-red-100 text-red-700',
};
const STAGE_ORDER = ['proposal', 'negotiation', 'contract_sent', 'closed_won', 'closed_lost'];

export default function ClosingModule() {
  const [showAdd, setShowAdd] = useState(false);
  const [filterStage, setFilterStage] = useState("all");
  const [updateDeal, setUpdateDeal] = useState<{ id: number; stage: string; nextAction: string; nextActionDate: string; notes: string } | null>(null);
  const [newDeal, setNewDeal] = useState({ engineerId: '', clientName: '', value: '', nextAction: '', nextActionDate: '', notes: '' });

  const utils = trpc.useUtils();
  const { data: stats } = trpc.closing.stats.useQuery({ year: YEAR, month: MONTH });
  const { data: dealsData } = trpc.closing.list.useQuery({ limit: 20, stage: filterStage !== 'all' ? filterStage : undefined });
  const { data: engineers } = trpc.engineers.list.useQuery();

  const createMutation = trpc.closing.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة الصفقة'); setShowAdd(false); utils.closing.list.invalidate(); utils.closing.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });
  const updateMutation = trpc.closing.updateStage.useMutation({
    onSuccess: () => { toast.success('تم تحديث الصفقة'); setUpdateDeal(null); utils.closing.list.invalidate(); utils.closing.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });

  const pipelineData = stats?.byStage?.map(s => ({
    name: STAGE_LABELS[s.stage] ?? s.stage,
    value: s.count,
    fill: s.stage === 'proposal' ? '#6366f1' : s.stage === 'negotiation' ? '#8b5cf6' : s.stage === 'contract_sent' ? '#f59e0b' : s.stage === 'closed_won' ? '#10b981' : '#ef4444',
  })) ?? [];

  const handleCreate = () => {
    if (!newDeal.engineerId || !newDeal.clientName || !newDeal.value) return toast.error('يرجى ملء الحقول المطلوبة');
    createMutation.mutate({ engineerId: parseInt(newDeal.engineerId), clientName: newDeal.clientName, value: parseFloat(newDeal.value), nextAction: newDeal.nextAction, nextActionDate: newDeal.nextActionDate, notes: newDeal.notes });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">موديول التفاوض والإغلاق</h1>
          <p className="text-sm text-muted-foreground">متابعة الصفقات من التفاوض حتى الإغلاق</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />إضافة صفقة</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-100"><Zap className="w-5 h-5 text-indigo-600" /></div>
          <div><p className="text-2xl font-bold">{stats?.open ?? 0}</p><p className="text-xs text-muted-foreground">صفقات مفتوحة</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-100"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{stats?.closedWon ?? 0}</p><p className="text-xs text-muted-foreground">صفقات مغلقة ✓</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-amber-100"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{stats?.conversionRate ?? 0}%</p><p className="text-xs text-muted-foreground">نسبة الإغلاق</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-purple-100"><DollarSign className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xl font-bold">{(stats?.closedValue ?? 0).toLocaleString('ar-EG')}</p><p className="text-xs text-muted-foreground">قيمة الصفقات المغلقة (ج.م)</p></div>
        </CardContent></Card>
      </div>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">مسار الصفقات</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STAGE_ORDER.map((stage, i) => {
              const stageInfo = stats?.byStage?.find(s => s.stage === stage);
              return (
                <div key={stage} className="flex items-center gap-2 flex-shrink-0">
                  <div className={`px-4 py-3 rounded-xl border text-center min-w-[110px] ${STAGE_COLORS[stage]}`}>
                    <div className="text-2xl font-bold">{stageInfo?.count ?? 0}</div>
                    <div className="text-xs mt-0.5">{STAGE_LABELS[stage]}</div>
                    {stageInfo?.value && stageInfo.value > 0 && (
                      <div className="text-xs opacity-70 mt-0.5">{(stageInfo.value / 1000).toFixed(0)}k ج.م</div>
                    )}
                  </div>
                  {i < STAGE_ORDER.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deals List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">قائمة الصفقات</CardTitle>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dealsData?.data?.map(deal => (
              <div key={deal.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{deal.clientName}</span>
                    <Badge className={`text-xs ${STAGE_COLORS[deal.stage]}`}>{STAGE_LABELS[deal.stage]}</Badge>
                    <span className="text-sm font-bold text-indigo-600">{parseFloat(deal.value).toLocaleString('ar-EG')} ج.م</span>
                  </div>
                  {deal.nextAction && (
                    <div className="text-xs text-muted-foreground mt-1">
                      🎯 الخطوة التالية: <span className="text-foreground font-medium">{deal.nextAction}</span>
                      {deal.nextActionDate && <span className="mr-2">📅 {new Date(deal.nextActionDate).toLocaleDateString('ar-EG')}</span>}
                    </div>
                  )}
                </div>
                {deal.stage !== 'closed_won' && deal.stage !== 'closed_lost' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 flex-shrink-0" onClick={() => setUpdateDeal({ id: deal.id, stage: deal.stage, nextAction: deal.nextAction ?? '', nextActionDate: '', notes: deal.notes ?? '' })}>
                    تحديث
                  </Button>
                )}
              </div>
            )) ?? <div className="text-center py-8 text-muted-foreground">لا توجد صفقات</div>}
          </div>
        </CardContent>
      </Card>

      {/* Add Deal Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة صفقة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>المهندس المسؤول *</Label>
              <Select value={newDeal.engineerId} onValueChange={v => setNewDeal(p => ({ ...p, engineerId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
                <SelectContent>{engineers?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>اسم العميل *</Label><Input value={newDeal.clientName} onChange={e => setNewDeal(p => ({ ...p, clientName: e.target.value }))} /></div>
            <div><Label>قيمة الصفقة (ج.م) *</Label><Input type="number" value={newDeal.value} onChange={e => setNewDeal(p => ({ ...p, value: e.target.value }))} /></div>
            <div><Label>الخطوة التالية</Label><Input value={newDeal.nextAction} onChange={e => setNewDeal(p => ({ ...p, nextAction: e.target.value }))} /></div>
            <div><Label>تاريخ الخطوة التالية</Label><Input type="date" value={newDeal.nextActionDate} onChange={e => setNewDeal(p => ({ ...p, nextActionDate: e.target.value }))} /></div>
            <div><Label>ملاحظات</Label><Textarea value={newDeal.notes} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Deal Dialog */}
      <Dialog open={!!updateDeal} onOpenChange={() => setUpdateDeal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تحديث الصفقة</DialogTitle></DialogHeader>
          {updateDeal && (
            <div className="space-y-3">
              <div><Label>المرحلة</Label>
                <Select value={updateDeal.stage} onValueChange={v => setUpdateDeal(d => d ? { ...d, stage: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الخطوة التالية</Label><Input value={updateDeal.nextAction} onChange={e => setUpdateDeal(d => d ? { ...d, nextAction: e.target.value } : null)} /></div>
              <div><Label>تاريخ الخطوة التالية</Label><Input type="date" value={updateDeal.nextActionDate} onChange={e => setUpdateDeal(d => d ? { ...d, nextActionDate: e.target.value } : null)} /></div>
              <div><Label>ملاحظات</Label><Textarea value={updateDeal.notes} onChange={e => setUpdateDeal(d => d ? { ...d, notes: e.target.value } : null)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDeal(null)}>إلغاء</Button>
            <Button onClick={() => updateDeal && updateMutation.mutate({ id: updateDeal.id, stage: updateDeal.stage as any, nextAction: updateDeal.nextAction, nextActionDate: updateDeal.nextActionDate, notes: updateDeal.notes })} disabled={updateMutation.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
