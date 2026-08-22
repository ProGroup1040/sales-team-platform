import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  CirclePause,
  Clock3,
  Filter,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  TimerReset,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

type FilterKey = "all" | "delayed" | "critical" | "missing" | "hold";

const STATUS_META: Record<string, { label: string; className: string }> = {
  on_time: { label: "في الموعد", className: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30" },
  at_risk: { label: "معرّض للتأخير", className: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  delayed: { label: "متأخر", className: "bg-orange-500/15 text-orange-300 border-orange-400/30" },
  critical_delay: { label: "تأخير حرج", className: "bg-rose-500/15 text-rose-300 border-rose-400/30" },
  on_hold: { label: "موقوف", className: "bg-slate-500/15 text-slate-300 border-slate-400/30" },
  completed: { label: "مكتمل", className: "bg-sky-500/15 text-sky-300 border-sky-400/30" },
  closed: { label: "مغلق", className: "bg-slate-500/15 text-slate-300 border-slate-400/30" },
};

const formatMoney = (value: unknown) => `${Number(value ?? 0).toLocaleString("ar-EG")} ج.م`;
const formatDate = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
};
const toDateInput = (value: unknown) => value ? new Date(String(value)).toISOString().slice(0, 10) : "";

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`whitespace-nowrap font-medium ${meta.className}`}>{meta.label}</Badge>;
}

