/**
 * Permission Control Panel
 * لوحة التحكم في الصلاحيات - Dynamic Matrix
 * 
 * Tab 1: صلاحيات الوحدات (Module-level: view/add/edit/delete/dataScope)
 * Tab 2: صلاحيات الأقسام (Section-level: all/self/hidden + canEdit)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Shield, Eye, Plus, Edit3, Trash2, Database, Save, RefreshCw,
  CheckCircle2, XCircle, Info, Layers, EyeOff, Users, User
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PermRow {
  id: number;
  role: string;
  module: string;
  canView: number;
  canAdd: number;
  canEdit: number;
  canDelete: number;
  dataScope: "own" | "team" | "all";
}
interface SectionPermRow {
  id: number;
  role: string;
  module: string;
  section: string;
  sectionLabel?: string;
  visibility: 'all' | 'self' | 'hidden';
  canEdit: number;
}
interface ModuleMeta { key: string; label: string }
interface RoleMeta   { key: string; label: string }

// ─── Visibility Badge ─────────────────────────────────────────────────────────
function VisibilityBadge({ v }: { v: 'all' | 'self' | 'hidden' }) {
  if (v === 'all') return (
    <span className="flex items-center gap-1 text-xs text-green-400">
      <Users className="h-3 w-3" /> الجميع
    </span>
  );
  if (v === 'self') return (
    <span className="flex items-center gap-1 text-xs text-yellow-400">
      <User className="h-3 w-3" /> نفسه فقط
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
      <EyeOff className="h-3 w-3" /> مخفي
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PermissionsPanel() {
  const utils = trpc.useUtils();

  // Main tab: modules vs sections
  const [mainTab, setMainTab] = useState<'modules' | 'sections'>('modules');

  // Module permissions state
  const [activeRole, setActiveRole] = useState<string>("manager");
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<PermRow>>>({});
  const [saving, setSaving] = useState(false);

  // Section permissions state
  const [activeSectionRole, setActiveSectionRole] = useState<string>("manager");
  const [pendingSectionChanges, setPendingSectionChanges] = useState<Record<string, Partial<SectionPermRow>>>({});
  const [savingSection, setSavingSection] = useState(false);

  // ── Module Permissions Queries ──────────────────────────────────────────────
  const { data, isLoading, error } = trpc.rolePermissions.getAll.useQuery(undefined, {
    retry: false, staleTime: 0,
  });
  const updateMut = trpc.rolePermissions.update.useMutation({
    onSuccess: () => utils.rolePermissions.getAll.invalidate(),
    onError: (err) => toast.error("فشل التحديث: " + err.message),
  });

  // ── Section Permissions Queries ─────────────────────────────────────────────
  const { data: sectionData, isLoading: sectionLoading } = trpc.sectionPermissions.getAll.useQuery(undefined, {
    retry: false, staleTime: 0,
  });
  const { data: moduleSectionsData } = trpc.sectionPermissions.moduleSections.useQuery();
  const updateSectionMut = trpc.sectionPermissions.update.useMutation({
    onSuccess: () => utils.sectionPermissions.getAll.invalidate(),
    onError: (err) => toast.error("فشل تحديث صلاحية القسم: " + err.message),
  });
  const initDefaultsMut = trpc.sectionPermissions.initDefaults.useMutation({
    onSuccess: (res) => {
      toast.success(`✅ تم تهيئة ${res.count} صلاحية افتراضية`);
      utils.sectionPermissions.getAll.invalidate();
    },
    onError: (err) => toast.error("فشل تهيئة الصلاحيات: " + err.message),
  });

  // ── Module Permissions Logic ────────────────────────────────────────────────
  const permMap = useMemo(() => {
    const map: Record<string, PermRow> = {};
    if (data?.permissions) {
      for (const p of data.permissions) map[`${p.role}::${p.module}`] = p as PermRow;
    }
    return map;
  }, [data]);

  const effectivePermMap = useMemo(() => {
    const merged = { ...permMap };
    for (const [key, changes] of Object.entries(pendingChanges)) {
      if (merged[key]) merged[key] = { ...merged[key], ...changes };
    }
    return merged;
  }, [permMap, pendingChanges]);

  const modules: ModuleMeta[] = (data?.modules as any) ?? [];
  const roles: RoleMeta[]     = (data?.roles as any) ?? [];

  function handleCellUpdate(role: string, module: string, field: keyof PermRow, value: number | string) {
    const key = `${role}::${module}`;
    setPendingChanges(prev => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));
  }

  async function saveAllChanges() {
    if (Object.keys(pendingChanges).length === 0) { toast.info("لا توجد تغييرات للحفظ"); return; }
    setSaving(true);
    let ok = 0, fail = 0;
    for (const [key, changes] of Object.entries(pendingChanges)) {
      const [role, module] = key.split("::");
      const base = permMap[key];
      if (!base) continue;
      try {
        await updateMut.mutateAsync({
          role, module,
          canView:   changes.canView   ?? base.canView,
          canAdd:    changes.canAdd    ?? base.canAdd,
          canEdit:   changes.canEdit   ?? base.canEdit,
          canDelete: changes.canDelete ?? base.canDelete,
          dataScope: (changes.dataScope ?? base.dataScope) as "own" | "team" | "all",
        });
        ok++;
      } catch { fail++; }
    }
    setSaving(false);
    setPendingChanges({});
    if (fail === 0) toast.success(`✅ تم حفظ ${ok} تغيير بنجاح`);
    else toast.warning(`تم حفظ ${ok} وفشل ${fail}`);
    utils.rolePermissions.getAll.invalidate();
  }

  function discardChanges() { setPendingChanges({}); toast.info("تم إلغاء التغييرات"); }

  function grantAllForRole(role: string) {
    const newChanges: Record<string, Partial<PermRow>> = { ...pendingChanges };
    for (const mod of modules) newChanges[`${role}::${mod.key}`] = { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" };
    setPendingChanges(newChanges);
    toast.info(`تم تفعيل كل الصلاحيات (لم يُحفظ بعد)`);
  }

  function revokeAllForRole(role: string) {
    const newChanges: Record<string, Partial<PermRow>> = { ...pendingChanges };
    for (const mod of modules) newChanges[`${role}::${mod.key}`] = { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" };
    setPendingChanges(newChanges);
    toast.info(`تم إلغاء كل الصلاحيات (لم يُحفظ بعد)`);
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // ── Section Permissions Logic ───────────────────────────────────────────────
  const sectionPermMap = useMemo(() => {
    const map: Record<string, SectionPermRow> = {};
    if (sectionData?.permissions) {
      for (const p of sectionData.permissions) {
        map[`${p.role}::${p.module}::${p.section}`] = p as SectionPermRow;
      }
    }
    return map;
  }, [sectionData]);

  const effectiveSectionPermMap = useMemo(() => {
    const merged = { ...sectionPermMap };
    for (const [key, changes] of Object.entries(pendingSectionChanges)) {
      if (merged[key]) merged[key] = { ...merged[key], ...changes };
    }
    return merged;
  }, [sectionPermMap, pendingSectionChanges]);

  // Group sections by module
  const sectionsByModule: Record<string, Array<{ key: string; label: string }>> = useMemo(() => {
    return (moduleSectionsData as any) ?? {};
  }, [moduleSectionsData]);

  function handleSectionUpdate(role: string, module: string, section: string, field: 'visibility' | 'canEdit', value: string | number) {
    const key = `${role}::${module}::${section}`;
    setPendingSectionChanges(prev => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));
  }

  async function saveAllSectionChanges() {
    if (Object.keys(pendingSectionChanges).length === 0) { toast.info("لا توجد تغييرات للحفظ"); return; }
    setSavingSection(true);
    let ok = 0, fail = 0;
    for (const [key, changes] of Object.entries(pendingSectionChanges)) {
      const [role, module, section] = key.split("::");
      const base = sectionPermMap[key];
      if (!base) continue;
      try {
        await updateSectionMut.mutateAsync({
          role, module, section,
          visibility: (changes.visibility ?? base.visibility) as 'all' | 'self' | 'hidden',
          canEdit: changes.canEdit ?? base.canEdit,
        });
        ok++;
      } catch { fail++; }
    }
    setSavingSection(false);
    setPendingSectionChanges({});
    if (fail === 0) toast.success(`✅ تم حفظ ${ok} تغيير بنجاح`);
    else toast.warning(`تم حفظ ${ok} وفشل ${fail}`);
    utils.sectionPermissions.getAll.invalidate();
  }

  function discardSectionChanges() { setPendingSectionChanges({}); toast.info("تم إلغاء التغييرات"); }

  const hasPendingSectionChanges = Object.keys(pendingSectionChanges).length > 0;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive gap-2">
        <XCircle className="h-5 w-5" />
        <span>خطأ في تحميل الصلاحيات: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            لوحة التحكم في الصلاحيات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            تحكم كامل في صلاحيات كل Role — على مستوى الوحدة والقسم الداخلي
          </p>
        </div>
        {/* Save / Discard — conditional on active tab */}
        <div className="flex items-center gap-2">
          {mainTab === 'modules' && hasPendingChanges && (
            <>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
                {Object.keys(pendingChanges).length} تغيير غير محفوظ
              </Badge>
              <Button variant="outline" size="sm" onClick={discardChanges} disabled={saving}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> إلغاء
              </Button>
              <Button size="sm" onClick={saveAllChanges} disabled={saving} className="gap-1">
                <Save className="h-3.5 w-3.5" />
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </>
          )}
          {mainTab === 'sections' && hasPendingSectionChanges && (
            <>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
                {Object.keys(pendingSectionChanges).length} تغيير غير محفوظ
              </Badge>
              <Button variant="outline" size="sm" onClick={discardSectionChanges} disabled={savingSection}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> إلغاء
              </Button>
              <Button size="sm" onClick={saveAllSectionChanges} disabled={savingSection} className="gap-1">
                <Save className="h-3.5 w-3.5" />
                {savingSection ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs: Modules vs Sections */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'modules' | 'sections')}>
        <TabsList className="w-full max-w-sm">
          <TabsTrigger value="modules" className="flex-1 gap-2">
            <Database className="h-4 w-4" />
            صلاحيات الوحدات
          </TabsTrigger>
          <TabsTrigger value="sections" className="flex-1 gap-2">
            <Layers className="h-4 w-4" />
            صلاحيات الأقسام
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Module Permissions ═══════════════════════════════════════ */}
        <TabsContent value="modules" className="mt-4 space-y-4">
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-2 text-sm text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>صلاحيات الوحدات:</strong> تحكم في إمكانية الوصول لكل وحدة (عرض / إضافة / تعديل / حذف) ونطاق البيانات.
                  اضغط <strong>حفظ التغييرات</strong> لتطبيق التعديلات.
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>جاري تحميل الصلاحيات...</span>
            </div>
          ) : (
            <Tabs value={activeRole} onValueChange={setActiveRole}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                {roles.map(role => {
                  const roleChanges = Object.keys(pendingChanges).filter(k => k.startsWith(`${role.key}::`)).length;
                  return (
                    <TabsTrigger key={role.key} value={role.key} className="gap-1.5">
                      {role.label}
                      {roleChanges > 0 && (
                        <Badge className="h-4 text-[10px] px-1 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                          {roleChanges}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {roles.map(role => (
                <TabsContent key={role.key} value={role.key}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{role.label}</CardTitle>
                          <CardDescription>تحديد صلاحيات كل وحدة لهذا الـ Role</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm"
                            className="text-green-400 border-green-400/30 hover:bg-green-400/10 text-xs"
                            onClick={() => grantAllForRole(role.key)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> تفعيل الكل
                          </Button>
                          <Button variant="outline" size="sm"
                            className="text-red-400 border-red-400/30 hover:bg-red-400/10 text-xs"
                            onClick={() => revokeAllForRole(role.key)}>
                            <XCircle className="h-3 w-3 mr-1" /> إلغاء الكل
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-border/40">
                              <th className="text-right py-2 px-3 font-semibold text-muted-foreground w-40">الوحدة</th>
                              <th className="text-center py-2 px-2 font-semibold text-blue-400 w-10">
                                <div className="flex flex-col items-center gap-0.5"><Eye className="h-3.5 w-3.5" /><span className="text-[10px]">عرض</span></div>
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-green-400 w-10">
                                <div className="flex flex-col items-center gap-0.5"><Plus className="h-3.5 w-3.5" /><span className="text-[10px]">إضافة</span></div>
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-yellow-400 w-10">
                                <div className="flex flex-col items-center gap-0.5"><Edit3 className="h-3.5 w-3.5" /><span className="text-[10px]">تعديل</span></div>
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-red-400 w-10">
                                <div className="flex flex-col items-center gap-0.5"><Trash2 className="h-3.5 w-3.5" /><span className="text-[10px]">حذف</span></div>
                              </th>
                              <th className="text-center py-2 px-3 font-semibold text-muted-foreground w-36">
                                <div className="flex flex-col items-center gap-0.5"><Database className="h-3.5 w-3.5" /><span className="text-[10px]">نطاق البيانات</span></div>
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-muted-foreground w-20">الحالة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modules.map((mod, idx) => {
                              const key = `${role.key}::${mod.key}`;
                              const perm = effectivePermMap[key];
                              const isPending = !!pendingChanges[key];
                              const isHidden = perm?.canView === 0;
                              return (
                                <tr key={mod.key}
                                  className={`border-b border-border/20 transition-colors ${idx % 2 === 0 ? "bg-muted/5" : ""} ${isPending ? "bg-yellow-500/5 border-yellow-500/20" : ""}`}>
                                  <td className="py-2 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium ${isHidden ? "text-muted-foreground/50" : "text-foreground"}`}>{mod.label}</span>
                                      {isPending && <Badge className="h-3.5 text-[9px] px-1 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">معدّل</Badge>}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <Switch checked={perm?.canView === 1}
                                      onCheckedChange={(v) => handleCellUpdate(role.key, mod.key, "canView", v ? 1 : 0)}
                                      className="scale-75" />
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <Switch checked={perm?.canAdd === 1} disabled={perm?.canView === 0}
                                      onCheckedChange={(v) => handleCellUpdate(role.key, mod.key, "canAdd", v ? 1 : 0)}
                                      className="scale-75" />
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <Switch checked={perm?.canEdit === 1} disabled={perm?.canView === 0}
                                      onCheckedChange={(v) => handleCellUpdate(role.key, mod.key, "canEdit", v ? 1 : 0)}
                                      className="scale-75" />
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <Switch checked={perm?.canDelete === 1} disabled={perm?.canView === 0}
                                      onCheckedChange={(v) => handleCellUpdate(role.key, mod.key, "canDelete", v ? 1 : 0)}
                                      className="scale-75" />
                                  </td>
                                  <td className="py-2 px-3">
                                    <Select value={perm?.dataScope ?? "own"}
                                      onValueChange={(v) => handleCellUpdate(role.key, mod.key, "dataScope", v)}
                                      disabled={perm?.canView === 0}>
                                      <SelectTrigger className="h-7 text-xs border-border/40 bg-muted/20"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="own">بياناته فقط</SelectItem>
                                        <SelectItem value="team">بيانات الفريق</SelectItem>
                                        <SelectItem value="all">كل البيانات</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    {perm?.canView === 1
                                      ? <Badge className="text-[10px] px-1.5 bg-green-500/10 text-green-400 border-green-400/20">مفعّل</Badge>
                                      : <Badge className="text-[10px] px-1.5 bg-muted/20 text-muted-foreground/50 border-border/20">مخفي</Badge>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/20 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-400" />
                          {modules.filter(m => effectivePermMap[`${role.key}::${m.key}`]?.canView === 1).length} وحدة مفعّلة
                        </span>
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-muted-foreground/40" />
                          {modules.filter(m => !effectivePermMap[`${role.key}::${m.key}`] || effectivePermMap[`${role.key}::${m.key}`]?.canView === 0).length} وحدة مخفية
                        </span>
                        {hasPendingChanges && (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Save className="h-3 w-3" />
                            يوجد تغييرات غير محفوظة
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </TabsContent>

        {/* ═══ Tab 2: Section Permissions ══════════════════════════════════════ */}
        <TabsContent value="sections" className="mt-4 space-y-4">
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-2 text-sm text-purple-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>صلاحيات الأقسام:</strong> تحكم دقيق في كل قسم داخل الوحدة.
                  <br />
                  <span className="text-green-400 font-medium">الجميع</span> = يرى بيانات الفريق كله ·
                  <span className="text-yellow-400 font-medium"> نفسه فقط</span> = يرى بياناته الشخصية فقط ·
                  <span className="text-muted-foreground font-medium"> مخفي</span> = لا يظهر له هذا القسم
                </div>
              </div>
            </CardContent>
          </Card>

          {sectionLoading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>جاري تحميل صلاحيات الأقسام...</span>
            </div>
          ) : (
            <Tabs value={activeSectionRole} onValueChange={setActiveSectionRole}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                {roles.map(role => {
                  const roleChanges = Object.keys(pendingSectionChanges).filter(k => k.startsWith(`${role.key}::`)).length;
                  return (
                    <TabsTrigger key={role.key} value={role.key} className="gap-1.5">
                      {role.label}
                      {roleChanges > 0 && (
                        <Badge className="h-4 text-[10px] px-1 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                          {roleChanges}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {roles.map(role => (
                <TabsContent key={role.key} value={role.key} className="space-y-4">
                  {Object.entries(sectionsByModule).map(([moduleKey, sections]) => {
                    const moduleLabel = modules.find(m => m.key === moduleKey)?.label ?? moduleKey;
                    return (
                      <Card key={moduleKey}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            {moduleLabel}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b border-border/40">
                                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">القسم</th>
                                  <th className="text-center py-2 px-3 font-semibold text-muted-foreground w-48">مستوى الرؤية</th>
                                  <th className="text-center py-2 px-3 font-semibold text-yellow-400 w-24">
                                    <div className="flex flex-col items-center gap-0.5"><Edit3 className="h-3.5 w-3.5" /><span className="text-[10px]">تعديل</span></div>
                                  </th>
                                  <th className="text-center py-2 px-2 font-semibold text-muted-foreground w-24">الحالة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(sections as Array<{key: string; label: string}>).map((sec, idx) => {
                                  const key = `${role.key}::${moduleKey}::${sec.key}`;
                                  const perm = effectiveSectionPermMap[key];
                                  const isPending = !!pendingSectionChanges[key];
                                  const visibility = perm?.visibility ?? 'all';
                                  return (
                                    <tr key={sec.key}
                                      className={`border-b border-border/20 transition-colors ${idx % 2 === 0 ? "bg-muted/5" : ""} ${isPending ? "bg-yellow-500/5 border-yellow-500/20" : ""}`}>
                                      <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-2">
                                          <span className={`font-medium ${visibility === 'hidden' ? "text-muted-foreground/50" : "text-foreground"}`}>
                                            {sec.label}
                                          </span>
                                          {isPending && <Badge className="h-3.5 text-[9px] px-1 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">معدّل</Badge>}
                                        </div>
                                      </td>
                                      <td className="py-2 px-3">
                                        <Select
                                          value={visibility}
                                          onValueChange={(v) => handleSectionUpdate(role.key, moduleKey, sec.key, 'visibility', v)}>
                                          <SelectTrigger className="h-7 text-xs border-border/40 bg-muted/20">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="all">
                                              <span className="flex items-center gap-1.5">
                                                <Users className="h-3 w-3 text-green-400" /> الجميع
                                              </span>
                                            </SelectItem>
                                            <SelectItem value="self">
                                              <span className="flex items-center gap-1.5">
                                                <User className="h-3 w-3 text-yellow-400" /> نفسه فقط
                                              </span>
                                            </SelectItem>
                                            <SelectItem value="hidden">
                                              <span className="flex items-center gap-1.5">
                                                <EyeOff className="h-3 w-3 text-muted-foreground" /> مخفي
                                              </span>
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <Switch
                                          checked={perm?.canEdit === 1}
                                          disabled={visibility === 'hidden'}
                                          onCheckedChange={(v) => handleSectionUpdate(role.key, moduleKey, sec.key, 'canEdit', v ? 1 : 0)}
                                          className="scale-75" />
                                      </td>
                                      <td className="py-2 px-2 text-center">
                                        <VisibilityBadge v={visibility} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {Object.keys(sectionsByModule).length === 0 && (
                    <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
                      <Layers className="h-5 w-5" />
                      <span>لا توجد أقسام محددة بعد</span>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
