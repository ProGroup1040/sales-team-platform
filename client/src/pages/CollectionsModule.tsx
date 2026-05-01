import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DollarSign, AlertTriangle, CheckCircle, Plus, Calendar,
  Clock, User, CreditCard, FileText, Bell, Award, ChevronDown, ChevronUp,
  Banknote, HandshakeIcon, TrendingUp, Upload, Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d as string).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
};

const STATUS_LABELS: Record<string, string> = { on_track: "في الموعد", due_soon: "يستحق قريباً", overdue: "متأخر", completed: "مكتمل" };
const STATUS_COLORS: Record<string, string> = { on_track: "bg-emerald-100 text-emerald-700", due_soon: "bg-amber-100 text-amber-700", overdue: "bg-red-100 text-red-700", completed: "bg-blue-100 text-blue-700" };
const PROMISE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-amber-100 text-amber-700" },
  paid: { label: "تم الدفع", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "متأخر", color: "bg-red-100 text-red-700" },
};
const PAYMENT_TYPE: Record<string, string> = { initial: "مقدم", installment: "قسط", final: "دفعة نهائية", visit_fee: "رسوم معاينة" };

export default function CollectionsModule() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddContract, setShowAddContract] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState<number | null>(null);
  const [showAddPromise, setShowAddPromise] = useState<number | null>(null);
  const [expandedContract, setExpandedContract] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newContract, setNewContract] = useState({ clientName: "", contractAmount: "", dueDate: "", notes: "" });
  const [newPayment, setNewPayment] = useState<{ amount: string; paymentDate: string; paymentType: "initial" | "installment" | "final" | "visit_fee"; receiptNumber: string; notes: string; engineerId: string }>({ amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentType: "installment", receiptNumber: "", notes: "", engineerId: "" });
  const [newPromise, setNewPromise] = useState({ promiseAmount: "", promiseDate: "", notes: "" });

  const utils = trpc.useUtils();
  const { data: contracts = [], isLoading } = trpc.financial.allContracts.useQuery({});
  const { data: followUp } = trpc.financial.dailyFollowUp.useQuery();
  const { data: engCommission = [] } = trpc.financial.engineersCommission.useQuery();
  const { data: engineers = [] } = trpc.engineers.list.useQuery();

  const now = new Date();
  const [currentMonth] = useState(now.getMonth() + 1);
  const [currentYear] = useState(now.getFullYear());
  const [filterDept, setFilterDept] = useState("all");
  const [newPaymentReceiptUrl, setNewPaymentReceiptUrl] = useState("");
  const [newPaymentNextDate, setNewPaymentNextDate] = useState("");

  // New endpoints
  const { data: collectionDashboard } = trpc.financial.dashboard.useQuery({ month: currentMonth, year: currentYear });
  const { data: collectionAlerts = [] } = trpc.financial.alerts.useQuery();
  const { data: contractsWithComm = [] } = trpc.financial.contractsWithCommission.useQuery({});

  // Filter: Sales Engineers + Sales Specialists + Admin Sales only
  const SALES_DEPTS = ["sales_engineer", "sales_specialist", "admin_sales"];
  const salesEngineers = engineers.filter((e: any) => SALES_DEPTS.includes(e.department ?? e.role ?? ""));

  const addPaymentWithFollowUpMut = trpc.financial.addPaymentWithFollowUp.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الدفعة وإنشاء متابعة");
      setShowAddPayment(null);
      setNewPaymentReceiptUrl("");
      setNewPaymentNextDate("");
      utils.financial.allContracts.invalidate();
      utils.financial.contractsWithCommission.invalidate();
      utils.financial.alerts.invalidate();
      utils.financial.dashboard.invalidate();
    },
    onError: () => toast.error("حدث خطأ في تسجيل الدفعة"),
  });

  const autoCreateContractMut = trpc.financial.autoCreateContract.useMutation({
    onSuccess: (res) => {
      if (res?.isNew) toast.success("تم إنشاء العقد تلقائياً من الصفقة");
      else toast.info("العقد موجود بالفعل");
      utils.financial.allContracts.invalidate();
    },
  });

  const alertsDueToday = collectionAlerts.filter((a: any) => a.type === "due_today");
  const alertsOverdue = collectionAlerts.filter((a: any) => a.type === "overdue");
  const alertsUpcoming = collectionAlerts.filter((a: any) => a.type === "upcoming");

  const addContractMut = trpc.financial.addContract.useMutation({
    onSuccess: () => { toast.success("تم إضافة العقد"); setShowAddContract(false); setNewContract({ clientName: "", contractAmount: "", dueDate: "", notes: "" }); utils.financial.allContracts.invalidate(); },
    onError: () => toast.error("حدث خطأ"),
  });
  const addPaymentMut = trpc.financial.addPayment.useMutation({
    onSuccess: () => { toast.success("تم تسجيل الدفعة"); setShowAddPayment(null); utils.financial.allContracts.invalidate(); utils.financial.engineersCommission.invalidate(); },
    onError: () => toast.error("حدث خطأ"),
  });
  const addPromiseMut = trpc.financial.addPromise.useMutation({
    onSuccess: () => { toast.success("تم تسجيل وعد الدفع"); setShowAddPromise(null); utils.financial.allContracts.invalidate(); },
    onError: () => toast.error("حدث خطأ"),
  });
  const updatePromiseMut = trpc.financial.updatePromise.useMutation({
    onSuccess: () => { toast.success("تم تحديث حالة الوعد"); utils.financial.allContracts.invalidate(); utils.financial.dailyFollowUp.invalidate(); },
  });

  const stats = useMemo(() => {
    const totalContracts = contracts.reduce((s, c) => s + parseFloat(c.contractAmount as string), 0);
    const totalCollected = contracts.reduce((s, c) => s + (c.totalPaid ?? 0), 0);
    const totalRemaining = contracts.reduce((s, c) => s + (c.remaining ?? 0), 0);
    const totalOverdue = contracts.filter(c => c.status === "overdue").reduce((s, c) => s + (c.remaining ?? 0), 0);
    const collectionRate = totalContracts > 0 ? Math.round((totalCollected / totalContracts) * 100) : 0;
    return { totalContracts, totalCollected, totalRemaining, totalOverdue, collectionRate };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    if (filterStatus === "all") return contracts;
    return contracts.filter(c => c.status === filterStatus);
  }, [contracts, filterStatus]);

  const chartData = [
    { name: "إجمالي العقود", value: stats.totalContracts, fill: "#6366f1" },
    { name: "المحصّل", value: stats.totalCollected, fill: "#10b981" },
    { name: "المستحق", value: stats.totalRemaining, fill: "#f59e0b" },
    { name: "المتأخر", value: stats.totalOverdue, fill: "#ef4444" },
  ];

  const commissionTotal = engCommission.reduce((s, e) => s + e.totalCommission, 0);
  const commissionPaid = engCommission.reduce((s, e) => s + e.commPaid, 0);
  const commissionPending = engCommission.reduce((s, e) => s + e.commPending, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="w-7 h-7 text-emerald-500" />
            التحصيل المالي
          </h1>
          <p className="text-muted-foreground text-sm mt-1">متابعة التحصيل • وعود الدفع • الكوميشن على المحصّل</p>
        </div>
        <Button onClick={() => setShowAddContract(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="w-4 h-4" /> إضافة عقد
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">إجمالي العقود</span>
              <DollarSign className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{fmt(stats.totalContracts)}</div>
            <div className="text-xs text-muted-foreground">ج.م</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">المحصّل</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(stats.totalCollected)}</div>
            <div className="text-xs text-muted-foreground">{stats.collectionRate}% من الإجمالي</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">المستحق</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{fmt(stats.totalRemaining)}</div>
            <div className="text-xs text-muted-foreground">ج.م</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">المتأخر</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-xl font-bold text-red-700 dark:text-red-300">{fmt(stats.totalOverdue)}</div>
            <div className="text-xs text-muted-foreground">ج.م - يحتاج متابعة</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
          <TabsTrigger value="contracts">العقود والتحصيل</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            تنبيهات
            {collectionAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {collectionAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="followup">المتابعة اليومية</TabsTrigger>
          <TabsTrigger value="commission">الكوميشن</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        {/* Tab: Dashboard */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">تحصيل اليوم</span>
                </div>
                <div className="text-xl font-bold text-blue-700">{fmt(collectionDashboard?.today?.collected ?? 0)}</div>
                <div className="text-xs text-muted-foreground">{collectionDashboard?.today?.count ?? 0} دفعة</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">تحصيل الشهر</span>
                </div>
                <div className="text-xl font-bold text-emerald-700">{fmt(collectionDashboard?.month?.collected ?? 0)}</div>
                <div className="text-xs text-muted-foreground">{collectionDashboard?.month?.count ?? 0} دفعة</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">متأخرة</span>
                </div>
                <div className="text-xl font-bold text-red-700">{collectionDashboard?.overdue?.count ?? 0} عقد</div>
                <div className="text-xs text-muted-foreground">{fmt(collectionDashboard?.overdue?.remaining ?? 0)} ج.م</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">قادمة (7 أيام)</span>
                </div>
                <div className="text-xl font-bold text-amber-700">{collectionDashboard?.upcoming?.count ?? 0} وعد</div>
                <div className="text-xs text-muted-foreground">{fmt(collectionDashboard?.upcoming?.total ?? 0)} ج.م</div>
              </CardContent>
            </Card>
          </div>

          {/* Commission on Collected */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-500" />
                الكوميشن على المحصّل (لا على العقد الكامل)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contractsWithComm.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium text-sm">{c.clientName}</div>
                      <div className="text-xs text-muted-foreground">{c.engineerName ?? "غير محدد"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">{fmt(c.commissionEarned)} ج.م</div>
                      <div className="text-xs text-muted-foreground">
                        {c.commissionRate}% × {fmt(c.collectedAmount)} محصّل
                      </div>
                    </div>
                    <div className="text-right">
                      <Progress value={c.collectionRate} className="w-20 h-2" />
                      <div className="text-xs text-muted-foreground mt-1">{Math.round(c.collectionRate)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Alerts */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          {alertsDueToday.length > 0 && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> مستحقة اليوم ({alertsDueToday.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertsDueToday.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-red-950/30">
                    <div>
                      <div className="font-medium text-sm">{a.clientName}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(a.date)}</div>
                    </div>
                    <div className="font-bold text-red-600">{fmt(a.amount)} ج.م</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {alertsOverdue.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> متأخرة ({alertsOverdue.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertsOverdue.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-orange-950/30">
                    <div>
                      <div className="font-medium text-sm">{a.clientName}</div>
                      <div className="text-xs text-muted-foreground">كان مقرراً: {fmtDate(a.date)}</div>
                    </div>
                    <div className="font-bold text-orange-600">{fmt(a.amount)} ج.م</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {alertsUpcoming.length > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-blue-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> قادمة خلال 7 أيام ({alertsUpcoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertsUpcoming.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-blue-950/30">
                    <div>
                      <div className="font-medium text-sm">{a.clientName}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(a.date)}</div>
                    </div>
                    <div className="font-bold text-blue-600">{fmt(a.amount)} ج.م</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {collectionAlerts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p>لا توجد تنبيهات حالياً</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Contracts */}
        <TabsContent value="contracts" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="تصفية حسب الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="on_track">في الموعد</SelectItem>
                <SelectItem value="due_soon">يستحق قريباً</SelectItem>
                <SelectItem value="overdue">متأخر</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{filteredContracts.length} عقد</span>
          </div>

          <div className="space-y-3">
            {isLoading && <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>}
            {filteredContracts.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد عقود بعد</p>
                <Button variant="outline" className="mt-3" onClick={() => setShowAddContract(true)}>إضافة أول عقد</Button>
              </div>
            )}
            {filteredContracts.map((contract) => (
              <Card key={contract.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{contract.clientName}</span>
                        <Badge className={STATUS_COLORS[contract.status] || "bg-gray-100 text-gray-700"}>
                          {STATUS_LABELS[contract.status] || contract.status}
                          {contract.status === "overdue" && " ⚠"}
                        </Badge>
                        {contract.stage1Commission?.status === "pending" && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">🏆 كوميشن Stage 1 مستحق</Badge>
                        )}
                        {contract.stage2Commission?.status === "pending" && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">🏆 كوميشن Stage 2 مستحق</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span>العقد: <strong className="text-foreground">{fmt(parseFloat(contract.contractAmount as string))} ج.م</strong></span>
                        <span>المحصّل: <strong className="text-emerald-600">{fmt(contract.totalPaid ?? 0)} ج.م</strong></span>
                        <span>المتبقي: <strong className="text-amber-600">{fmt(contract.remaining ?? 0)} ج.م</strong></span>
                        {contract.dueDate && <span>📅 {fmtDate(contract.dueDate as unknown as string)}</span>}
                      </div>
                      <div className="mt-2">
                        <Progress value={contract.pct ?? 0} className="h-2" />
                        <span className="text-xs text-muted-foreground">{contract.pct ?? 0}% محصّل</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setShowAddPayment(contract.id)} className="gap-1 text-xs">
                        <Plus className="w-3 h-3" /> دفعة
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddPromise(contract.id)} className="gap-1 text-xs">
                        <Calendar className="w-3 h-3" /> وعد
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExpandedContract(expandedContract === contract.id ? null : contract.id)}>
                        {expandedContract === contract.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {expandedContract === contract.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {contract.payments && contract.payments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-500" /> سجل الدفعات ({contract.payments.length})
                          </h4>
                          <div className="space-y-1">
                            {(contract.payments as Array<{ id: number; amount: string | number; paymentDate: string | Date; paymentType: string; receiptNumber?: string }>).map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded px-3 py-1.5">
                                <span className="text-emerald-700 font-medium">{fmt(parseFloat(p.amount as string))} ج.م</span>
                                <span className="text-muted-foreground">{PAYMENT_TYPE[p.paymentType] || p.paymentType}</span>
                                <span className="text-muted-foreground">{fmtDate(p.paymentDate as string)}</span>
                                {p.receiptNumber && <span className="text-xs text-muted-foreground">#{p.receiptNumber}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {contract.promises && contract.promises.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <HandshakeIcon className="w-4 h-4 text-amber-500" /> وعود الدفع ({contract.promises.length})
                          </h4>
                          <div className="space-y-1">
                            {(contract.promises as Array<{ id: number; promiseAmount: string | number; promiseDate: string | Date; status: string }>).map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-sm bg-amber-50 dark:bg-amber-950/20 rounded px-3 py-1.5">
                                <span className="font-medium">{fmt(parseFloat(p.promiseAmount as string))} ج.م</span>
                                <span className="text-muted-foreground">📅 {fmtDate(p.promiseDate as string)}</span>
                                <Badge className={PROMISE_STATUS[p.status]?.color || "bg-gray-100 text-gray-700"}>
                                  {PROMISE_STATUS[p.status]?.label || p.status}
                                </Badge>
                                {p.status === "pending" && (
                                  <Button size="sm" variant="ghost" className="h-6 text-xs text-emerald-600"
                                    onClick={() => updatePromiseMut.mutate({ id: p.id, status: "paid" })}>
                                    ✓ تم
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(contract.stage1Commission || contract.stage2Commission) && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-500" /> الكوميشن بالمرحلتين
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {contract.stage1Commission && (
                              <div className={`rounded p-2 text-sm ${contract.stage1Commission.status === "paid" ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-purple-50 dark:bg-purple-950/20"}`}>
                                <div className="font-medium">Stage 1 (50%)</div>
                                <div className="text-muted-foreground text-xs">عند 75% تحصيل</div>
                                <div className="font-bold text-purple-700">{fmt(parseFloat(contract.stage1Commission.commissionAmount as string))} ج.م</div>
                                <Badge className={contract.stage1Commission.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                                  {contract.stage1Commission.status === "paid" ? "تم الصرف" : "مستحق"}
                                </Badge>
                              </div>
                            )}
                            {contract.stage2Commission && (
                              <div className={`rounded p-2 text-sm ${contract.stage2Commission.status === "paid" ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-blue-50 dark:bg-blue-950/20"}`}>
                                <div className="font-medium">Stage 2 (50%)</div>
                                <div className="text-muted-foreground text-xs">عند استلام العميل</div>
                                <div className="font-bold text-blue-700">{fmt(parseFloat(contract.stage2Commission.commissionAmount as string))} ج.م</div>
                                <Badge className={contract.stage2Commission.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                                  {contract.stage2Commission.status === "paid" ? "تم الصرف" : "مستحق"}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Follow-up */}
        <TabsContent value="followup" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" /> مستحق اليوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!followUp?.dueToday || followUp.dueToday.length === 0) ? (
                  <div className="text-sm text-muted-foreground text-center py-4">لا توجد مستحقات اليوم ✅</div>
                ) : (
                  <div className="space-y-2">
                    {(followUp.dueToday as Array<{ id: number; clientName: string; contractAmount: string | number; collectedAmount: string | number }>).map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm bg-amber-50 dark:bg-amber-950/20 rounded px-3 py-2">
                        <span className="font-medium">{c.clientName}</span>
                        <span className="text-amber-700">{fmt(parseFloat(c.contractAmount as string) - parseFloat(c.collectedAmount as string))} ج.م</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> متأخر — يحتاج متابعة فورية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!followUp?.overdue || followUp.overdue.length === 0) ? (
                  <div className="text-sm text-muted-foreground text-center py-4">لا توجد متأخرات ✅</div>
                ) : (
                  <div className="space-y-2">
                    {(followUp.overdue as Array<{ id: number; clientName: string; contractAmount: string | number; collectedAmount: string | number; dueDate?: string | Date }>).map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm bg-red-50 dark:bg-red-950/20 rounded px-3 py-2">
                        <span className="font-medium">{c.clientName}</span>
                        <span className="text-red-700">{fmt(parseFloat(c.contractAmount as string) - parseFloat(c.collectedAmount as string))} ج.م</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(c.dueDate as string)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <HandshakeIcon className="w-4 h-4 text-purple-500" /> وعود دفع اليوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!followUp?.promisesDueToday || followUp.promisesDueToday.length === 0) ? (
                  <div className="text-sm text-muted-foreground text-center py-4">لا توجد وعود اليوم</div>
                ) : (
                  <div className="space-y-2">
                    {(followUp.promisesDueToday as Array<{ id: number; clientName: string; promiseAmount: string | number; status: string }>).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm bg-purple-50 dark:bg-purple-950/20 rounded px-3 py-2">
                        <span className="font-medium">{p.clientName}</span>
                        <span className="text-purple-700">{fmt(parseFloat(p.promiseAmount as string))} ج.م</span>
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-emerald-600"
                          onClick={() => updatePromiseMut.mutate({ id: p.id, status: "paid" })}>
                          ✓ تم الدفع
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> وعود دفع متأخرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!followUp?.promisesOverdue || followUp.promisesOverdue.length === 0) ? (
                  <div className="text-sm text-muted-foreground text-center py-4">لا توجد وعود متأخرة ✅</div>
                ) : (
                  <div className="space-y-2">
                    {(followUp.promisesOverdue as Array<{ id: number; clientName: string; promiseAmount: string | number; promiseDate: string | Date }>).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm bg-orange-50 dark:bg-orange-950/20 rounded px-3 py-2">
                        <span className="font-medium">{p.clientName}</span>
                        <span className="text-orange-700">{fmt(parseFloat(p.promiseAmount as string))} ج.م</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(p.promiseDate as string)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Commission */}
        <TabsContent value="commission" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30">
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">إجمالي الكوميشن المستحق</div>
                <div className="text-xl font-bold text-purple-700">{fmt(commissionTotal)} ج.م</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30">
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">تم الصرف</div>
                <div className="text-xl font-bold text-emerald-700">{fmt(commissionPaid)} ج.م</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30">
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">قيد الانتظار</div>
                <div className="text-xl font-bold text-amber-700">{fmt(commissionPending)} ج.م</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> قواعد الكوميشن (على التحصيل الفعلي فقط)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {[
                  { range: "أقل من 1,000,000", rate: "لا كوميشن", color: "bg-gray-100 text-gray-600" },
                  { range: "1M → 1.25M", rate: "1%", color: "bg-blue-100 text-blue-700" },
                  { range: "1.25M → 1.5M", rate: "1.25%", color: "bg-indigo-100 text-indigo-700" },
                  { range: "1.5M → 1.75M", rate: "1.5%", color: "bg-violet-100 text-violet-700" },
                  { range: "1.75M → 2M", rate: "1.75%", color: "bg-purple-100 text-purple-700" },
                  { range: "2M+", rate: "2% + 0.25%/250K", color: "bg-pink-100 text-pink-700" },
                ].map((t) => (
                  <div key={t.range} className={`rounded p-2 ${t.color}`}>
                    <div className="font-semibold">{t.rate}</div>
                    <div className="opacity-80">{t.range}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-blue-700">
                <strong>نظام الصرف بالمرحلتين:</strong><br />
                • Stage 1: 50% من الكوميشن عند تحصيل 75% من قيمة العقد<br />
                • Stage 2: 50% المتبقية عند استلام العميل (100% تحصيل)
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-purple-500" /> كوميشن المهندسين من التحصيل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-right py-2 pr-2">المهندس</th>
                      <th className="text-center py-2">المحصّل</th>
                      <th className="text-center py-2">الكوميشن</th>
                      <th className="text-center py-2">Stage 1</th>
                      <th className="text-center py-2">Stage 2</th>
                      <th className="text-center py-2">المدفوع</th>
                      <th className="text-center py-2">المستحق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engCommission.map((e) => (
                      <tr key={e.engineer.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 pr-2 font-medium">{e.engineer.name}</td>
                        <td className="text-center py-2 text-emerald-600">{fmt(e.totalCollected)}</td>
                        <td className="text-center py-2 font-bold text-purple-700">{fmt(e.totalCommission)}</td>
                        <td className="text-center py-2">
                          {e.stage1Pending > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">{e.stage1Pending} مستحق</Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="text-center py-2">
                          {e.stage2Pending > 0 ? (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">{e.stage2Pending} مستحق</Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="text-center py-2 text-emerald-600">{fmt(e.commPaid)}</td>
                        <td className="text-center py-2 text-amber-600 font-medium">{fmt(e.commPending)}</td>
                      </tr>
                    ))}
                    {engCommission.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">لا توجد بيانات تحصيل بعد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">مقارنة المبيعات والتحصيل</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}م`} />
                    <Tooltip formatter={(v: number) => [`${fmt(v)} ج.م`]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">معدل التحصيل الإجمالي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-600">{stats.collectionRate}%</div>
                  <div className="text-sm text-muted-foreground mt-1">نسبة التحصيل</div>
                </div>
                <Progress value={stats.collectionRate} className="h-3" />
                <div className="grid grid-cols-2 gap-2 text-xs text-center">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded p-2">
                    <div className="font-bold text-emerald-700">{fmt(stats.totalCollected)}</div>
                    <div className="text-muted-foreground">محصّل</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-2">
                    <div className="font-bold text-amber-700">{fmt(stats.totalRemaining)}</div>
                    <div className="text-muted-foreground">متبقي</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">توزيع حالات العقود</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {["on_track", "due_soon", "overdue", "completed"].map((s) => {
                    const count = contracts.filter(c => c.status === s).length;
                    const total = contracts.length;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={s} className={`rounded-lg p-3 text-center ${STATUS_COLORS[s]}`}>
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-xs mt-1">{STATUS_LABELS[s]}</div>
                        <div className="text-xs opacity-70">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Add Contract */}
      <Dialog open={showAddContract} onOpenChange={setShowAddContract}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة عقد جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم العميل *</Label><Input value={newContract.clientName} onChange={e => setNewContract(p => ({ ...p, clientName: e.target.value }))} placeholder="اسم العميل أو الشركة" /></div>
            <div><Label>قيمة العقد (ج.م) *</Label><Input type="number" value={newContract.contractAmount} onChange={e => setNewContract(p => ({ ...p, contractAmount: e.target.value }))} placeholder="0" /></div>
            <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={newContract.dueDate} onChange={e => setNewContract(p => ({ ...p, dueDate: e.target.value }))} /></div>
            <div><Label>ملاحظات</Label><Input value={newContract.notes} onChange={e => setNewContract(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContract(false)}>إلغاء</Button>
            <Button onClick={() => addContractMut.mutate({ clientName: newContract.clientName, contractAmount: parseFloat(newContract.contractAmount), dueDate: newContract.dueDate || undefined, notes: newContract.notes || undefined })}
              disabled={!newContract.clientName || !newContract.contractAmount || addContractMut.isPending}>
              {addContractMut.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Payment */}
      <Dialog open={showAddPayment !== null} onOpenChange={() => setShowAddPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تسجيل دفعة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>المبلغ (ج.م) *</Label><Input type="number" value={newPayment.amount} onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))} placeholder="0" /></div>
            <div><Label>تاريخ الدفع *</Label><Input type="date" value={newPayment.paymentDate} onChange={e => setNewPayment(p => ({ ...p, paymentDate: e.target.value }))} /></div>
            <div>
              <Label>نوع الدفعة</Label>
              <Select value={newPayment.paymentType} onValueChange={v => setNewPayment(p => ({ ...p, paymentType: v as "initial" | "installment" | "final" | "visit_fee" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">مقدم</SelectItem>
                  <SelectItem value="installment">قسط</SelectItem>
                  <SelectItem value="final">دفعة نهائية</SelectItem>
                  <SelectItem value="visit_fee">رسوم معاينة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المهندس المسؤول</Label>
              <Select value={newPayment.engineerId} onValueChange={v => setNewPayment(p => ({ ...p, engineerId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
                <SelectContent>
                  {(engineers as Array<{ id: number; name: string }>).map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>رقم الإيصال</Label><Input value={newPayment.receiptNumber} onChange={e => setNewPayment(p => ({ ...p, receiptNumber: e.target.value }))} placeholder="اختياري" /></div>
            <div><Label>ملاحظات</Label><Input value={newPayment.notes} onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPayment(null)}>إلغاء</Button>
            <Button onClick={() => {
              if (!showAddPayment || !newPayment.amount) return toast.error("يرجى إدخال المبلغ");
              const contract = contracts.find(c => c.id === showAddPayment);
              addPaymentMut.mutate({
                collectionId: showAddPayment,
                clientName: contract?.clientName ?? "",
                amount: parseFloat(newPayment.amount),
                paymentDate: newPayment.paymentDate,
                paymentType: newPayment.paymentType,
                addedBy: "admin",
                receiptNumber: newPayment.receiptNumber || undefined,
                notes: newPayment.notes || undefined,
                engineerId: newPayment.engineerId ? parseInt(newPayment.engineerId) : undefined,
              });
            }} disabled={addPaymentMut.isPending}>
              {addPaymentMut.isPending ? "جاري الحفظ..." : "تسجيل الدفعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Promise */}
      <Dialog open={showAddPromise !== null} onOpenChange={() => setShowAddPromise(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تسجيل وعد دفع</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>مبلغ الوعد (ج.م) *</Label><Input type="number" value={newPromise.promiseAmount} onChange={e => setNewPromise(p => ({ ...p, promiseAmount: e.target.value }))} placeholder="0" /></div>
            <div><Label>تاريخ الوعد *</Label><Input type="date" value={newPromise.promiseDate} onChange={e => setNewPromise(p => ({ ...p, promiseDate: e.target.value }))} /></div>
            <div><Label>ملاحظات</Label><Input value={newPromise.notes} onChange={e => setNewPromise(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPromise(null)}>إلغاء</Button>
            <Button onClick={() => {
              if (!showAddPromise || !newPromise.promiseAmount || !newPromise.promiseDate) return toast.error("يرجى ملء الحقول المطلوبة");
              const contract = contracts.find(c => c.id === showAddPromise);
              addPromiseMut.mutate({
                collectionId: showAddPromise,
                clientName: contract?.clientName ?? "",
                promiseAmount: parseFloat(newPromise.promiseAmount),
                promiseDate: newPromise.promiseDate,
                notes: newPromise.notes || undefined,
              });
            }} disabled={addPromiseMut.isPending}>
              {addPromiseMut.isPending ? "جاري الحفظ..." : "تسجيل الوعد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
