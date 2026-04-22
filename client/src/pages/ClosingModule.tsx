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
import {
  TrendingUp, DollarSign, Zap, CheckCircle, Plus, Trash2,
  Percent, ShieldCheck, AlertTriangle, Users, BarChart3, ChevronRight,
  XCircle, AlertCircle, TrendingDown,
} from "lucide-react";
import { DeleteConfirmDialog, type DeleteReason } from "@/components/DeleteConfirmDialog";
import { useLocalAuth } from "@/hooks/useLocalAuth";

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;

const STAGE_LABELS: Record<string, string> = {
  proposal: 'عرض سعر',
  negotiation: 'تفاوض',
  contract_sent: 'عقد مرسل',
  closed_won: 'مغلق ✓',
  closed_lost: 'خسارة ✗',
};
const STAGE_COLORS: Record<string, string> = {
  proposal: 'bg-blue-100 text-blue-700',
  negotiation: 'bg-indigo-100 text-indigo-700',
  contract_sent: 'bg-amber-100 text-amber-700',
  closed_won: 'bg-emerald-100 text-emerald-700',
  closed_lost: 'bg-red-100 text-red-700',
};
const STAGE_ORDER = ['proposal', 'negotiation', 'contract_sent', 'closed_won', 'closed_lost'];

const LOST_REASON_OPTIONS = [
  { value: 'price_high', label: 'سعر أعلى من المنافس' },
  { value: 'competitor', label: 'ذهب للمنافس' },
  { value: 'slow_response', label: 'تأخير في الاستجابة' },
  { value: 'wrong_product', label: 'منتج غير مناسب' },
  { value: 'not_serious', label: 'عميل غير جاد' },
  { value: 'budget_cut', label: 'تخفيض الميزانية' },
  { value: 'other', label: 'أسباب أخرى' },
];

const fmt = (n: number) => n.toLocaleString('ar-EG', { maximumFractionDigits: 0 });

type NewDealState = {
  engineerId: string; clientName: string; value: string;
  nextAction: string; nextActionDate: string; notes: string;
  discountPercent: string; discountValue: string; discountNote: string;
};
type UpdateDealState = {
  id: number; stage: string; nextAction: string; nextActionDate: string; notes: string;
  value: string; discountPercent: string; discountValue: string; discountNote: string;
  lostReason?: string; lostReasonNote?: string;
};
type LostReasonState = {
  dealId: number;
  pendingStage: string;
  lostReason: string;
  lostReasonNote: string;
};

