import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Users, TrendingUp, Clock, CheckCircle2, XCircle,
  AlertTriangle, BarChart3, CalendarDays, Plus, Save,
  Phone, Star, ArrowUpRight, ChevronDown, X, Calendar
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ─── Date Helpers ─────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const r = new Date(d); r.setDate(d.getDate() - day); return r;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfLastMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() - 1, 1); }
function endOfLastMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 0); }
function startOfLastWeek(d: Date) { const sw = startOfWeek(d); return addDays(sw, -7); }
function endOfLastWeek(d: Date) { const sw = startOfWeek(d); return addDays(sw, -1); }

// ─── Presets ──────────────────────────────────────────────────────────────────
type PresetKey = "today" | "yesterday" | "last7" | "last14" | "last30" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: "today",     label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "last7",     label: "آخر 7 أيام" },
  { key: "last14",    label: "آخر 14 يوم" },
  { key: "last30",    label: "آخر 30 يوم" },
  { key: "thisWeek",  label: "هذا الأسبوع" },
  { key: "lastWeek",  label: "الأسبوع الماضي" },
  { key: "thisMonth", label: "هذا الشهر" },
  { key: "lastMonth", label: "الشهر الماضي" },
  { key: "custom",    label: "نطاق مخصص" },
];

function computeRange(preset: PresetKey, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case "today":     return { from: toDateStr(now), to: toDateStr(now) };
    case "yesterday": { const y = addDays(now, -1); return { from: toDateStr(y), to: toDateStr(y) }; }
    case "last7":     return { from: toDateStr(addDays(now, -6)), to: toDateStr(now) };
    case "last14":    return { from: toDateStr(addDays(now, -13)), to: toDateStr(now) };
    case "last30":    return { from: toDateStr(addDays(now, -29)), to: toDateStr(now) };
    case "thisWeek":  return { from: toDateStr(startOfWeek(now)), to: toDateStr(now) };
    case "lastWeek":  return { from: toDateStr(startOfLastWeek(now)), to: toDateStr(endOfLastWeek(now)) };
    case "thisMonth": return { from: toDateStr(startOfMonth(now)), to: toDateStr(now) };
    case "lastMonth": return { from: toDateStr(startOfLastMonth(now)), to: toDateStr(endOfLastMonth(now)) };
    case "custom":    return { from: customFrom || toDateStr(addDays(now, -6)), to: customTo || toDateStr(now) };
    default:          return { from: toDateStr(addDays(now, -6)), to: toDateStr(now) };
  }
}