function MetricCard({ title, value, icon: Icon, tone = "blue", subtitle }: {
  title: string; value: number | string; icon: typeof Clock3; tone?: "blue" | "green" | "amber" | "red" | "slate" | "purple"; subtitle?: string;
}) {
  const tones = {
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/25 text-blue-300",
    green: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/25 text-emerald-300",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/25 text-amber-300",
    red: "from-rose-500/20 to-rose-500/5 border-rose-500/25 text-rose-300",
    slate: "from-slate-500/20 to-slate-500/5 border-slate-500/25 text-slate-300",
    purple: "from-violet-500/20 to-violet-500/5 border-violet-500/25 text-violet-300",
  };
  return (
    <Card className={`overflow-hidden border bg-gradient-to-br ${tones[tone]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {subtitle ? <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="rounded-xl bg-background/50 p-2.5 shadow-sm"><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectTimelineModule() {
  const { session } = useLocalAuth();
  const utils = trpc.useUtils();
  const updatedBy = session?.username ?? session?.name ?? "Admin";
  const isManager = ["admin", "manager", "system_user"].includes(session?.role ?? "admin");
  const [quickFilter, setQuickFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [engineerId, setEngineerId] = useState("all");
  const [department, setDepartment] = useState("all");
  const [stageKey, setStageKey] = useState("all");
  const [status, setStatus] = useState("all");
  const [delayOwnerCode, setDelayOwnerCode] = useState("all");
  const [contractFrom, setContractFrom] = useState("");
  const [contractTo, setContractTo] = useState("");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [stageSettingsOpen, setStageSettingsOpen] = useState(false);
  const [nextStageKey, setNextStageKey] = useState("");
  const [responsibleId, setResponsibleId] = useState("all");
  const [transitionNotes, setTransitionNotes] = useState("");
  const [transitionDelayOwner, setTransitionDelayOwner] = useState("all");
  const [transitionDelayReason, setTransitionDelayReason] = useState("all");
  const [transitionDelayNotes, setTransitionDelayNotes] = useState("");
  const [reviewAction, setReviewAction] = useState("");
  const [reviewExpectedDate, setReviewExpectedDate] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [hasBlocker, setHasBlocker] = useState("no");
  const [delayDays, setDelayDays] = useState("");
  const [delayOwner, setDelayOwner] = useState("all");
  const [delayReason, setDelayReason] = useState("all");
  const [delayNotes, setDelayNotes] = useState("");
  const [holdOwner, setHoldOwner] = useState("client");
  const [holdReason, setHoldReason] = useState("site_not_ready");
  const [holdResumeDate, setHoldResumeDate] = useState("");
  const [holdNotes, setHoldNotes] = useState("");

  const configQuery = trpc.projectTimeline.config.useQuery();
  const engineersQuery = trpc.engineers.list.useQuery();

  const queryInput = useMemo(() => ({
    search: search || undefined,
    engineerId: engineerId === "all" ? (isManager ? undefined : session?.engineerId || undefined) : Number(engineerId),
    department: department === "all" ? undefined : department,
    stageKey: stageKey === "all" ? undefined : stageKey,
    status: status === "all" ? undefined : status,
    delayOwnerCode: delayOwnerCode === "all" ? undefined : delayOwnerCode,
    contractFrom: contractFrom || undefined,
    contractTo: contractTo || undefined,
    deliveryFrom: deliveryFrom || undefined,
    deliveryTo: deliveryTo || undefined,
    delayedOnly: quickFilter === "delayed",
    criticalOnly: quickFilter === "critical",
    missingUpdateOnly: quickFilter === "missing",
    onHoldOnly: quickFilter === "hold",
  }), [search, engineerId, isManager, session?.engineerId, department, stageKey, status, delayOwnerCode, contractFrom, contractTo, deliveryFrom, deliveryTo, quickFilter]);

  const listQuery = trpc.projectTimeline.list.useQuery(queryInput, { refetchOnWindowFocus: false });
  const dashboardQuery = trpc.projectTimeline.dashboard.useQuery({
    engineerId: queryInput.engineerId,
    department: queryInput.department,
    stageKey: queryInput.stageKey,
    status: queryInput.status,
    delayedOnly: queryInput.delayedOnly,
    criticalOnly: queryInput.criticalOnly,
    missingUpdateOnly: queryInput.missingUpdateOnly,
  }, { refetchOnWindowFocus: false });
  const detailQuery = trpc.projectTimeline.detail.useQuery({ projectId: detailId ?? 0 }, { enabled: !!detailId });

  const refresh = async () => {
    await Promise.all([
      utils.projectTimeline.list.invalidate(),
      utils.projectTimeline.dashboard.invalidate(),
      detailId ? utils.projectTimeline.detail.invalidate({ projectId: detailId }) : Promise.resolve(),
    ]);
  };

  const syncMutation = trpc.projectTimeline.syncFromDeals.useMutation({
    onSuccess: async (result) => {
      await refresh();
      toast.success(`تمت مزامنة المشاريع: ${result.created} مشروع جديد`);
    },
    onError: (error) => toast.error(error.message),
  });
  const transitionMutation = trpc.projectTimeline.transition.useMutation({
    onSuccess: async () => { await refresh(); toast.success("تم نقل المشروع وتوثيق حركة التسليم"); setTransitionNotes(""); },
    onError: (error) => toast.error(error.message),
  });
  const reviewMutation = trpc.projectTimeline.update.useMutation({
    onSuccess: async () => { await refresh(); toast.success("تم حفظ تحديث المشروع"); setReviewNotes(""); },
    onError: (error) => toast.error(error.message),
  });
  const delayMutation = trpc.projectTimeline.addDelay.useMutation({
    onSuccess: async () => { await refresh(); toast.success("تم تسجيل التأخير في دفتر التأخيرات"); setDelayDays(""); setDelayNotes(""); },
    onError: (error) => toast.error(error.message),
  });
  const holdMutation = trpc.projectTimeline.setHold.useMutation({
    onSuccess: async () => { await refresh(); toast.success("تم تحديث حالة إيقاف المشروع"); },
    onError: (error) => toast.error(error.message),
  });
  const stageConfigMutation = trpc.projectTimeline.updateStageConfig.useMutation({
    onSuccess: async () => {
      await utils.projectTimeline.config.invalidate();
      toast.success("تم حفظ إعدادات المرحلة");
    },
    onError: (error) => toast.error(error.message),
  });

  const config = configQuery.data as any;
  const stages = (config?.stages ?? []) as any[];
  const reasons = (config?.reasons ?? []) as any[];
  const owners = (config?.owners ?? []) as any[];
  const engineers = (engineersQuery.data ?? []) as any[];
  const projects = (listQuery.data ?? []) as any[];
  const dashboard = dashboardQuery.data as any;
  const detail = detailQuery.data as any;
  const selectedProject = detail?.project as any;

  useEffect(() => {
    if (selectedProject) {
      setNextStageKey("");
      setResponsibleId(selectedProject.currentResponsibleId ? String(selectedProject.currentResponsibleId) : "all");
      setReviewAction(selectedProject.nextRequiredAction ?? "");
      setReviewExpectedDate(toDateInput(selectedProject.expectedProjectCompletionDate));
    }
  }, [selectedProject?.id]);

  const departments = useMemo(() => Array.from(new Set(stages.map((item) => item.department))), [stages]);
  const canTransition = nextStageKey && detailId;
  const filteredReasons = reasons.filter((reason) => delayOwner === "all" || reason.ownerCode === delayOwner || reason.category === owners.find((owner) => owner.code === delayOwner)?.category);
  const filteredHoldReasons = reasons.filter((reason) => reason.ownerCode === holdOwner || reason.category === owners.find((owner) => owner.code === holdOwner)?.category);

  return (
    <div dir="rtl" className="min-h-full bg-background px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-l from-primary/15 via-card to-card p-5 shadow-sm md:p-7">
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 flex items-center gap-2 text-primary"><GitBranch className="h-5 w-5" /><span className="text-sm font-semibold">Project Control System</span></div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">تايم لاين المشاريع</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">متابعة رحلة كل مشروع من التعاقد حتى التسليم النهائي، مع توثيق الحركات، قياس SLA، وفصل مسؤولية التأخير عن الإدارة الحالية.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { void refresh(); }} disabled={listQuery.isFetching || dashboardQuery.isFetching}>
                <RefreshCw className={`ml-2 h-4 w-4 ${(listQuery.isFetching || dashboardQuery.isFetching) ? "animate-spin" : ""}`} />تحديث البيانات
              </Button>
              {isManager ? <Button variant="outline" onClick={() => setStageSettingsOpen(true)}><Settings2 className="ml-2 h-4 w-4" />إعدادات المراحل وSLA</Button> : null}
              {isManager ? <Button onClick={() => syncMutation.mutate({ updatedBy })} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="ml-2 h-4 w-4" />}مزامنة الصفقات المغلقة
              </Button> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <MetricCard title="مشاريع نشطة" value={dashboard?.totals?.activeProjects ?? 0} icon={GitBranch} tone="blue" />
          <MetricCard title="في الموعد" value={dashboard?.totals?.onTime ?? 0} icon={CheckCircle2} tone="green" />
          <MetricCard title="معرّضة للتأخير" value={dashboard?.totals?.atRisk ?? 0} icon={Clock3} tone="amber" />
          <MetricCard title="متأخرة" value={dashboard?.totals?.delayed ?? 0} icon={AlertTriangle} tone="amber" />
          <MetricCard title="حرجة" value={dashboard?.totals?.critical ?? 0} icon={ShieldAlert} tone="red" />
          <MetricCard title="موقوفة" value={dashboard?.totals?.onHold ?? 0} icon={CirclePause} tone="slate" />
          <MetricCard title="تحديث مفقود" value={dashboard?.totals?.missingUpdates ?? 0} icon={TimerReset} tone="purple" />
          <MetricCard title="إجمالي أيام التأخير" value={dashboard?.totals?.totalDelayDays ?? 0} icon={CalendarClock} tone="red" subtitle={`شركة ${dashboard?.totals?.companyDelayDays ?? 0} · عميل ${dashboard?.totals?.clientDelayDays ?? 0} · خارجي ${dashboard?.totals?.externalDelayDays ?? 0}`} />
        </section>

        <Card className="border-border/70">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pr-9" placeholder="ابحث باسم العميل أو رقم المشروع أو العقد…" /></div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["all", "الكل"], ["delayed", "المتأخرة"], ["critical", "الحرجة"], ["missing", "تحديث مفقود"], ["hold", "الموقوفة"],
                ] as [FilterKey, string][]).map(([key, label]) => (
                  <Button key={key} size="sm" variant={quickFilter === key ? "default" : "outline"} onClick={() => setQuickFilter(key)}>{label}</Button>
                ))}
                <Button size="sm" variant="outline" onClick={() => setShowFilters((value) => !value)}><Filter className="ml-2 h-4 w-4" />فلاتر متقدمة</Button>
              </div>
            </div>
            {showFilters ? <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {isManager ? <Select value={engineerId} onValueChange={setEngineerId}><SelectTrigger><SelectValue placeholder="مهندس المبيعات" /></SelectTrigger><SelectContent><SelectItem value="all">كل مهندسي المبيعات</SelectItem>{engineers.map((engineer) => <SelectItem key={engineer.id} value={String(engineer.id)}>{engineer.name}</SelectItem>)}</SelectContent></Select> : null}
              <Select value={department} onValueChange={setDepartment}><SelectTrigger><SelectValue placeholder="الإدارة الحالية" /></SelectTrigger><SelectContent><SelectItem value="all">كل الإدارات</SelectItem>{departments.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
              <Select value={stageKey} onValueChange={setStageKey}><SelectTrigger><SelectValue placeholder="المرحلة" /></SelectTrigger><SelectContent><SelectItem value="all">كل المراحل</SelectItem>{stages.map((stage) => <SelectItem key={stage.stageKey} value={stage.stageKey}>{stage.nameAr}</SelectItem>)}</SelectContent></Select>
              <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(STATUS_META).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}</SelectContent></Select>
              <Select value={delayOwnerCode} onValueChange={setDelayOwnerCode}><SelectTrigger><SelectValue placeholder="مسؤول التأخير" /></SelectTrigger><SelectContent><SelectItem value="all">كل المسؤولين</SelectItem>{owners.map((owner) => <SelectItem key={owner.code} value={owner.code}>{owner.labelAr}</SelectItem>)}</SelectContent></Select>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">من تاريخ التعاقد</Label><Input type="date" value={contractFrom} onChange={(event) => setContractFrom(event.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">إلى تاريخ التعاقد</Label><Input type="date" value={contractTo} onChange={(event) => setContractTo(event.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">موعد التسليم حتى</Label><Input type="date" value={deliveryTo} onChange={(event) => setDeliveryTo(event.target.value)} /></div>
            </div> : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70">
          <CardHeader className="border-b bg-muted/20 py-4"><CardTitle className="flex items-center justify-between text-base"><span>المشاريع ({projects.length})</span><span className="text-xs font-normal text-muted-foreground">اضغط على أي مشروع لعرض سجل الحركة والتأخيرات</span></CardTitle></CardHeader>
          <CardContent className="p-0">
            {listQuery.isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : projects.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><GitBranch className="h-10 w-10 text-muted-foreground/40" /><div><p className="font-semibold">لا توجد مشاريع مطابقة للفلاتر</p><p className="mt-1 text-sm text-muted-foreground">يمكن للإدارة مزامنة الصفقات المغلقة لإنشاء مشاريعها التشغيلية تلقائياً.</p></div></div> : <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-right text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">المشروع / العميل</th><th className="px-4 py-3 font-medium">المهندس</th><th className="px-4 py-3 font-medium">المرحلة / الإدارة</th><th className="px-4 py-3 font-medium">أيام المرحلة</th><th className="px-4 py-3 font-medium">الخروج المخطط</th><th className="px-4 py-3 font-medium">الحالة</th><th className="px-4 py-3 font-medium">إجمالي التأخير</th><th className="px-4 py-3 font-medium">مسؤول التأخير</th><th className="px-4 py-3 font-medium">آخر تحديث</th></tr></thead>
                <tbody className="divide-y divide-border/60">{projects.map((project) => <tr key={project.id} onClick={() => setDetailId(project.id)} className="cursor-pointer transition-colors hover:bg-primary/5">
                  <td className="px-4 py-3"><p className="font-semibold text-foreground">{project.clientName}</p><p className="mt-1 text-xs text-muted-foreground">{project.projectCode} · {formatMoney(project.contractValue)}</p></td>
                  <td className="px-4 py-3"><p>{project.salesEngineer?.name ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{project.contractNumber ?? "بدون رقم عقد"}</p></td>
                  <td className="px-4 py-3"><p className="font-medium">{project.currentMovement?.stageName ?? project.currentStageKey}</p><p className="mt-1 text-xs text-muted-foreground">{project.currentDepartment}</p></td>
                  <td className="px-4 py-3"><span className={project.currentStageDelayDays > 0 ? "font-bold text-rose-400" : "font-semibold"}>{project.daysInCurrentStage} يوم</span><p className="mt-1 text-xs text-muted-foreground">تأخير المرحلة: {project.currentStageDelayDays} يوم</p></td>
                  <td className="px-4 py-3">{formatDate(project.currentMovement?.plannedCompletionDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={project.projectStatus} /></td>
                  <td className="px-4 py-3"><span className={project.totalDelayDays > 0 ? "font-bold text-rose-400" : "text-muted-foreground"}>{project.totalDelayDays} يوم</span><p className="mt-1 text-xs text-muted-foreground">موروث: {project.inheritedDelayDays} يوم</p></td>
                  <td className="px-4 py-3"><p>{project.delayOwner?.labelAr ?? "—"}</p><p className="mt-1 max-w-40 truncate text-xs text-muted-foreground">{project.delayReason?.labelAr ?? "—"}</p></td>
                  <td className="px-4 py-3"><p>{formatDate(project.lastUpdatedAt)}</p><p className={`mt-1 text-xs ${project.updateStatus === "missing" ? "text-rose-400" : "text-emerald-400"}`}>{project.updateStatus === "missing" ? "تحديث مفقود" : "محدّث"}</p></td>
                </tr>)}</tbody>
              </table>
            </div>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-6xl overflow-y-auto p-0">
          {detailQuery.isLoading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : !detail ? <div className="p-8 text-center text-muted-foreground">تعذر تحميل تفاصيل المشروع.</div> : <>
            <DialogHeader className="border-b bg-gradient-to-l from-primary/15 to-card px-6 py-5 text-right">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><DialogTitle className="text-xl">{selectedProject.clientName}</DialogTitle><DialogDescription className="mt-1">{selectedProject.projectCode} · {selectedProject.contractNumber ?? "بدون رقم عقد"} · {formatMoney(selectedProject.contractValue)}</DialogDescription></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={selectedProject.projectStatus} /><Badge variant="outline">{selectedProject.currentDepartment}</Badge></div></div>
            </DialogHeader>
            <div className="space-y-5 p-5 md:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard title="إجمالي التأخير" value={`${selectedProject.totalDelayDays} يوم`} icon={AlertTriangle} tone="red" /><MetricCard title="تأخير المرحلة الحالية" value={`${selectedProject.currentStageDelayDays} يوم`} icon={Clock3} tone="amber" /><MetricCard title="تأخير موروث" value={`${selectedProject.inheritedDelayDays} يوم`} icon={GitBranch} tone="purple" /><MetricCard title="موعد التسليم المتوقع" value={formatDate(selectedProject.expectedProjectCompletionDate)} icon={CalendarClock} tone="blue" /></div>

              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-3 bg-muted/60"><TabsTrigger value="timeline">المسار الزمني</TabsTrigger><TabsTrigger value="delays">دفتر التأخيرات</TabsTrigger><TabsTrigger value="actions">التحديث والإجراءات</TabsTrigger></TabsList>
                <TabsContent value="timeline" className="mt-5 space-y-5">
                  <div className="rounded-2xl border bg-muted/15 p-4"><div className="mb-5 flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" /><h3 className="font-bold">رحلة المشروع التشغيلية</h3></div><div className="space-y-0">{(detail.movements ?? []).map((movement: any, index: number) => <div key={movement.id} className="relative flex gap-4 pb-6 last:pb-0"><div className="flex flex-col items-center"><div className={`z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 ${movement.status === "completed" ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : movement.status === "on_hold" ? "border-slate-400 bg-slate-400/15 text-slate-300" : "border-primary bg-primary/15 text-primary"}`}>{movement.status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}</div>{index < detail.movements.length - 1 ? <div className="h-full min-h-8 w-px bg-border" /> : null}</div><div className="min-w-0 flex-1 rounded-xl border bg-card p-4"><div className="flex flex-col justify-between gap-3 md:flex-row"><div><p className="font-bold">{movement.stageName}</p><p className="mt-1 text-sm text-muted-foreground">{movement.department} · SLA: {movement.slaDays} أيام</p></div><Badge variant="outline" className="w-fit">{movement.status === "completed" ? "تم التسليم" : movement.status === "on_hold" ? "موقوف" : "مرحلة حالية"}</Badge></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">الدخول الفعلي</p><p className="mt-1 font-medium">{formatDate(movement.enteredAt)}</p></div><div><p className="text-xs text-muted-foreground">الخروج المخطط</p><p className="mt-1 font-medium">{formatDate(movement.plannedCompletionDate)}</p></div><div><p className="text-xs text-muted-foreground">الخروج الفعلي</p><p className="mt-1 font-medium">{formatDate(movement.actualCompletionDate)}</p></div><div><p className="text-xs text-muted-foreground">التأخير الناتج</p><p className={`mt-1 font-bold ${movement.generatedDelayDays > 0 ? "text-rose-400" : "text-emerald-400"}`}>{movement.generatedDelayDays} يوم</p></div></div>{movement.delayOwner || movement.delayReason ? <p className="mt-3 text-xs text-muted-foreground">المسؤول: <span className="text-foreground">{movement.delayOwner?.labelAr ?? "—"}</span> · السبب: <span className="text-foreground">{movement.delayReason?.labelAr ?? "—"}</span></p> : null}</div></div>)}</div></div>
                  <div className="grid gap-3 md:grid-cols-3"><Card className="border-border/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">تأخير الشركة</p><p className="mt-2 text-2xl font-bold text-rose-400">{selectedProject.companyDelayDays} يوم</p></CardContent></Card><Card className="border-border/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">تأخير العميل</p><p className="mt-2 text-2xl font-bold text-amber-300">{selectedProject.clientDelayDays} يوم</p></CardContent></Card><Card className="border-border/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">تأخير خارجي / مورد</p><p className="mt-2 text-2xl font-bold text-purple-300">{selectedProject.externalDelayDays} يوم</p></CardContent></Card></div>
                </TabsContent>
                <TabsContent value="delays" className="mt-5 space-y-4"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{Object.entries(detail.delayBreakdown ?? {}).map(([ownerCode, days]: [string, any]) => <Card key={ownerCode} className="border-border/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{owners.find((owner) => owner.code === ownerCode)?.labelAr ?? ownerCode}</p><p className="mt-2 text-2xl font-bold text-rose-400">{days} يوم</p></CardContent></Card>)}</div><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[800px] text-right text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">التاريخ</th><th className="px-4 py-3">الأيام</th><th className="px-4 py-3">التصنيف</th><th className="px-4 py-3">المسؤول</th><th className="px-4 py-3">السبب</th><th className="px-4 py-3">الملاحظات</th></tr></thead><tbody className="divide-y">{(detail.delayLedger ?? []).map((entry: any) => <tr key={entry.id}><td className="px-4 py-3">{formatDate(entry.delayDate)}</td><td className="px-4 py-3 font-bold text-rose-400">{entry.delayDays}</td><td className="px-4 py-3">{entry.delayCategory === "company" ? "شركة" : entry.delayCategory === "client" ? "عميل" : "خارجي"}</td><td className="px-4 py-3">{entry.owner?.labelAr ?? entry.ownerCode}</td><td className="px-4 py-3">{entry.reason?.labelAr ?? entry.reasonCode}</td><td className="max-w-72 truncate px-4 py-3 text-muted-foreground">{entry.notes ?? "—"}</td></tr>)}</tbody></table></div></TabsContent>
                <TabsContent value="actions" className="mt-5"><div className="grid gap-5 xl:grid-cols-2"><Card className="border-border/70"><CardHeader><CardTitle className="text-base">تحديث الاثنين / الأربعاء</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-1"><Label>الإجراء التالي</Label><Input value={reviewAction} onChange={(event) => setReviewAction(event.target.value)} placeholder="مثال: استلام اعتماد العميل للتصميم" /></div><div className="space-y-1"><Label>تاريخ الإكمال المتوقع</Label><Input type="date" value={reviewExpectedDate} onChange={(event) => setReviewExpectedDate(event.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>يوجد عائق؟</Label><Select value={hasBlocker} onValueChange={setHasBlocker}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">لا</SelectItem><SelectItem value="yes">نعم</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>نوع التحديث</Label><Select defaultValue="status_update" onValueChange={() => undefined}><SelectTrigger><SelectValue placeholder="تحديث حالة" /></SelectTrigger><SelectContent><SelectItem value="status_update">تحديث حالة</SelectItem><SelectItem value="monday_review">مراجعة الاثنين</SelectItem><SelectItem value="wednesday_review">مراجعة الأربعاء</SelectItem></SelectContent></Select></div></div><div className="space-y-1"><Label>ملاحظات التحديث</Label><Textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="الحالة الحالية والعائق إن وجد…" /></div><Button className="w-full" disabled={reviewMutation.isPending} onClick={() => detailId && reviewMutation.mutate({ projectId: detailId, currentStatus: selectedProject.projectStatus, nextAction: reviewAction || undefined, expectedCompletionDate: reviewExpectedDate || undefined, hasBlocker: hasBlocker === "yes", notes: reviewNotes || undefined, updatedBy })}>{reviewMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-2 h-4 w-4" />}حفظ تحديث المشروع</Button></CardContent></Card>
                  <Card className="border-border/70"><CardHeader><CardTitle className="text-base">نقل إلى إدارة / مرحلة تالية</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-1"><Label>المرحلة التالية</Label><Select value={nextStageKey} onValueChange={setNextStageKey}><SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger><SelectContent>{stages.filter((stage) => stage.stageKey !== selectedProject.currentStageKey).map((stage) => <SelectItem key={stage.stageKey} value={stage.stageKey}>{stage.nameAr} · {stage.defaultSlaDays} أيام</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>المسؤول الحالي في المرحلة التالية</Label><Select value={responsibleId} onValueChange={setResponsibleId}><SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger><SelectContent><SelectItem value="all">غير محدد</SelectItem>{engineers.map((engineer) => <SelectItem key={engineer.id} value={String(engineer.id)}>{engineer.name}</SelectItem>)}</SelectContent></Select></div><div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200"><span className="font-bold">تنبيه SLA:</span> إذا تجاوزت المرحلة موعد خروجها المخطط، تصبح بيانات المسؤول والسبب التالية إلزامية.</div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>مسؤول التأخير</Label><Select value={transitionDelayOwner} onValueChange={(value) => { setTransitionDelayOwner(value); setTransitionDelayReason("all"); }}><SelectTrigger><SelectValue placeholder="عند وجود تأخير" /></SelectTrigger><SelectContent><SelectItem value="all">لا يوجد / غير محدد</SelectItem>{owners.map((owner) => <SelectItem key={owner.code} value={owner.code}>{owner.labelAr}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>سبب التأخير</Label><Select value={transitionDelayReason} onValueChange={setTransitionDelayReason}><SelectTrigger><SelectValue placeholder="عند وجود تأخير" /></SelectTrigger><SelectContent><SelectItem value="all">لا يوجد / غير محدد</SelectItem>{reasons.filter((reason) => transitionDelayOwner === "all" || reason.ownerCode === transitionDelayOwner || reason.category === owners.find((owner) => owner.code === transitionDelayOwner)?.category).map((reason) => <SelectItem key={reason.code} value={reason.code}>{reason.labelAr}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-1"><Label>ملاحظات التسليم / التأخير</Label><Textarea value={transitionNotes} onChange={(event) => setTransitionNotes(event.target.value)} placeholder="ما الذي تم تسليمه للإدارة التالية؟" /></div><Button className="w-full" variant="secondary" disabled={!canTransition || transitionMutation.isPending} onClick={() => detailId && transitionMutation.mutate({ projectId: detailId, nextStageKey, responsibleId: responsibleId === "all" ? undefined : Number(responsibleId), notes: transitionNotes || undefined, delayOwnerCode: transitionDelayOwner === "all" ? undefined : transitionDelayOwner, delayReasonCode: transitionDelayReason === "all" ? undefined : transitionDelayReason, delayNotes: transitionDelayNotes || transitionNotes || undefined, updatedBy })}>{transitionMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="ml-2 h-4 w-4" />}توثيق الانتقال</Button></CardContent></Card>
                  <Card className="border-border/70"><CardHeader><CardTitle className="text-base">إضافة تأخير إلى Delay Ledger</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>عدد الأيام</Label><Input type="number" min="1" value={delayDays} onChange={(event) => setDelayDays(event.target.value)} /></div><div className="space-y-1"><Label>مسؤول التأخير</Label><Select value={delayOwner} onValueChange={(value) => { setDelayOwner(value); setDelayReason("all"); }}><SelectTrigger><SelectValue placeholder="اختر المسؤول" /></SelectTrigger><SelectContent>{owners.map((owner) => <SelectItem key={owner.code} value={owner.code}>{owner.labelAr}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-1"><Label>سبب التأخير</Label><Select value={delayReason} onValueChange={setDelayReason}><SelectTrigger><SelectValue placeholder="اختر السبب" /></SelectTrigger><SelectContent>{filteredReasons.map((reason) => <SelectItem key={reason.code} value={reason.code}>{reason.labelAr}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>ملاحظات</Label><Textarea value={delayNotes} onChange={(event) => setDelayNotes(event.target.value)} placeholder="إلزامية عند اختيار سبب آخر" /></div><Button className="w-full" variant="destructive" disabled={!delayDays || delayOwner === "all" || delayReason === "all" || delayMutation.isPending} onClick={() => detailId && delayMutation.mutate({ projectId: detailId, movementId: selectedProject.currentMovement?.id, delayDays: Number(delayDays), ownerCode: delayOwner, reasonCode: delayReason, notes: delayNotes || undefined, createdBy: updatedBy })}>{delayMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <TriangleAlert className="ml-2 h-4 w-4" />}تسجيل التأخير</Button></CardContent></Card>
                  <Card className="border-border/70"><CardHeader><CardTitle className="text-base">{selectedProject.isOnHold ? "استئناف المشروع" : "إيقاف مؤقت للمشروع"}</CardTitle></CardHeader><CardContent className="space-y-3">{!selectedProject.isOnHold ? <><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>مسؤول الإيقاف</Label><Select value={holdOwner} onValueChange={(value) => { setHoldOwner(value); setHoldReason("other"); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{owners.map((owner) => <SelectItem key={owner.code} value={owner.code}>{owner.labelAr}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>موعد الاستئناف المتوقع</Label><Input type="date" value={holdResumeDate} onChange={(event) => setHoldResumeDate(event.target.value)} /></div></div><div className="space-y-1"><Label>سبب الإيقاف</Label><Select value={holdReason} onValueChange={setHoldReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{filteredHoldReasons.map((reason) => <SelectItem key={reason.code} value={reason.code}>{reason.labelAr}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>ملاحظات</Label><Textarea value={holdNotes} onChange={(event) => setHoldNotes(event.target.value)} /></div></> : <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">المشروع موقوف منذ {formatDate(selectedProject.holdStartedAt)}. سيتم تصنيف مدة الإيقاف على المسؤول المحدد عند الاستئناف.</p>}<Button className="w-full" variant={selectedProject.isOnHold ? "default" : "outline"} disabled={holdMutation.isPending} onClick={() => detailId && holdMutation.mutate(selectedProject.isOnHold ? { projectId: detailId, isOnHold: false, updatedBy } : { projectId: detailId, isOnHold: true, holdOwnerCode: holdOwner, holdReasonCode: holdReason, expectedResumeDate: holdResumeDate || undefined, notes: holdNotes || undefined, updatedBy })}>{holdMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CirclePause className="ml-2 h-4 w-4" />}{selectedProject.isOnHold ? "استئناف المشروع" : "تفعيل On Hold"}</Button></CardContent></Card>
                </div></TabsContent>
              </Tabs>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={stageSettingsOpen} onOpenChange={setStageSettingsOpen}>
        <DialogContent dir="rtl" className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader className="text-right"><DialogTitle>إعدادات المراحل وSLA</DialogTitle><DialogDescription>تعديل المدد التخطيطية للمراحل. التغيير يطبق على الحركات الجديدة؛ ولا يعدّل سجل المشاريع التاريخي تلقائياً.</DialogDescription></DialogHeader>
          <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-3 py-3">الترتيب</th><th className="px-3 py-3">المرحلة</th><th className="px-3 py-3">الإدارة</th><th className="px-3 py-3">SLA بالأيام</th><th className="px-3 py-3">اللون</th><th className="px-3 py-3"></th></tr></thead><tbody className="divide-y">{stages.map((stage) => <StageConfigRow key={stage.id} stage={stage} updatedBy={updatedBy} saving={stageConfigMutation.isPending} onSave={(payload) => stageConfigMutation.mutate(payload as any)} />)}</tbody></table></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StageConfigRow({ stage, updatedBy, saving, onSave }: { stage: any; updatedBy: string; saving: boolean; onSave: (input: unknown) => void }) {
  const [nameAr, setNameAr] = useState(stage.nameAr);
  const [department, setDepartment] = useState(stage.department);
  const [sla, setSla] = useState(String(stage.defaultSlaDays));
  const [color, setColor] = useState(stage.color ?? "#3B82F6");
  return <tr><td className="px-3 py-3 text-muted-foreground">{stage.sequence}</td><td className="px-3 py-3"><Input value={nameAr} onChange={(event) => setNameAr(event.target.value)} /></td><td className="px-3 py-3"><Input value={department} onChange={(event) => setDepartment(event.target.value)} /></td><td className="px-3 py-3"><Input type="number" min="0" value={sla} onChange={(event) => setSla(event.target.value)} /></td><td className="px-3 py-3"><div className="flex items-center gap-2"><input aria-label="لون المرحلة" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-9 w-10 cursor-pointer rounded border bg-transparent p-1" /><code className="text-xs text-muted-foreground">{color}</code></div></td><td className="px-3 py-3"><Button size="sm" variant="outline" disabled={saving || !nameAr.trim() || Number(sla) < 0} onClick={() => onSave({ id: stage.id, nameAr, department, defaultSlaDays: Number(sla), color, updatedBy })}>حفظ</Button></td></tr>;
}