export default function ClosingModule() {
  const { session } = useLocalAuth();
  const canEdit = session?.role === 'admin' || session?.role === 'admin_sales';

  const [activeTab, setActiveTab] = useState<'deals' | 'discount' | 'engineers' | 'lost'>('deals');
  const [showAdd, setShowAdd] = useState(false);
  const [filterStage, setFilterStage] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updateDeal, setUpdateDeal] = useState<UpdateDealState | null>(null);
  const [lostReasonDialog, setLostReasonDialog] = useState<LostReasonState | null>(null);
  const [newDeal, setNewDeal] = useState<NewDealState>({
    engineerId: '', clientName: '', value: '',
    nextAction: '', nextActionDate: '', notes: '',
    discountPercent: '0', discountValue: '0', discountNote: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: stats } = trpc.closing.stats.useQuery({ year: YEAR, month: MONTH });
  const { data: dealsData } = trpc.closing.list.useQuery({ limit: 50, stage: filterStage !== 'all' ? filterStage : undefined });
  const { data: engineers } = trpc.engineers.list.useQuery();
  const { data: discountSummary } = trpc.closing.discountSummary.useQuery();
  const { data: engDiscounts } = trpc.closing.engineerDiscountSummary.useQuery();
  const { data: lostAnalysis } = trpc.closing.lostDealsAnalysis.useQuery();

  const invalidateAll = () => {
    utils.closing.list.invalidate();
    utils.closing.stats.invalidate();
    utils.closing.discountSummary.invalidate();
    utils.closing.engineerDiscountSummary.invalidate();
    utils.closing.lostDealsAnalysis.invalidate();
  };

  const createMutation = trpc.closing.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة الصفقة'); setShowAdd(false); invalidateAll(); },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  });
  const updateMutation = trpc.closing.updateStage.useMutation({
    onSuccess: () => { toast.success('تم تحديث الصفقة'); setUpdateDeal(null); invalidateAll(); },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  });
  const updateDealStageMutation = trpc.closing.updateDealStage.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث مرحلة الصفقة');
      setLostReasonDialog(null);
      setUpdateDeal(null);
      invalidateAll();
    },
    onError: (e) => toast.error(e.message || 'حدث خطأ'),
  });
  const softDeleteMut = trpc.softDelete.deal.useMutation({
    onSuccess: () => { toast.success('تم حذف الصفقة'); setDeleteTarget(null); invalidateAll(); },
    onError: () => toast.error('حدث خطأ في الحذف'),
  });

  // حساب قيمة الخصم تلقائياً من النسبة
  const handleNewDiscountPctChange = (pct: string) => {
    const p = parseFloat(pct) || 0;
    const v = parseFloat(newDeal.value) || 0;
    setNewDeal(prev => ({ ...prev, discountPercent: pct, discountValue: (v * p / 100).toFixed(2) }));
  };
  const handleNewDiscountValChange = (val: string) => {
    const dv = parseFloat(val) || 0;
    const v = parseFloat(newDeal.value) || 0;
    setNewDeal(prev => ({ ...prev, discountValue: val, discountPercent: v > 0 ? ((dv / v) * 100).toFixed(2) : '0' }));
  };
  const handleUpdateDiscountPctChange = (pct: string) => {
    const p = parseFloat(pct) || 0;
    const v = parseFloat(updateDeal?.value || '0') || 0;
    setUpdateDeal(d => d ? { ...d, discountPercent: pct, discountValue: (v * p / 100).toFixed(2) } : null);
  };
  const handleUpdateDiscountValChange = (val: string) => {
    const dv = parseFloat(val) || 0;
    const v = parseFloat(updateDeal?.value || '0') || 0;
    setUpdateDeal(d => d ? { ...d, discountValue: val, discountPercent: v > 0 ? ((dv / v) * 100).toFixed(2) : '0' } : null);
  };

  const handleCreate = () => {
    if (!newDeal.engineerId || !newDeal.clientName || !newDeal.value) {
      toast.error('يرجى ملء الحقول المطلوبة'); return;
    }
    const discountVal = parseFloat(newDeal.discountValue) || 0;
    const remaining = discountSummary?.remainingDiscount ?? Infinity;
    if (discountVal > remaining) {
      toast.error(`الخصم يتجاوز الحد المتبقي (${fmt(remaining)} ج.م)`); return;
    }
    createMutation.mutate({
      engineerId: parseInt(newDeal.engineerId), clientName: newDeal.clientName,
      value: parseFloat(newDeal.value),
      nextAction: newDeal.nextAction || undefined, nextActionDate: newDeal.nextActionDate || undefined,
      notes: newDeal.notes || undefined,
      discountPercent: parseFloat(newDeal.discountPercent) || 0,
      discountValue: discountVal,
      discountNote: newDeal.discountNote || undefined,
    });
  };

  // عند تغيير المرحلة في نموذج التحديث
  const handleStageChange = (newStage: string) => {
    if (!updateDeal) return;
    if (newStage === 'closed_lost') {
      // فتح نموذج سبب الخسارة
      setLostReasonDialog({
        dealId: updateDeal.id,
        pendingStage: newStage,
        lostReason: 'price_high',
        lostReasonNote: '',
      });
    } else {
      setUpdateDeal(d => d ? { ...d, stage: newStage } : null);
    }
  };

  const handleUpdate = () => {
    if (!updateDeal) return;
    // إذا closed_lost: نحدث الصفقة مباشرة مع lostReason من الـ Dialog
    if (updateDeal.stage === 'closed_lost') {
      if (!updateDeal.lostReason) {
        toast.error('يرجى تحديد سبب الخسارة');
        return;
      }
      updateDealStageMutation.mutate({
        id: updateDeal.id,
        stage: 'closed_lost',
        lostReason: updateDeal.lostReason as any,
        lostReasonNote: updateDeal.lostReasonNote || undefined,
      });
      // تحديث باقي الحقول بعد ذلك
      updateMutation.mutate({
        id: updateDeal.id,
        stage: 'closed_lost' as any,
        nextAction: updateDeal.nextAction || undefined,
        nextActionDate: updateDeal.nextActionDate || undefined,
        notes: updateDeal.notes || undefined,
        value: parseFloat(updateDeal.value) || undefined,
        discountPercent: parseFloat(updateDeal.discountPercent) || 0,
        discountValue: parseFloat(updateDeal.discountValue) || 0,
        discountNote: updateDeal.discountNote || undefined,
      });
      return;
    }
    updateMutation.mutate({
      id: updateDeal.id,
      stage: updateDeal.stage as any,
      nextAction: updateDeal.nextAction || undefined,
      nextActionDate: updateDeal.nextActionDate || undefined,
      notes: updateDeal.notes || undefined,
      value: parseFloat(updateDeal.value) || undefined,
      discountPercent: parseFloat(updateDeal.discountPercent) || 0,
      discountValue: parseFloat(updateDeal.discountValue) || 0,
      discountNote: updateDeal.discountNote || undefined,
    });
  };

  const handleConfirmLostReason = () => {
    if (!lostReasonDialog) return;
    updateDealStageMutation.mutate({
      id: lostReasonDialog.dealId,
      stage: 'closed_lost',
      lostReason: lostReasonDialog.lostReason as any,
      lostReasonNote: lostReasonDialog.lostReasonNote || undefined,
    });
  };

  const remainingPct = discountSummary
    ? (discountSummary.remainingDiscount / (discountSummary.allowedDiscount || 1)) * 100
    : 100;
  const remainingColor = remainingPct > 50 ? 'bg-emerald-500' : remainingPct > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">موديول التفاوض والإغلاق</h1>
          <p className="text-sm text-muted-foreground">متابعة الصفقات من التفاوض حتى الإغلاق + نظام الخصومات + تحليل الخسائر</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />إضافة صفقة
          </Button>
        )}
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
          <div className="p-2.5 rounded-xl bg-red-100"><XCircle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-2xl font-bold">{lostAnalysis?.totalLost ?? 0}</p><p className="text-xs text-muted-foreground">صفقات خاسرة</p></div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {[
          { key: 'deals', label: 'الصفقات', icon: BarChart3 },
          { key: 'discount', label: 'نظام الخصومات', icon: Percent },
          { key: 'engineers', label: 'المهندسون', icon: Users },
          { key: 'lost', label: 'الصفقات الخاسرة', icon: TrendingDown },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key === 'lost' && (lostAnalysis?.totalLost ?? 0) > 0 && (
              <Badge className="mr-1 text-xs bg-red-500/20 text-red-400 border-red-500/30">{lostAnalysis?.totalLost}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab: الصفقات ─── */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
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

          {/* Filter + List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2">
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
                {(dealsData?.data ?? []).filter(deal =>
                  !searchQuery || deal.clientName.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(deal => (
                  <div key={deal.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{deal.clientName}</span>
                        <Badge className={`text-xs ${STAGE_COLORS[deal.stage]}`}>{STAGE_LABELS[deal.stage]}</Badge>
                        <span className="text-sm font-bold text-indigo-400">{fmt(parseFloat(deal.value as string))} ج.م</span>
                        {parseFloat(deal.discountValue as string || '0') > 0 && (
                          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/40">
                            خصم {fmt(parseFloat(deal.discountValue as string))} ج.م ({parseFloat(deal.discountPercent as string || '0').toFixed(1)}%)
                          </Badge>
                        )}
                        {deal.stage === 'closed_lost' && (deal as any).lostReason && (
                          <Badge variant="outline" className="text-xs text-red-400 border-red-500/40">
                            {LOST_REASON_OPTIONS.find(r => r.value === (deal as any).lostReason)?.label ?? (deal as any).lostReason}
                          </Badge>
                        )}
                      </div>
                      {deal.nextAction && (
                        <div className="text-xs text-muted-foreground mt-1">
                          🎯 {deal.nextAction}
                          {deal.nextActionDate && <span className="mr-2">📅 {new Date(deal.nextActionDate).toLocaleDateString('ar-EG')}</span>}
                        </div>
                      )}
                      {deal.discountNote && (
                        <div className="text-xs text-amber-400/70 mt-0.5 italic">سبب الخصم: {deal.discountNote}</div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setUpdateDeal({
                            id: deal.id, stage: deal.stage,
                            nextAction: deal.nextAction ?? '', nextActionDate: '',
                            notes: deal.notes ?? '', value: deal.value as string,
                            discountPercent: deal.discountPercent as string || '0',
                            discountValue: deal.discountValue as string || '0',
                            discountNote: deal.discountNote ?? '',
                            lostReason: (deal as any).lostReason ?? '',
                            lostReasonNote: (deal as any).lostReasonNote ?? '',
                          })}>تحديث</Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0" onClick={() => setDeleteTarget(deal.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )) ?? <div className="text-center py-8 text-muted-foreground">لا توجد صفقات</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: نظام الخصومات ─── */}
      {activeTab === 'discount' && (
        <div className="space-y-4">
          {/* Volume Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4 text-emerald-500" /><span className="text-xs text-muted-foreground">المبيعات الفعلية</span></div>
              <div className="text-xl font-bold text-emerald-500">{fmt(discountSummary?.actualSales ?? 0)} ج.م</div>
              <div className="text-xs text-muted-foreground">صفقات مغلقة (closed_won)</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Pipeline</span></div>
              <div className="text-xl font-bold text-blue-500">{fmt(discountSummary?.pipeline ?? 0)} ج.م</div>
              <div className="text-xs text-muted-foreground">صفقات في التفاوض</div>
            </CardContent></Card>
            <Card className="border-2 border-primary/30"><CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1"><BarChart3 className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">إجمالي الحجم</span></div>
              <div className="text-xl font-bold text-primary">{fmt(discountSummary?.totalVolume ?? 0)} ج.م</div>
              <div className="text-xs text-muted-foreground">المبيعات + Pipeline</div>
            </CardContent></Card>
          </div>

          {/* Discount Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-indigo-950/30 border-indigo-800/40"><CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-indigo-400" /><span className="text-xs text-muted-foreground">الشريحة الحالية</span></div>
              <div className="text-2xl font-bold text-indigo-400">{discountSummary?.discountPct ?? 0}%</div>
              <div className="text-xs text-muted-foreground">{discountSummary?.tierLabel ?? '-'}</div>
            </CardContent></Card>
            <Card className="bg-emerald-950/30 border-emerald-800/40"><CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4 text-emerald-400" /><span className="text-xs text-muted-foreground">الخصم المسموح</span></div>
              <div className="text-lg font-bold text-emerald-400">{fmt(discountSummary?.allowedDiscount ?? 0)}</div>
              <div className="text-xs text-muted-foreground">ج.م</div>
            </CardContent></Card>
            <Card className="bg-red-950/30 border-red-800/40"><CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-red-400" /><span className="text-xs text-muted-foreground">المستخدم</span></div>
              <div className="text-lg font-bold text-red-400">{fmt(discountSummary?.usedDiscount ?? 0)}</div>
              <div className="text-xs text-muted-foreground">ج.م</div>
            </CardContent></Card>
            <Card className={`border-2 ${remainingPct > 50 ? 'bg-emerald-950/30 border-emerald-600/50' : remainingPct > 20 ? 'bg-amber-950/30 border-amber-600/50' : 'bg-red-950/30 border-red-600/50'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className={`h-4 w-4 ${remainingPct > 50 ? 'text-emerald-400' : remainingPct > 20 ? 'text-amber-400' : 'text-red-400'}`} />
                  <span className="text-xs text-muted-foreground">المتبقي</span>
                </div>
                <div className={`text-lg font-bold ${remainingPct > 50 ? 'text-emerald-400' : remainingPct > 20 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(discountSummary?.remainingDiscount ?? 0)}</div>
                <div className="text-xs text-muted-foreground">ج.م</div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>استخدام الخصم</span>
                <span>{fmt(discountSummary?.usedDiscount ?? 0)} / {fmt(discountSummary?.allowedDiscount ?? 0)} ج.م</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div className={`h-3 rounded-full transition-all ${remainingColor}`}
                  style={{ width: `${Math.min(100, 100 - remainingPct)}%` }} />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-red-400">مستخدم: {(100 - remainingPct).toFixed(1)}%</span>
                <span className="text-emerald-400">متبقي: {remainingPct.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Tiers Table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">جدول شرائح الخصم</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-right py-2 px-3">الشريحة</th>
                      <th className="text-right py-2 px-3">الحجم</th>
                      <th className="text-right py-2 px-3">نسبة الخصم</th>
                      <th className="text-right py-2 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'شريحة 1', range: 'أقل من 1M', pct: 1, min: 0, max: 1_000_000 },
                      { label: 'شريحة 2', range: '1M - 2M', pct: 3, min: 1_000_000, max: 2_000_000 },
                      { label: 'شريحة 3', range: '2M - 3M', pct: 5, min: 2_000_000, max: 3_000_000 },
                      { label: 'شريحة 4', range: '3M - 5M', pct: 7, min: 3_000_000, max: 5_000_000 },
                      { label: 'شريحة 5', range: 'أكثر من 5M', pct: 10, min: 5_000_000, max: Infinity },
                    ].map(tier => {
                      const tv = discountSummary?.totalVolume ?? 0;
                      const isActive = tv >= tier.min && tv < tier.max;
                      return (
                        <tr key={tier.label} className={`border-b border-border/30 ${isActive ? 'bg-primary/10' : ''}`}>
                          <td className="py-2 px-3 font-medium">
                            {tier.label}
                            {isActive && <Badge className="mr-1 text-xs bg-primary/20 text-primary border-primary/30">الحالية</Badge>}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{tier.range}</td>
                          <td className="py-2 px-3 font-bold text-indigo-400">{tier.pct}%</td>
                          <td className="py-2 px-3">
                            {isActive ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">نشطة</Badge> : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: المهندسون ─── */}
      {activeTab === 'engineers' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Pipeline والخصم لكل مهندس</CardTitle></CardHeader>
            <CardContent>
              {engDiscounts && engDiscounts.length > 0 ? (
                <div className="space-y-3">
                  {engDiscounts.map(eng => (
                    <div key={eng.engineerId} className="border border-border/40 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{eng.engineerName}</span>
                        <Badge variant="outline" className="text-xs">{fmt(eng.pipeline)} ج.م Pipeline</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-emerald-950/30 rounded">
                          <div className="text-emerald-400 font-bold">{fmt(eng.actualSales)}</div>
                          <div className="text-muted-foreground">مبيعات فعلية</div>
                        </div>
                        <div className="text-center p-2 bg-red-950/30 rounded">
                          <div className="text-red-400 font-bold">{fmt(eng.usedDiscount)}</div>
                          <div className="text-muted-foreground">خصم مستخدم</div>
                        </div>
                        <div className="text-center p-2 bg-blue-950/30 rounded">
                          <div className="text-blue-400 font-bold">{fmt(eng.allocatedDiscount)}</div>
                          <div className="text-muted-foreground">خصم متاح</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: الصفقات الخاسرة ─── */}
      {activeTab === 'lost' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-red-950/20 border-red-800/40">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">إجمالي الصفقات الخاسرة</span>
                </div>
                <div className="text-3xl font-bold text-red-400">{lostAnalysis?.totalLost ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  قيمة: {fmt(lostAnalysis?.totalLostValue ?? 0)} ج.م
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-950/20 border-amber-800/40">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">أكثر سبب تكراراً</span>
                </div>
                <div className="text-lg font-bold text-amber-400">
                  {lostAnalysis?.topReason?.label ?? 'لا توجد بيانات'}
                </div>
                {lostAnalysis?.topReason && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {lostAnalysis.topReason.count} صفقة ({lostAnalysis.topReason.percent}%)
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-orange-950/20 border-orange-800/40">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-muted-foreground">المهندس الأكثر خسارة</span>
                </div>
                <div className="text-lg font-bold text-orange-400">
                  {lostAnalysis?.worstEngineer?.engineerName ?? 'لا توجد بيانات'}
                </div>
                {lostAnalysis?.worstEngineer && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {lostAnalysis.worstEngineer.totalLost} صفقة خاسرة
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reason Breakdown Table */}
          {lostAnalysis && lostAnalysis.reasonBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">توزيع أسباب الخسارة</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lostAnalysis.reasonBreakdown.map(item => (
                    <div key={item.reason}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.label}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{item.count} صفقة</span>
                          <span className="font-bold text-red-400">{item.percent}%</span>
                          <span>{fmt(item.value)} ج.م</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-red-500/70 transition-all"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Engineer Breakdown */}
          {lostAnalysis && lostAnalysis.engineerBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">الصفقات الخاسرة لكل مهندس</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="text-right py-2 px-3">المهندس</th>
                        <th className="text-right py-2 px-3">عدد الخسائر</th>
                        <th className="text-right py-2 px-3">القيمة الإجمالية</th>
                        <th className="text-right py-2 px-3">أكثر سبب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lostAnalysis.engineerBreakdown.map(eng => (
                        <tr key={eng.engineerId} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2 px-3 font-medium">{eng.engineerName}</td>
                          <td className="py-2 px-3">
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{eng.totalLost}</Badge>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{fmt(eng.totalLostValue)} ج.م</td>
                          <td className="py-2 px-3">
                            {eng.topReasonLabel ? (
                              <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/40">
                                {eng.topReasonLabel}
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lost Deals List */}
          {lostAnalysis && lostAnalysis.deals.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">قائمة الصفقات الخاسرة</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lostAnalysis.deals.map(deal => (
                    <div key={deal.id} className="flex items-start gap-3 p-3 rounded-xl border border-red-800/20 bg-red-950/10 hover:bg-red-950/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{deal.clientName}</span>
                          <span className="text-sm font-bold text-red-400">{fmt(deal.value)} ج.م</span>
                          <Badge variant="outline" className="text-xs text-red-400 border-red-500/40">
                            {deal.lostReasonLabel}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <span>المهندس: {deal.engineerName}</span>
                          {deal.closedAt && (
                            <span className="mr-3">📅 {new Date(deal.closedAt).toLocaleDateString('ar-EG')}</span>
                          )}
                        </div>
                        {deal.lostReasonNote && (
                          <div className="text-xs text-muted-foreground/70 mt-0.5 italic">ملاحظة: {deal.lostReasonNote}</div>
                        )}
                      </div>
                      {canEdit && (
                        <Button size="sm" variant="outline" className="text-xs h-7 shrink-0 border-red-800/40 text-red-400 hover:bg-red-950/30" onClick={() => setUpdateDeal({
                          id: deal.id, stage: 'closed_lost',
                          nextAction: '', nextActionDate: '',
                          notes: '', value: String(deal.value),
                          discountPercent: '0', discountValue: '0', discountNote: '',
                          lostReason: deal.lostReason ?? '',
                          lostReasonNote: deal.lostReasonNote ?? '',
                        })}>تحديث</Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(!lostAnalysis || lostAnalysis.totalLost === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <XCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد صفقات خاسرة حتى الآن</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Add Deal Dialog ─── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            {/* Discount */}
            <div className="border border-amber-800/30 rounded-lg p-3 bg-amber-950/10 space-y-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">الخصم</span>
                {discountSummary && (
                  <span className="text-xs text-muted-foreground mr-auto">
                    متبقي: <span className="text-emerald-400 font-medium">{fmt(discountSummary.remainingDiscount)} ج.م</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">نسبة الخصم (%)</Label>
                  <Input type="number" min="0" max="100" step="0.1" value={newDeal.discountPercent} onChange={e => handleNewDiscountPctChange(e.target.value)} /></div>
                <div><Label className="text-xs">قيمة الخصم (ج.م)</Label>
                  <Input type="number" min="0" value={newDeal.discountValue} onChange={e => handleNewDiscountValChange(e.target.value)} /></div>
              </div>
              <div><Label className="text-xs">سبب الخصم</Label>
                <Input value={newDeal.discountNote} onChange={e => setNewDeal(p => ({ ...p, discountNote: e.target.value }))} placeholder="مثال: عميل VIP، مشروع كبير..." /></div>
              {parseFloat(newDeal.discountValue) > (discountSummary?.remainingDiscount ?? Infinity) && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/30 rounded p-2">
                  <AlertTriangle className="h-3.5 w-3.5" />الخصم يتجاوز الحد المتبقي!
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Update Deal Dialog ─── */}
      <Dialog open={!!updateDeal} onOpenChange={() => setUpdateDeal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تحديث الصفقة</DialogTitle></DialogHeader>
          {updateDeal && (
            <div className="space-y-3">
              <div><Label>المرحلة</Label>
                <Select value={updateDeal.stage} onValueChange={handleStageChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                {updateDeal.stage === 'closed_lost' && (
                  <div className="mt-2 space-y-2 p-3 rounded-lg border border-red-800/30 bg-red-950/10">
                    <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />حقول الصفقة الخاسرة
                    </p>
                    <div>
                      <Label className="text-xs">سبب الخسارة</Label>
                      <Select value={updateDeal.lostReason ?? ''} onValueChange={v => setUpdateDeal(d => d ? { ...d, lostReason: v } : null)}>
                        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="اختر السبب" /></SelectTrigger>
                        <SelectContent>{LOST_REASON_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">ملاحظة إضافية</Label>
                      <Input className="mt-1 h-8 text-xs" value={updateDeal.lostReasonNote ?? ''} onChange={e => setUpdateDeal(d => d ? { ...d, lostReasonNote: e.target.value } : null)} placeholder="تفاصيل إضافية..." />
                    </div>
                  </div>
                )}
              </div>
              <div><Label>قيمة الصفقة (ج.م)</Label><Input type="number" value={updateDeal.value} onChange={e => setUpdateDeal(d => d ? { ...d, value: e.target.value } : null)} /></div>
              <div><Label>الخطوة التالية</Label><Input value={updateDeal.nextAction} onChange={e => setUpdateDeal(d => d ? { ...d, nextAction: e.target.value } : null)} /></div>
              <div><Label>تاريخ الخطوة التالية</Label><Input type="date" value={updateDeal.nextActionDate} onChange={e => setUpdateDeal(d => d ? { ...d, nextActionDate: e.target.value } : null)} /></div>
              <div><Label>ملاحظات</Label><Textarea value={updateDeal.notes} onChange={e => setUpdateDeal(d => d ? { ...d, notes: e.target.value } : null)} rows={2} /></div>
              {/* Discount */}
              <div className="border border-amber-800/30 rounded-lg p-3 bg-amber-950/10 space-y-2">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">الخصم</span>
                  {discountSummary && (
                    <span className="text-xs text-muted-foreground mr-auto">
                      متبقي: <span className="text-emerald-400 font-medium">{fmt(discountSummary.remainingDiscount)} ج.م</span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">نسبة الخصم (%)</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={updateDeal.discountPercent} onChange={e => handleUpdateDiscountPctChange(e.target.value)} /></div>
                  <div><Label className="text-xs">قيمة الخصم (ج.م)</Label>
                    <Input type="number" min="0" value={updateDeal.discountValue} onChange={e => handleUpdateDiscountValChange(e.target.value)} /></div>
                </div>
                <div><Label className="text-xs">سبب الخصم</Label>
                  <Input value={updateDeal.discountNote} onChange={e => setUpdateDeal(d => d ? { ...d, discountNote: e.target.value } : null)} placeholder="مثال: عميل VIP، مشروع كبير..." /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDeal(null)}>إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending || updateDealStageMutation.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Lost Reason Dialog ─── */}
      <Dialog open={!!lostReasonDialog} onOpenChange={() => setLostReasonDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              سبب خسارة الصفقة
            </DialogTitle>
          </DialogHeader>
          {lostReasonDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-red-950/20 border border-red-800/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  يرجى تحديد سبب خسارة هذه الصفقة لمساعدتنا في تحسين الأداء وتحليل نقاط الضعف.
                </p>
              </div>
              <div>
                <Label>سبب الخسارة *</Label>
                <Select
                  value={lostReasonDialog.lostReason}
                  onValueChange={v => setLostReasonDialog(d => d ? { ...d, lostReason: v } : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر السبب" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOST_REASON_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ملاحظات إضافية (اختياري)</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder="أضف تفاصيل أو ملاحظات إضافية..."
                  value={lostReasonDialog.lostReasonNote}
                  onChange={e => setLostReasonDialog(d => d ? { ...d, lostReasonNote: e.target.value } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostReasonDialog(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmLostReason}
              disabled={updateDealStageMutation.isPending}
            >
              تأكيد الخسارة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason: DeleteReason, reasonCustom?: string) => {
          if (deleteTarget !== null) softDeleteMut.mutate({ id: deleteTarget, reason, reasonCustom });
        }}
        title="حذف الصفقة"
        description="هل أنت متأكد من حذف هذه الصفقة؟ سيتم إخفاؤها مع الاحتفاظ بالبيانات."
        isLoading={softDeleteMut.isPending}
      />
    </div>
  );
}