// ─── Advanced Date Filter Component ──────────────────────────────────────────
function AdvancedDateFilter({
  preset, onPresetChange,
  customFrom, onCustomFromChange,
  customTo, onCustomToChange,
  onReset,
}: {
  preset: PresetKey;
  onPresetChange: (p: PresetKey) => void;
  customFrom: string;
  onCustomFromChange: (v: string) => void;
  customTo: string;
  onCustomToChange: (v: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { from, to } = computeRange(preset, customFrom, customTo);
  const selectedLabel = PRESETS.find(p => p.key === preset)?.label ?? "اليوم";

  return (
    <div className="relative">
      {/* Trigger Button */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all"
        >
          <Calendar className="h-4 w-4 text-blue-400" />
          <span>{selectedLabel}</span>
          {preset !== "today" && (
            <span className="text-white/40 text-xs">({from} → {to})</span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {preset !== "last7" && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 hover:text-white transition-all"
          >
            <X className="h-3 w-3" />
            إعادة تعيين
          </button>
        )}
      </div>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 w-80 rounded-xl border border-white/10 bg-slate-900 shadow-2xl p-4 space-y-3">
          <p className="text-white/60 text-xs font-medium">اختر الفترة الزمنية</p>

          {/* Presets Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.filter(p => p.key !== "custom").map(p => (
              <button
                key={p.key}
                onClick={() => { onPresetChange(p.key); if (p.key !== "custom") setOpen(false); }}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  preset === p.key
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Custom Range */}
          <div className="space-y-2">
            <button
              onClick={() => onPresetChange("custom")}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                preset === "custom"
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              نطاق مخصص (From → To)
            </button>

            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">من</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={e => onCustomFromChange(e.target.value)}
                    className="h-8 text-xs bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">إلى</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={e => onCustomToChange(e.target.value)}
                    className="h-8 text-xs bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {preset === "custom" && (
            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
              onClick={() => setOpen(false)}
            >
              تطبيق الفلتر
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DailyInputForm ───────────────────────────────────────────────────────────
function DailyInputForm({ onSuccess }: { onSuccess: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [totalLeads, setTotalLeads] = useState("");
  const [contacted, setContacted] = useState("");
  const [delayed, setDelayed] = useState("");
  const [notContacted, setNotContacted] = useState("");
  const [qualified, setQualified] = useState("");
  const [converted, setConverted] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const { user } = useAuth();

  const upsertMut = trpc.leadDailyStats.upsert.useMutation({
    onSuccess: () => { toast.success("تم حفظ بيانات اليوم بنجاح"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(totalLeads) || 0;
    if (total < 0) { toast.error("الأرقام يجب أن تكون موجبة"); return; }
    upsertMut.mutate({
      date, totalLeads: total,
      contacted: parseInt(contacted) || 0,
      delayed: parseInt(delayed) || 0,
      notContacted: parseInt(notContacted) || 0,
      qualified: parseInt(qualified) || 0,
      converted: parseInt(converted) || 0,
      source: source || undefined,
      notes: notes || undefined,
      enteredBy: user?.name || undefined,
    });
  };

  return (
    <Card className="border-primary/30 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-4 w-4 text-primary" />
          إدخال أرقام اليوم
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">التاريخ</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">مصدر الـ Leads</Label>
              <Input placeholder="Facebook / Instagram / إلخ" value={source} onChange={(e) => setSource(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">إجمالي الـ Leads</Label>
              <Input type="number" min="0" placeholder="0" value={totalLeads} onChange={(e) => setTotalLeads(e.target.value)} className="h-9 text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">تم التواصل</Label>
              <Input type="number" min="0" placeholder="0" value={contacted} onChange={(e) => setContacted(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">تأخير في الرد</Label>
              <Input type="number" min="0" placeholder="0" value={delayed} onChange={(e) => setDelayed(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">لم يتم التواصل</Label>
              <Input type="number" min="0" placeholder="0" value={notContacted} onChange={(e) => setNotContacted(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">مؤهلة (Qualified)</Label>
              <Input type="number" min="0" placeholder="0" value={qualified} onChange={(e) => setQualified(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">تحولت لصفقة</Label>
              <Input type="number" min="0" placeholder="0" value={converted} onChange={(e) => setConverted(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">ملاحظات</Label>
            <Textarea placeholder="أي ملاحظات إضافية..." value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm resize-none" rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={upsertMut.isPending}>
            <Save className="h-4 w-4 ml-2" />
            {upsertMut.isPending ? "جاري الحفظ..." : "حفظ بيانات اليوم"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── SummaryCards ─────────────────────────────────────────────────────────────
function SummaryCards({ from, to }: { from: string; to: string }) {
  const { data: summary } = trpc.leadDailyStats.summary.useQuery({ from, to });
  const cards = [
    { label: "إجمالي الـ Leads",  value: summary?.totalLeads ?? 0,  sub: undefined,                                        icon: <Users className="h-5 w-5" />,       color: "text-blue-400",   bg: "bg-blue-500/10" },
    { label: "تم التواصل",        value: summary?.contacted ?? 0,   sub: summary ? summary.contactRate + "%" : undefined,  icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-400",  bg: "bg-green-500/10" },
    { label: "تأخير في الرد",     value: summary?.delayed ?? 0,     sub: summary ? summary.delayRate + "%" : undefined,    icon: <Clock className="h-5 w-5" />,        color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "لم يتم التواصل",    value: summary?.notContacted ?? 0, sub: undefined,                                       icon: <XCircle className="h-5 w-5" />,      color: "text-red-400",    bg: "bg-red-500/10" },
    { label: "مؤهلة",             value: summary?.qualified ?? 0,   sub: undefined,                                        icon: <Star className="h-5 w-5" />,         color: "text-blue-300",   bg: "bg-blue-500/10" },
    { label: "تحولت لصفقة",       value: summary?.converted ?? 0,   sub: summary ? summary.conversionRate + "%" : undefined, icon: <ArrowUpRight className="h-5 w-5" />, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${c.bg}`}><div className={c.color}>{c.icon}</div></div>
              {c.sub && <Badge variant="outline" className="text-xs">{c.sub}</Badge>}
            </div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── PerformanceAlerts ────────────────────────────────────────────────────────
function PerformanceAlerts({ summary }: { summary?: { delayRate: number; contactRate: number; conversionRate: number } | null }) {
  if (!summary) return null;
  const alerts: Array<{ type: string; msg: string }> = [];
  if (summary.delayRate > 30) alerts.push({ type: "error", msg: `نسبة التأخير مرتفعة: ${summary.delayRate}% — يجب مراجعة سرعة الاستجابة` });
  if (summary.contactRate < 70 && summary.contactRate > 0) alerts.push({ type: "warning", msg: `نسبة التواصل منخفضة: ${summary.contactRate}% — المستهدف 70%+` });
  if (alerts.length === 0) return null;
  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-500">
          <AlertTriangle className="h-4 w-4" />تنبيهات الأداء
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className={`text-xs p-2 rounded-lg ${a.type === "error" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>{a.msg}</div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── DailyLogTable ────────────────────────────────────────────────────────────
function DailyLogTable({ from, to }: { from: string; to: string }) {
  const { data: rows = [] } = trpc.leadDailyStats.list.useQuery({ from, to, limit: 60 });
  if (rows.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          لا توجد بيانات مسجّلة في هذه الفترة
          <p className="text-xs mt-1">استخدم زر إدخال أرقام اليوم لإضافة بيانات</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          سجل الأيام ({rows.length} يوم)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-xs">
                <th className="text-right p-3 font-medium">التاريخ</th>
                <th className="text-center p-3 font-medium">الإجمالي</th>
                <th className="text-center p-3 font-medium">تم التواصل</th>
                <th className="text-center p-3 font-medium">تأخير</th>
                <th className="text-center p-3 font-medium">لم يتم</th>
                <th className="text-center p-3 font-medium">مؤهلة</th>
                <th className="text-center p-3 font-medium">صفقة</th>
                <th className="text-right p-3 font-medium">المصدر</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const contactRate = row.totalLeads > 0 ? Math.round((row.contacted / row.totalLeads) * 100) : 0;
                return (
                  <tr key={row.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-right">{new Date(row.date).toLocaleDateString("ar-EG", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</td>
                    <td className="p-3 text-center"><span className="font-bold text-blue-400">{row.totalLeads}</span></td>
                    <td className="p-3 text-center">
                      <span className="text-green-400 font-medium">{row.contacted}</span>
                      {row.totalLeads > 0 && <span className="text-xs text-muted-foreground mr-1">({contactRate}%)</span>}
                    </td>
                    <td className="p-3 text-center"><span className={row.delayed > 0 ? "text-yellow-400 font-medium" : "text-muted-foreground"}>{row.delayed}</span></td>
                    <td className="p-3 text-center"><span className={row.notContacted > 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>{row.notContacted}</span></td>
                    <td className="p-3 text-center text-blue-300">{row.qualified}</td>
                    <td className="p-3 text-center text-purple-400">{row.converted}</td>
                    <td className="p-3 text-right text-xs text-muted-foreground">{row.source || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main LeadsModule ─────────────────────────────────────────────────────────
export default function LeadsModule() {
  const [preset, setPreset] = useState<PresetKey>("last7");
  const [customFrom, setCustomFrom] = useState(() => toDateStr(new Date(new Date().setDate(new Date().getDate() - 6))));
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()));
  const [showForm, setShowForm] = useState(false);
  const utils = trpc.useUtils();

  const { from, to } = useMemo(
    () => computeRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const { data: summary } = trpc.leadDailyStats.summary.useQuery({ from, to });

  const handleSuccess = () => {
    utils.leadDailyStats.list.invalidate();
    utils.leadDailyStats.summary.invalidate();
    setShowForm(false);
  };

  const handleReset = () => {
    setPreset("last7");
    setCustomFrom(toDateStr(new Date(new Date().setDate(new Date().getDate() - 6))));
    setCustomTo(toDateStr(new Date()));
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />متابعة الـ Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدخال الأرقام اليومية — التفاصيل في CRM</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? "إخفاء النموذج" : "إدخال أرقام اليوم"}
        </Button>
      </div>

      {showForm && <DailyInputForm onSuccess={handleSuccess} />}

      {/* Advanced Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <AdvancedDateFilter
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
          onReset={handleReset}
        />
        {/* Date Range Display */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{from}</span>
          <span>→</span>
          <span>{to}</span>
        </div>
      </div>

      <PerformanceAlerts summary={summary} />
      <SummaryCards from={from} to={to} />
      <DailyLogTable from={from} to={to} />

      <div className="text-xs text-muted-foreground text-center py-2">
        <TrendingUp className="h-3 w-3 inline ml-1" />
        التفاصيل الكاملة لكل Lead متاحة في نظام CRM الخارجي (Sharetech)
      </div>
    </div>
  );
}
